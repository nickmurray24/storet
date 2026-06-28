-- Storet host payout setup status + draft listing support
-- Run this in the Supabase SQL Editor before testing the payout-status UI.

-- 1) Store Stripe Connect payout status on the host profile.
alter table public.profiles
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_details_submitted boolean not null default false,
  add column if not exists stripe_connect_charges_enabled boolean not null default false,
  add column if not exists stripe_connect_payouts_enabled boolean not null default false,
  add column if not exists stripe_connect_onboarding_complete boolean not null default false,
  add column if not exists payout_setup_status text not null default 'not_started',
  add column if not exists payout_setup_completed_at timestamptz,
  add column if not exists payout_setup_updated_at timestamptz;

do $$
begin
  alter table public.profiles
    add constraint profiles_payout_setup_status_check
    check (payout_setup_status in ('not_started', 'in_progress', 'restricted', 'ready'));
exception
  when duplicate_object then null;
end $$;

create index if not exists profiles_payout_setup_status_idx
  on public.profiles (payout_setup_status);

-- 2) Allow host listings to be saved as drafts until payout setup is ready.
do $$
declare
  status_constraint_name text;
begin
  select conname
  into status_constraint_name
  from pg_constraint
  where conrelid = 'public.listings'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%'
    and pg_get_constraintdef(oid) ilike '%active%'
    and pg_get_constraintdef(oid) ilike '%paused%'
  limit 1;

  if status_constraint_name is not null then
    execute format('alter table public.listings drop constraint %I', status_constraint_name);
  end if;
end $$;

do $$
begin
  alter table public.listings
    add constraint listings_status_check
    check (status in ('draft', 'active', 'paused', 'archived'));
exception
  when duplicate_object then null;
end $$;

alter table public.listings
  alter column status set default 'draft';

create index if not exists listings_host_status_idx
  on public.listings (host_id, status);
