-- Storet Phase 11.5P-1: Verified listing addresses for map-ready Explore.
-- Run this in Supabase SQL Editor before testing the updated Create Listing page.

alter table public.listings
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists country text default 'US',
  add column if not exists formatted_address text,
  add column if not exists display_location text,
  add column if not exists address_verified boolean not null default false,
  add column if not exists address_place_id text,
  add column if not exists address_accuracy text;

update public.listings
set display_location = coalesce(display_location, location),
    country = coalesce(country, 'US'),
    address_verified = coalesce(address_verified, false)
where display_location is null
   or country is null
   or address_verified is null;

create index if not exists listings_latitude_longitude_idx
  on public.listings (latitude, longitude)
  where latitude is not null and longitude is not null;

create index if not exists listings_display_location_idx
  on public.listings (display_location);
