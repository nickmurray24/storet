-- Apply AFTER 20261015_01_weekly_period.sql has committed.
-- Existing baseline schema, payout/booking availability and listing edit patches are prerequisites.
-- One transaction: any legacy overlapping holds stop this migration without deleting data.
begin;
create extension if not exists btree_gist;
alter table public.listings add column if not exists weekly_rate numeric(10,2);
alter table public.listings drop constraint if exists listings_at_least_one_rate;
alter table public.listings add constraint listings_at_least_one_rate check (
  coalesce(daily_rate,0)>0 or coalesce(weekly_rate,0)>0 or coalesce(monthly_rate,0)>0 or coalesce(yearly_rate,0)>0);
alter table public.listings drop constraint if exists listings_positive_rates;
alter table public.listings add constraint listings_positive_rates check (
  (daily_rate is null or daily_rate>0) and (weekly_rate is null or weekly_rate>0) and
  (monthly_rate is null or monthly_rate>0) and (yearly_rate is null or yearly_rate>0));
alter table public.booking_requests add column if not exists storage_total numeric(10,2);
alter table public.booking_requests add column if not exists rental_days integer;
-- Preserve historical charges. Do not retroactively prorate existing requests.
update public.booking_requests set storage_total=listing_price where storage_total is null;

-- Same exclusion constraint covers BOTH host blocks and reservation holds.
-- Null bounds for an old undated booking mean an all-time hold until it is resolved.
create table if not exists public.listing_calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  booking_id uuid unique references public.booking_requests(id) on delete cascade,
  kind text not null check (kind in ('blocked','booked')),
  start_date date,
  end_date date,
  reason text not null default '' check (length(reason)<=300),
  created_at timestamptz not null default now(),
  constraint calendar_valid_range check (
    (kind='blocked' and booking_id is null and start_date is not null and end_date is not null and end_date>start_date)
    or (kind='booked' and booking_id is not null and
      ((start_date is null and end_date is null) or (start_date is not null and end_date is not null and end_date>start_date)))),
  constraint calendar_no_overlap exclude using gist (listing_id with =, daterange(start_date,end_date,'[)') with &&)
);
alter table public.listing_calendar_blocks enable row level security;
revoke all on public.listing_calendar_blocks from anon, authenticated;
grant select, insert, delete on public.listing_calendar_blocks to authenticated;
drop policy if exists calendar_owner_read on public.listing_calendar_blocks;
create policy calendar_owner_read on public.listing_calendar_blocks for select to authenticated using (
  exists(select 1 from public.listings l where l.id=listing_id and l.host_id=auth.uid()));
drop policy if exists calendar_owner_insert on public.listing_calendar_blocks;
create policy calendar_owner_insert on public.listing_calendar_blocks for insert to authenticated with check (
  kind='blocked' and booking_id is null and exists(select 1 from public.listings l where l.id=listing_id and l.host_id=auth.uid()));
drop policy if exists calendar_owner_delete on public.listing_calendar_blocks;
create policy calendar_owner_delete on public.listing_calendar_blocks for delete to authenticated using (
  kind='blocked' and booking_id is null and exists(select 1 from public.listings l where l.id=listing_id and l.host_id=auth.uid()));

create or replace function public.storet_lock_calendar_listing() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then
    perform 1 from public.listings where id=old.listing_id for update; return old;
  end if;
  perform 1 from public.listings where id=new.listing_id for update;
  if new.kind='blocked' and new.start_date < current_date then raise exception 'Host blocks must start today or later.'; end if;
  return new;
end $$;
drop trigger if exists aa_calendar_lock on public.listing_calendar_blocks;
create trigger aa_calendar_lock before insert or delete on public.listing_calendar_blocks
for each row execute function public.storet_lock_calendar_listing();

-- Safe public projection: no identities, reservation IDs, or private host notes.
create or replace function public.get_listing_availability(p_listing_id uuid)
returns table(start_date date,end_date date,kind text)
language sql stable security definer set search_path='' as $$
  select c.start_date,c.end_date,c.kind from public.listing_calendar_blocks c
  join public.listings l on l.id=c.listing_id
  where l.id=p_listing_id and (l.host_id=auth.uid() or (
    l.status='active' and l.availability_status in ('available','waitlist') and not l.post_booking_action_required))
  order by c.start_date nulls first;
