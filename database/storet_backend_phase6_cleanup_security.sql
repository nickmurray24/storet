-- Storet Backend Phase 6
-- Cleanup and security hardening after moving core app activity to Supabase.
-- Run this in Supabase SQL Editor after Phase 5 is working.

begin;

-- -----------------------------------------------------------------------------
-- 1) Remove the reverse booking -> payment relationship.
--
-- payment_records.booking_request_id is the single source of truth. Keeping both
-- payment_records.booking_request_id and booking_requests.payment_record_id gives
-- PostgREST/Supabase two possible relationship paths and causes ambiguous embeds.
-- -----------------------------------------------------------------------------
alter table public.booking_requests
  drop constraint if exists booking_requests_payment_record_id_fkey;

alter table public.booking_requests
  drop column if exists payment_record_id;

-- Helpful lookup indexes for app queries and future dashboard metrics.
create index if not exists payment_records_booking_request_idx
  on public.payment_records(booking_request_id);

create index if not exists host_messages_listing_idx
  on public.host_messages(listing_id, created_at desc);

create index if not exists booking_requests_status_idx
  on public.booking_requests(status, created_at desc);

-- -----------------------------------------------------------------------------
-- 2) Immutable relationship guards.
--
-- After a booking or payment row exists, the app should only update lifecycle/status
-- fields. These triggers prevent accidental or malicious reassignment of core row
-- ownership fields from the browser client.
-- -----------------------------------------------------------------------------
create or replace function public.prevent_booking_identity_changes()
returns trigger
language plpgsql
as $$
begin
  if new.listing_id is distinct from old.listing_id
    or new.host_id is distinct from old.host_id
    or new.renter_id is distinct from old.renter_id then
    raise exception 'Booking listing, host, and renter cannot be changed after creation.';
  end if;

  return new;
end;
$$;

drop trigger if exists booking_requests_prevent_identity_changes on public.booking_requests;
create trigger booking_requests_prevent_identity_changes
before update on public.booking_requests
for each row execute function public.prevent_booking_identity_changes();

create or replace function public.prevent_payment_identity_changes()
returns trigger
language plpgsql
as $$
begin
  if new.booking_request_id is distinct from old.booking_request_id
    or new.listing_id is distinct from old.listing_id
    or new.host_id is distinct from old.host_id
    or new.renter_id is distinct from old.renter_id then
    raise exception 'Payment booking, listing, host, and renter cannot be changed after creation.';
  end if;

  return new;
end;
$$;

drop trigger if exists payment_records_prevent_identity_changes on public.payment_records;
create trigger payment_records_prevent_identity_changes
before update on public.payment_records
for each row execute function public.prevent_payment_identity_changes();

-- -----------------------------------------------------------------------------
-- 3) Validation helpers used by policies and triggers.
-- -----------------------------------------------------------------------------
create or replace function public.is_active_listing_for_booking(
  p_listing_id uuid,
  p_host_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.listings l
    where l.id = p_listing_id
      and l.host_id = p_host_id
      and l.status = 'active'
  );
$$;

create or replace function public.is_payment_for_booking(
  p_booking_request_id uuid,
  p_listing_id uuid,
  p_host_id uuid,
  p_renter_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.booking_requests br
    where br.id = p_booking_request_id
      and br.listing_id = p_listing_id
      and br.host_id = p_host_id
      and br.renter_id = p_renter_id
  );
$$;

create or replace function public.validate_payment_matches_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_payment_for_booking(
    new.booking_request_id,
    new.listing_id,
    new.host_id,
    new.renter_id
  ) then
    raise exception 'Payment record must match its booking request.';
  end if;

  return new;
end;
$$;

drop trigger if exists payment_records_validate_booking_match on public.payment_records;
create trigger payment_records_validate_booking_match
before insert or update on public.payment_records
for each row execute function public.validate_payment_matches_booking();

-- -----------------------------------------------------------------------------
-- 4) Tighten app-facing RLS policies.
-- -----------------------------------------------------------------------------

drop policy if exists "booking_requests_insert_renter" on public.booking_requests;
create policy "booking_requests_insert_renter" on public.booking_requests
for insert to authenticated
with check (
  auth.uid() = renter_id
  and public.is_active_listing_for_booking(listing_id, host_id)
);

-- Keep host/renter lifecycle updates available to the current app, but rely on
-- the immutable-field trigger above to prevent reassignment of ownership fields.
drop policy if exists "booking_requests_update_party" on public.booking_requests;
create policy "booking_requests_update_party" on public.booking_requests
for update to authenticated
using (auth.uid() = renter_id or auth.uid() = host_id)
with check (auth.uid() = renter_id or auth.uid() = host_id);

drop policy if exists "payment_records_insert_renter_mock" on public.payment_records;
create policy "payment_records_insert_renter_mock" on public.payment_records
for insert to authenticated
with check (
  auth.uid() = renter_id
  and public.is_payment_for_booking(
    booking_request_id,
    listing_id,
    host_id,
    renter_id
  )
);

commit;
