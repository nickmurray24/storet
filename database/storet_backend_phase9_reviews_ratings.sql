-- Storet Backend Phase 9: Reviews and listing rating summaries
-- Run this in Supabase SQL Editor after applying the Phase 9 React files.

alter table public.reviews
add column if not exists reviewer_display_name text not null default '';

update public.reviews as reviews
set reviewer_display_name = coalesce(nullif(profiles.full_name, ''), 'Storet renter')
from public.profiles as profiles
where reviews.reviewer_id = profiles.id
  and coalesce(reviews.reviewer_display_name, '') = '';

create unique index if not exists reviews_one_per_booking_request_idx
on public.reviews(booking_request_id)
where booking_request_id is not null;

create or replace function public.refresh_listing_review_summary(target_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings as listings
  set
    average_rating = coalesce(summary.average_rating, 0),
    review_count = coalesce(summary.review_count, 0),
    updated_at = now()
  from (
    select
      target_listing_id as listing_id,
      round(avg(rating)::numeric, 2) as average_rating,
      count(*)::integer as review_count
    from public.reviews
    where listing_id = target_listing_id
  ) as summary
  where listings.id = target_listing_id;
end;
$$;

create or replace function public.handle_review_summary_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_listing_review_summary(new.listing_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_listing_review_summary(old.listing_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_refresh_listing_summary on public.reviews;
create trigger reviews_refresh_listing_summary
after insert or update or delete on public.reviews
for each row execute function public.handle_review_summary_change();

-- Rebuild summaries for existing listings/reviews.
with reviewed_listings as (
  select distinct listing_id from public.reviews
)
select public.refresh_listing_review_summary(listing_id)
from reviewed_listings;

-- Reviews: public read; only verified renters with completed bookings can create reviews.
drop policy if exists "reviews_public_read" on public.reviews;
create policy "reviews_public_read" on public.reviews
for select to anon, authenticated
using (true);

drop policy if exists "reviews_insert_reviewer" on public.reviews;
create policy "reviews_insert_reviewer" on public.reviews
for insert to authenticated
with check (
  auth.uid() = reviewer_id
  and exists (
    select 1
    from public.booking_requests as booking_requests
    where booking_requests.id = reviews.booking_request_id
      and booking_requests.listing_id = reviews.listing_id
      and booking_requests.host_id = reviews.host_id
      and booking_requests.renter_id = auth.uid()
      and booking_requests.status = 'Completed'
  )
);

drop policy if exists "reviews_update_reviewer" on public.reviews;
create policy "reviews_update_reviewer" on public.reviews
for update to authenticated
using (auth.uid() = reviewer_id)
with check (auth.uid() = reviewer_id);

drop policy if exists "reviews_delete_reviewer" on public.reviews;
create policy "reviews_delete_reviewer" on public.reviews
for delete to authenticated
using (auth.uid() = reviewer_id);