$$;
revoke all on function public.get_listing_availability(uuid) from public;
grant execute on function public.get_listing_availability(uuid) to anon, authenticated;

create or replace function public.storet_guard_dated_booking() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  l public.listings%rowtype; unit_rate numeric; basis integer; quote_cents bigint;
  actor uuid:=auth.uid(); privileged boolean:=coalesce(auth.role(),'')='service_role' or (auth.uid() is null and session_user in ('postgres','supabase_admin'));
  changed_hold boolean;
begin
  select * into l from public.listings where id=new.listing_id for update;
  if not found then raise exception 'Listing not found.'; end if;
  if tg_op='INSERT' then
    if new.renter_id=new.host_id then raise exception 'You cannot reserve your own listing.'; end if;
    if new.host_id<>l.host_id then raise exception 'The host does not match this listing.'; end if;
    if not privileged and actor is distinct from new.renter_id then raise exception 'Sign in as the renter to request a reservation.'; end if;
    if not public.is_active_listing_for_booking(l.id,l.host_id) then raise exception 'This listing is not accepting reservations.'; end if;
    if new.move_in_date is null or new.move_out_date is null or new.move_out_date<=new.move_in_date then raise exception 'Choose move-in and move-out dates; move-out must be after move-in.'; end if;
    if new.move_in_date<current_date then raise exception 'Move-in cannot be in the past.'; end if;
    unit_rate:=case new.rate_period::text when 'daily' then l.daily_rate when 'weekly' then l.weekly_rate when 'monthly' then l.monthly_rate when 'yearly' then l.yearly_rate end;
    basis:=case new.rate_period::text when 'daily' then 1 when 'weekly' then 7 when 'monthly' then 30 when 'yearly' then 365 end;
    if unit_rate is null or unit_rate<=0 or basis is null then raise exception 'This rate is not offered for this listing.'; end if;
    new.rental_days:=new.move_out_date-new.move_in_date;
    quote_cents:=round(unit_rate*100*new.rental_days/basis);
    if quote_cents<1 or quote_cents>2147481747 then raise exception 'The rental total is outside the supported payment range.'; end if;
    new.listing_price:=unit_rate; new.storage_total:=quote_cents/100.0;
    new.pricing_snapshot:=jsonb_build_object('daily',l.daily_rate,'weekly',l.weekly_rate,'monthly',l.monthly_rate,'yearly',l.yearly_rate);
    new.listing_title:=l.title; new.listing_location:=l.location; new.host_display_name:=l.host_display_name;
    new.rate_label:=initcap(new.rate_period::text);
    new.rate_display:='$'||unit_rate::text||case new.rate_period::text when 'daily' then '/day' when 'weekly' then '/wk' when 'monthly' then '/mo' else '/yr' end;
    new.duration:=new.rental_days||case when new.rental_days=1 then ' day' else ' days' end;
    new.status:=case l.booking_mode when 'instant' then 'Approved'::public.storet_booking_status when 'waitlist' then 'Waitlisted'::public.storet_booking_status else 'Pending'::public.storet_booking_status end;
    new.approved_at:=case when new.status='Approved' then now() else null end;
    new.waitlisted_at:=case when new.status='Waitlisted' then now() else null end;
    new.confirmed_at:=null; new.activated_at:=null; new.completed_at:=null; new.cancelled_at:=null; new.declined_at:=null;
    changed_hold:=true;
  else
    if (new.listing_id,new.host_id,new.renter_id,new.move_in_date,new.move_out_date,new.rate_period,new.listing_price,new.storage_total,new.rental_days,new.pricing_snapshot,new.listing_title,new.listing_location,new.rate_label,new.rate_display,new.duration)
      is distinct from (old.listing_id,old.host_id,old.renter_id,old.move_in_date,old.move_out_date,old.rate_period,old.listing_price,old.storage_total,old.rental_days,old.pricing_snapshot,old.listing_title,old.listing_location,old.rate_label,old.rate_display,old.duration)
      then raise exception 'Reservation dates and pricing are fixed. Cancel and submit a new request to change them.'; end if;
    if not privileged then
      if actor=new.renter_id and new.status is distinct from old.status and new.status<>'Cancelled' then raise exception 'Renters can only cancel their own requests.'; end if;
      if new.status='Confirmed' and old.status<>'Confirmed' then raise exception 'Checkout must confirm the payment.'; end if;
      if new.status='Active' and old.status not in ('Confirmed','Active') then raise exception 'Payment is required before activating a rental.'; end if;
      if new.status='Completed' and old.status not in ('Confirmed','Active','Completed') then raise exception 'Only paid rentals can be completed.'; end if;
      if new.status in ('Approved','Waitlisted','Declined') and old.status not in ('Pending','Waitlisted','Approved') then raise exception 'This booking cannot return to request review.'; end if;
      if new.status='Pending' and old.status<>'Pending' then raise exception 'Cancel and submit a new request instead.'; end if;
    end if;
    changed_hold:=new.status is distinct from old.status and new.status in ('Approved','Confirmed','Active');
    if changed_hold and not (old.status in ('Approved','Confirmed','Active')) then
      if new.move_in_date is null or new.move_out_date is null or new.move_out_date<=new.move_in_date then raise exception 'This legacy request has no valid dates. Cancel it and ask the renter to choose dates.'; end if;
      if new.move_in_date<current_date then raise exception 'Move-in has passed. Cancel and choose new dates.'; end if;
      if not public.is_active_listing_for_booking(l.id,l.host_id) then raise exception 'This listing is not accepting reservations.'; end if;
    end if;
  end if;
  if changed_hold and new.move_in_date is not null and new.move_out_date>new.move_in_date and exists (
    select 1 from public.listing_calendar_blocks c where c.listing_id=new.listing_id
      and c.booking_id is distinct from new.id and daterange(c.start_date,c.end_date,'[)') && daterange(new.move_in_date,new.move_out_date,'[)')
  ) then raise exception 'These dates are reserved or blocked by the host. Choose another range.'; end if;
  return new;
