-- Run in Supabase SQL Editor before testing listing editing.
-- Blocks listing content changes while any rental is Approved, Confirmed or Active.
-- Operational status/availability updates, reviews and completion remain available.
begin;

create or replace function public.storet_guard_listing_content_edits()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  editable_keys text[] := array[
    'title', 'location', 'address_line1', 'address_line2', 'city', 'state', 'postal_code',
    'country', 'formatted_address', 'display_location', 'address_verified', 'address_place_id',
    'address_accuracy', 'latitude', 'longitude', 'daily_rate', 'monthly_rate', 'yearly_rate',
    'sqft', 'storage_type', 'listing_type', 'access', 'booking_mode', 'description', 'tags',
    'amenities', 'images'
  ];
  old_content jsonb;
  new_content jsonb;
begin
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into old_content
    from jsonb_each(to_jsonb(old)) where key = any(editable_keys);
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into new_content
    from jsonb_each(to_jsonb(new)) where key = any(editable_keys);
  if new_content is not distinct from old_content then
    return new;
  end if;
  -- UPDATE already owns the listing row lock. The booking trigger below takes
  -- the same lock before approving/confirming/activating a reservation.
  if exists (
    select 1 from public.booking_requests b
    where b.listing_id = old.id and b.status::text in ('Approved', 'Confirmed', 'Active')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'LISTING_EDIT_LOCKED: This listing cannot be edited while a booking is Approved, Confirmed, or Active.';
  end if;
  return new;
end;
$$;

create or replace function public.storet_serialize_booking_and_listing_edits()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Lock both listing rows in ID order if a booking's listing changes.
  -- Pending and Waitlisted bookings serialize with edits but do not block them.
  if tg_op = 'UPDATE' then
    perform l.id from public.listings l
      where l.id = new.listing_id or l.id = old.listing_id
      order by l.id for update;
  else
    perform l.id from public.listings l where l.id = new.listing_id for update;
  end if;
  return new;
end;
$$;

drop trigger if exists storet_guard_listing_content_edits on public.listings;
create trigger storet_guard_listing_content_edits
before update on public.listings
for each row execute function public.storet_guard_listing_content_edits();

drop trigger if exists aa_storet_booking_edit_serialization on public.booking_requests;
create trigger aa_storet_booking_edit_serialization
before insert or update on public.booking_requests
for each row execute function public.storet_serialize_booking_and_listing_edits();

revoke all on function public.storet_guard_listing_content_edits() from public;
revoke all on function public.storet_serialize_booking_and_listing_edits() from public;

commit;
