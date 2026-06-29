-- Storet final payout safety guard
-- Blocks any listing from being inserted or updated to active unless the host's
-- Stripe Connect payout setup is ready.
--
-- This is a database-level backstop for the existing React UI + Edge Function checks.
-- Run this in Supabase SQL Editor after the payout status columns have been added.

create or replace function public.enforce_payout_ready_before_active_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  host_is_payout_ready boolean := false;
begin
  if new.status::text = 'active' then
    select coalesce(
      stripe_connect_account_id is not null
        and stripe_connect_onboarding_complete is true
        and stripe_connect_charges_enabled is true
        and stripe_connect_payouts_enabled is true
        and payout_setup_status = 'ready',
      false
    )
    into host_is_payout_ready
    from public.profiles
    where id = new.host_id;

    if not coalesce(host_is_payout_ready, false) then
      raise exception 'Set up payouts before activating this listing.'
        using errcode = 'P0001',
              detail = 'Storet listings can only be active after Stripe Connect payout setup is complete.',
              hint = 'Complete Stripe Express onboarding, refresh payout status, then activate the draft listing.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_payout_ready_before_active_listing on public.listings;

create trigger enforce_payout_ready_before_active_listing
before insert or update of status, host_id
on public.listings
for each row
execute function public.enforce_payout_ready_before_active_listing();