end $$;
drop trigger if exists ab_storet_guard_dated_booking on public.booking_requests;
create trigger ab_storet_guard_dated_booking before insert or update on public.booking_requests
for each row execute function public.storet_guard_dated_booking();

create or replace function public.storet_sync_calendar_hold() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status in ('Approved','Confirmed','Active') then
    insert into public.listing_calendar_blocks(listing_id,booking_id,kind,start_date,end_date)
    values(new.listing_id,new.id,'booked',case when new.move_out_date>new.move_in_date then new.move_in_date end,
      case when new.move_out_date>new.move_in_date then new.move_out_date end)
    on conflict(booking_id) do update set start_date=excluded.start_date,end_date=excluded.end_date;
  else delete from public.listing_calendar_blocks where booking_id=new.id;
  end if;
  return new;
end $$;
drop trigger if exists aa_storet_sync_calendar_hold on public.booking_requests;
create trigger aa_storet_sync_calendar_hold after insert or update of status on public.booking_requests
for each row execute function public.storet_sync_calendar_hold();

-- Dated bookings hold their dates; only legacy undated rentals hide the entire listing.
create or replace function public.sync_listing_availability_from_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
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
      and (br.move_in_date is null or br.move_out_date is null or br.move_out_date<=br.move_in_date)
  )
  into has_blocking_booking;

  if new.status = 'Completed' and (new.move_in_date is null or new.move_out_date is null or new.move_out_date<=new.move_in_date) then
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
set search_path = ''
as $$
declare
  has_blocking_booking boolean := false;
