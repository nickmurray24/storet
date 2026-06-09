-- Storet Backend Phase 1: Supabase schema + baseline RLS
-- Run this in the Supabase SQL Editor after creating your project.

create extension if not exists "pgcrypto";

-- Enum helpers. PostgreSQL enum creation is wrapped so this file can be rerun safely.
do $$ begin
  create type public.storet_user_role as enum ('Renter', 'Host', 'Both');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.storet_listing_status as enum ('active', 'paused', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.storet_listing_type as enum ('Private host', 'Commercial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.storet_booking_mode as enum ('instant', 'request', 'waitlist');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.storet_availability_status as enum ('available', 'waitlist', 'unavailable');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.storet_pricing_period as enum ('daily', 'monthly', 'yearly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.storet_booking_status as enum (
    'Pending', 'Approved', 'Waitlisted', 'Declined', 'Confirmed', 'Active', 'Completed', 'Cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.storet_payment_status as enum ('Pending', 'Paid', 'Refunded', 'Failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.storet_host_message_status as enum ('Unread', 'Read', 'Archived');
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null unique,
  role public.storet_user_role not null default 'Renter',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  location text not null,
  latitude double precision,
  longitude double precision,
  distance_label text,
  daily_rate numeric(10, 2),
  monthly_rate numeric(10, 2),
  yearly_rate numeric(10, 2),
  sqft integer not null check (sqft > 0),
  storage_type text not null,
  listing_type public.storet_listing_type not null default 'Private host',
  access text not null default 'By appointment',
  booking_mode public.storet_booking_mode not null default 'request',
  availability_status public.storet_availability_status not null default 'available',
  status public.storet_listing_status not null default 'active',
  host_display_name text not null default '',
  description text not null,
  tags text[] not null default '{}',
  amenities text[] not null default '{}',
  images text[] not null default '{}',
  average_rating numeric(3, 2) not null default 4.80 check (average_rating >= 0 and average_rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_at_least_one_rate check (
    coalesce(daily_rate, 0) > 0 or coalesce(monthly_rate, 0) > 0 or coalesce(yearly_rate, 0) > 0
  ),
  constraint listings_positive_rates check (
    (daily_rate is null or daily_rate > 0) and
    (monthly_rate is null or monthly_rate > 0) and
    (yearly_rate is null or yearly_rate > 0)
  )
);

create table if not exists public.saved_listings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  renter_id uuid not null references public.profiles(id) on delete cascade,
  listing_title text not null,
  listing_location text not null default '',
  listing_price numeric(10, 2) not null default 0,
  rate_period public.storet_pricing_period not null default 'monthly',
  rate_label text not null default 'Monthly',
  rate_display text not null default '$0/mo',
  pricing_snapshot jsonb not null default '{"daily": null, "monthly": null, "yearly": null}'::jsonb,
  renter_display_name text not null default '',
  host_display_name text not null default '',
  move_in_date date,
  move_out_date date,
  duration text not null default 'Month-to-month',
  notes text not null default '',
  status public.storet_booking_status not null default 'Pending',
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  waitlisted_at timestamptz,
  declined_at timestamptz,
  confirmed_at timestamptz,
  activated_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_date_order check (move_out_date is null or move_in_date is null or move_out_date >= move_in_date)
);

create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null unique references public.booking_requests(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  renter_id uuid not null references public.profiles(id) on delete cascade,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  display_card_brand text,
  display_last4 text,
  storage_charge_cents integer not null default 0 check (storage_charge_cents >= 0),
  service_fee_cents integer not null default 0 check (service_fee_cents >= 0),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'usd',
  rate_period public.storet_pricing_period not null default 'monthly',
  rate_label text not null default 'Monthly',
  rate_display text not null default '$0/mo',
  status public.storet_payment_status not null default 'Pending',
  receipt_number text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.booking_requests
  add column if not exists payment_record_id uuid references public.payment_records(id) on delete set null;

create table if not exists public.host_messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  listing_title text not null,
  listing_location text not null default '',
  host_display_name text not null default '',
  sender_display_name text not null default '',
  subject text not null default 'Listing question',
  message text not null,
  status public.storet_host_message_status not null default 'Unread',
  submitted_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  booking_request_id uuid references public.booking_requests(id) on delete set null,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_status_created_idx on public.listings(status, created_at desc);
create index if not exists listings_host_idx on public.listings(host_id);
create index if not exists listings_location_idx on public.listings(location);
create index if not exists saved_listings_user_idx on public.saved_listings(user_id, created_at desc);
create index if not exists booking_requests_renter_idx on public.booking_requests(renter_id, created_at desc);
create index if not exists booking_requests_host_idx on public.booking_requests(host_id, created_at desc);
create index if not exists booking_requests_listing_idx on public.booking_requests(listing_id);
create index if not exists host_messages_host_idx on public.host_messages(host_id, created_at desc);
create index if not exists host_messages_sender_idx on public.host_messages(sender_id, created_at desc);
create index if not exists payment_records_renter_idx on public.payment_records(renter_id, created_at desc);
create index if not exists payment_records_host_idx on public.payment_records(host_id, created_at desc);
create index if not exists reviews_listing_idx on public.reviews(listing_id, created_at desc);

-- updated_at triggers
create or replace trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace trigger listings_set_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

create or replace trigger booking_requests_set_updated_at
before update on public.booking_requests
for each row execute function public.set_updated_at();

create or replace trigger payment_records_set_updated_at
before update on public.payment_records
for each row execute function public.set_updated_at();

create or replace trigger host_messages_set_updated_at
before update on public.host_messages
for each row execute function public.set_updated_at();

create or replace trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

-- Create a profile row automatically when a Supabase Auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'Renter');

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, ''),
    case
      when requested_role in ('Renter', 'Host', 'Both') then requested_role::public.storet_user_role
      else 'Renter'::public.storet_user_role
    end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Grants expose tables to Supabase API roles; RLS below controls actual row access.
grant usage on schema public to anon, authenticated;
grant select on public.listings, public.reviews to anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.listings to authenticated;
grant select, insert, update, delete on public.saved_listings to authenticated;
grant select, insert, update, delete on public.booking_requests to authenticated;
grant select, insert, update, delete on public.payment_records to authenticated;
grant select, insert, update, delete on public.host_messages to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.saved_listings enable row level security;
alter table public.booking_requests enable row level security;
alter table public.payment_records enable row level security;
alter table public.host_messages enable row level security;
alter table public.reviews enable row level security;

-- Profiles: users manage only their own profile. Listing rows denormalize host display name.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Listings: active listings are public; hosts manage their own listings.
drop policy if exists "listings_public_read_active" on public.listings;
create policy "listings_public_read_active" on public.listings
for select to anon, authenticated
using (status = 'active');

drop policy if exists "listings_hosts_read_own" on public.listings;
create policy "listings_hosts_read_own" on public.listings
for select to authenticated
using (auth.uid() = host_id);

drop policy if exists "listings_hosts_insert_own" on public.listings;
create policy "listings_hosts_insert_own" on public.listings
for insert to authenticated
with check (auth.uid() = host_id);

drop policy if exists "listings_hosts_update_own" on public.listings;
create policy "listings_hosts_update_own" on public.listings
for update to authenticated
using (auth.uid() = host_id)
with check (auth.uid() = host_id);

drop policy if exists "listings_hosts_delete_own" on public.listings;
create policy "listings_hosts_delete_own" on public.listings
for delete to authenticated
using (auth.uid() = host_id);

-- Saved listings: each user owns their saved-listing rows.
drop policy if exists "saved_listings_select_own" on public.saved_listings;
create policy "saved_listings_select_own" on public.saved_listings
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "saved_listings_insert_own" on public.saved_listings;
create policy "saved_listings_insert_own" on public.saved_listings
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "saved_listings_delete_own" on public.saved_listings;
create policy "saved_listings_delete_own" on public.saved_listings
for delete to authenticated
using (auth.uid() = user_id);

-- Booking requests: visible to the renter and the host.
drop policy if exists "booking_requests_select_party" on public.booking_requests;
create policy "booking_requests_select_party" on public.booking_requests
for select to authenticated
using (auth.uid() = renter_id or auth.uid() = host_id);

drop policy if exists "booking_requests_insert_renter" on public.booking_requests;
create policy "booking_requests_insert_renter" on public.booking_requests
for insert to authenticated
with check (auth.uid() = renter_id);

drop policy if exists "booking_requests_update_party" on public.booking_requests;
create policy "booking_requests_update_party" on public.booking_requests
for update to authenticated
using (auth.uid() = renter_id or auth.uid() = host_id)
with check (auth.uid() = renter_id or auth.uid() = host_id);

-- Payment records: for mock checkout now; later Stripe should insert/update via an Edge Function/service role.
drop policy if exists "payment_records_select_party" on public.payment_records;
create policy "payment_records_select_party" on public.payment_records
for select to authenticated
using (auth.uid() = renter_id or auth.uid() = host_id);

drop policy if exists "payment_records_insert_renter_mock" on public.payment_records;
create policy "payment_records_insert_renter_mock" on public.payment_records
for insert to authenticated
with check (auth.uid() = renter_id);

-- Host messages: visible to the sender and receiving host.
drop policy if exists "host_messages_select_party" on public.host_messages;
create policy "host_messages_select_party" on public.host_messages
for select to authenticated
using (auth.uid() = sender_id or auth.uid() = host_id);

drop policy if exists "host_messages_insert_sender" on public.host_messages;
create policy "host_messages_insert_sender" on public.host_messages
for insert to authenticated
with check (auth.uid() = sender_id);

drop policy if exists "host_messages_update_party" on public.host_messages;
create policy "host_messages_update_party" on public.host_messages
for update to authenticated
using (auth.uid() = sender_id or auth.uid() = host_id)
with check (auth.uid() = sender_id or auth.uid() = host_id);

-- Reviews: public read; authenticated reviewers manage their own reviews.
drop policy if exists "reviews_public_read" on public.reviews;
create policy "reviews_public_read" on public.reviews
for select to anon, authenticated
using (true);

drop policy if exists "reviews_insert_reviewer" on public.reviews;
create policy "reviews_insert_reviewer" on public.reviews
for insert to authenticated
with check (auth.uid() = reviewer_id);

drop policy if exists "reviews_update_reviewer" on public.reviews;
create policy "reviews_update_reviewer" on public.reviews
for update to authenticated
using (auth.uid() = reviewer_id)
with check (auth.uid() = reviewer_id);

drop policy if exists "reviews_delete_reviewer" on public.reviews;
create policy "reviews_delete_reviewer" on public.reviews
for delete to authenticated
using (auth.uid() = reviewer_id);
