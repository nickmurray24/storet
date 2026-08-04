-- Storet booking/listing availability sync
-- Run this file in Supabase SQL Editor before testing the matching React patch.
--
-- Behavior added by this migration:
--   * Approved, Confirmed, and Active bookings hide the listing from Explore.
--   * Completed bookings keep the listing hidden until the host chooses whether
--     to return it to Explore or pause it.
--   * Cancelled/reverted bookings restore the listing only when no booking is
--     still blocking it and no completed-rental decision is waiting.

begin;

alter table public.listings
  add column if not exists post_booking_action_required boolean not null default false;

create index if not exists listings_explore_availability_idx
  on public.listings(status, availability_status, created_at desc);

-- New booking requests should only be accepted while the listing is publicly
-- available (or intentionally using waitlist mode).
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
      and l.availability_status in ('available', 'waitlist')
      and l.post_booking_action_required is false
  );
$$;

-- Keep listing visibility synchronized with booking lifecycle changes. This
-- runs as a definer because the renter/host may update a booking row while only
-- the listing owner is permitted to update the listing directly through RLS.
create or replace function public.sync_listing_availability_from_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_row public.listings%rowtype;
  has_blocking_booking boolean := false;
  entered_completed boolean := false;
begin
  select *
  into listing_row
  from public.listings
  where id = new.listing_id
  for update;

  if not found then
    return new;
  end if;

  select exists (
    select 1
    from public.booking_requests br
    where br.listing_id = new.listing_id
      and br.status in ('Approved', 'Confirmed', 'Active')
  )
  into has_blocking_booking;

  if new.status = 'Completed' then
    if tg_op = 'INSERT' then
      entered_completed := true;
    else
      entered_completed := old.status is distinct from new.status;
    end if;
  end if;

  if has_blocking_booking then
    update public.listings
    set
      availability_status = 'unavailable',
      post_booking_action_required =
        coalesce(post_booking_action_required, false) or entered_completed
    where id = new.listing_id;
  elsif coalesce(listing_row.post_booking_action_required, false) or entered_completed then
    update public.listings
    set
      availability_status = 'unavailable',
      post_booking_action_required = true
    where id = new.listing_id;
  elsif listing_row.status = 'active' then
    update public.listings
    set
      availability_status = case
        when listing_row.booking_mode = 'waitlist' then 'waitlist'::public.storet_availability_status
        else 'available'::public.storet_availability_status
      end,
      post_booking_action_required = false
    where id = new.listing_id;
  else
    update public.listings
    set
      availability_status = 'unavailable',
      post_booking_action_required = false
    where id = new.listing_id;
  end if;

  return new;
end;
$$;

drop trigger if exists booking_requests_sync_listing_availability
  on public.booking_requests;

create trigger booking_requests_sync_listing_availability
after insert or update of status on public.booking_requests
for each row execute function public.sync_listing_availability_from_booking();

-- Prevent a paused listing from being returned to Explore while it still has a
-- blocking booking or a completed-rental decision waiting.
create or replace function public.enforce_listing_booking_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_blocking_booking boolean := false;
begin
  select exists (
    select 1
    from public.booking_requests br
    where br.listing_id = new.id
      and br.status in ('Approved', 'Confirmed', 'Active')
  )
  into has_blocking_booking;

  if new.status <> 'active' then
    new.availability_status := 'unavailable';
  elsif has_blocking_booking or coalesce(new.post_booking_action_required, false) then
    new.availability_status := 'unavailable';
  end if;

  return new;
end;
$$;

drop trigger if exists listings_enforce_booking_availability
  on public.listings;

create trigger listings_enforce_booking_availability
before insert or update of status, availability_status, post_booking_action_required
on public.listings
for each row execute function public.enforce_listing_booking_availability();

-- Hide unavailable active listings from anonymous/general renter reads. Hosts
-- still retain the existing owner-read policy for their own listings.
drop policy if exists "listings_public_read_active" on public.listings;
create policy "listings_public_read_active" on public.listings
for select to anon, authenticated
using (
  status = 'active'
  and availability_status in ('available', 'waitlist')
  and post_booking_action_required is false
);

-- Bring any currently approved/confirmed/active bookings into the new state.
update public.listings l
set availability_status = 'unavailable'
where exists (
  select 1
  from public.booking_requests br
  where br.listing_id = l.id
    and br.status in ('Approved', 'Confirmed', 'Active')
);

commit;