begin
  select exists (
    select 1
    from public.booking_requests br
    where br.listing_id = new.id
      and br.status in ('Approved', 'Confirmed', 'Active')
      and (br.move_in_date is null or br.move_out_date is null or br.move_out_date<=br.move_in_date)
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

create or replace function public.storet_guard_listing_content_edits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  editable_keys text[] := array[
    'title', 'location', 'address_line1', 'address_line2', 'city', 'state', 'postal_code',
    'country', 'formatted_address', 'display_location', 'address_verified', 'address_place_id',
    'address_accuracy', 'latitude', 'longitude', 'daily_rate', 'weekly_rate', 'monthly_rate', 'yearly_rate',
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
set search_path = ''
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


-- Migration backfill. Constraint failure means conflicting old holds need review.
insert into public.listing_calendar_blocks(listing_id,booking_id,kind,start_date,end_date)
select listing_id,id,'booked',case when move_out_date>move_in_date then move_in_date end,
  case when move_out_date>move_in_date then move_out_date end
from public.booking_requests where status in ('Approved','Confirmed','Active')
on conflict(booking_id) do nothing;
-- Restore discoverability for dated holds that were hidden by the previous global sync.
-- Preserve manually paused/draft listings and legacy completed-rental decisions.
update public.listings l set availability_status=case when booking_mode='waitlist' then 'waitlist'::public.storet_availability_status else 'available'::public.storet_availability_status end
where l.status='active' and not l.post_booking_action_required
and exists(select 1 from public.booking_requests b where b.listing_id=l.id and b.status in ('Approved','Confirmed','Active') and b.move_out_date>b.move_in_date)
and not exists(select 1 from public.booking_requests b where b.listing_id=l.id and b.status in ('Approved','Confirmed','Active') and (b.move_in_date is null or b.move_out_date is null or b.move_out_date<=b.move_in_date));

-- One atomic receipt + confirmation, called only by the verified Stripe webhook.
create or replace function public.record_dated_booking_payment(p_booking_id uuid,p_session_id text,p_intent_id text,p_amount_cents integer,p_currency text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.booking_requests%rowtype; existing public.payment_records%rowtype; payment_id uuid; storage_cents integer;
begin
  select * into b from public.booking_requests where id=p_booking_id for update;
  if not found then return jsonb_build_object('ok',false,'error','Booking no longer exists.'); end if;
  select * into existing from public.payment_records where booking_request_id=b.id;
  if found then
    if existing.stripe_checkout_session_id=p_session_id then return jsonb_build_object('ok',true,'paymentId',existing.id); end if;
    return jsonb_build_object('ok',false,'error','This booking has already been paid in a different checkout.');
  end if;
  storage_cents:=round(coalesce(b.storage_total,b.listing_price)*100);
  if b.status<>'Approved' or b.renter_id=b.host_id then return jsonb_build_object('ok',false,'error','This booking is no longer payable.'); end if;
  if b.move_out_date is not null and b.move_out_date<=current_date then return jsonb_build_object('ok',false,'error','The rental dates have passed.'); end if;
  if p_currency<>'usd' or p_amount_cents is distinct from storage_cents+1900 or p_intent_id is null then
    return jsonb_build_object('ok',false,'error','Payment does not match the approved rental total.'); end if;
  -- Approved already holds dates. A missing hold is treated as a business conflict.
  if not exists(select 1 from public.listing_calendar_blocks where booking_id=b.id and kind='booked') then
    return jsonb_build_object('ok',false,'error','The reservation hold is missing.'); end if;
  insert into public.payment_records(booking_request_id,listing_id,host_id,renter_id,stripe_checkout_session_id,stripe_payment_intent_id,
    display_card_brand,display_last4,storage_charge_cents,service_fee_cents,amount_cents,currency,rate_period,rate_label,rate_display,status,receipt_number,paid_at)
  values(b.id,b.listing_id,b.host_id,b.renter_id,p_session_id,p_intent_id,'Stripe','Checkout',storage_cents,1900,p_amount_cents,'usd',b.rate_period,b.rate_label,b.rate_display,'Paid','ST-'||upper(right(p_session_id,12)),now())
  returning id into payment_id;
  update public.booking_requests set status='Confirmed',confirmed_at=now() where id=b.id;
  return jsonb_build_object('ok',true,'paymentId',payment_id);
end $$;
revoke all on function public.record_dated_booking_payment(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.record_dated_booking_payment(uuid,text,text,integer,text) to service_role;
-- Remove the original mock payment INSERT policy if that old development policy still exists.
drop policy if exists payment_records_insert_renter_mock on public.payment_records;
revoke all on function public.storet_lock_calendar_listing() from public;
revoke all on function public.storet_guard_dated_booking() from public;
revoke all on function public.storet_sync_calendar_hold() from public;
commit;
