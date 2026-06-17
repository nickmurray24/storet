-- Storet Backend Phase 10
-- Backend notifications and realtime activity feed

create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null default 'system',
  title text not null,
  description text not null default '',
  status text not null default 'Unread' check (status in ('Unread', 'Read')),
  action_label text,
  action_to text,
  listing_id uuid references public.listings(id) on delete cascade,
  booking_request_id uuid references public.booking_requests(id) on delete cascade,
  host_message_id uuid references public.host_messages(id) on delete cascade,
  payment_record_id uuid references public.payment_records(id) on delete cascade,
  review_id uuid references public.reviews(id) on delete cascade,
  source_key text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_recipient_status_idx
  on public.notifications (recipient_id, status);

create unique index if not exists notifications_recipient_source_key_idx
  on public.notifications (recipient_id, source_key)
  where source_key is not null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  using (recipient_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications
  for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications
  for delete
  using (recipient_id = auth.uid());

create or replace function public.set_notification_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.status = 'Read' and new.read_at is null then
    new.read_at = now();
  end if;

  if new.status = 'Unread' then
    new.read_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists set_notification_updated_at on public.notifications;
create trigger set_notification_updated_at
  before update on public.notifications
  for each row
  execute function public.set_notification_updated_at();

create or replace function public.upsert_storet_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_description text,
  p_action_label text,
  p_action_to text,
  p_listing_id uuid,
  p_booking_request_id uuid,
  p_host_message_id uuid,
  p_payment_record_id uuid,
  p_review_id uuid,
  p_source_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_recipient_id is null then
    return;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    title,
    description,
    status,
    action_label,
    action_to,
    listing_id,
    booking_request_id,
    host_message_id,
    payment_record_id,
    review_id,
    source_key,
    metadata
  ) values (
    p_recipient_id,
    p_actor_id,
    coalesce(nullif(p_type, ''), 'system'),
    coalesce(nullif(p_title, ''), 'Storet update'),
    coalesce(p_description, ''),
    'Unread',
    p_action_label,
    p_action_to,
    p_listing_id,
    p_booking_request_id,
    p_host_message_id,
    p_payment_record_id,
    p_review_id,
    p_source_key,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (recipient_id, source_key) where source_key is not null
  do update set
    actor_id = excluded.actor_id,
    type = excluded.type,
    title = excluded.title,
    description = excluded.description,
    status = 'Unread',
    action_label = excluded.action_label,
    action_to = excluded.action_to,
    listing_id = excluded.listing_id,
    booking_request_id = excluded.booking_request_id,
    host_message_id = excluded.host_message_id,
    payment_record_id = excluded.payment_record_id,
    review_id = excluded.review_id,
    metadata = excluded.metadata,
    read_at = null,
    updated_at = now();
end;
$$;

create or replace function public.handle_booking_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_status text;
  notification_type text;
  renter_copy text;
  action_label text;
  action_to text;
begin
  booking_status := new.status::text;
  notification_type := case when booking_status = 'Waitlisted' then 'waitlist' else 'booking' end;

  if tg_op = 'INSERT' then
    if new.host_id is not null and new.host_id is distinct from new.renter_id then
      perform public.upsert_storet_notification(
        new.host_id,
        new.renter_id,
        notification_type,
        case
          when booking_status = 'Waitlisted' then 'New waitlist request for ' || coalesce(new.listing_title, 'your listing')
          when booking_status = 'Approved' then 'New instant booking for ' || coalesce(new.listing_title, 'your listing')
          else 'New booking request for ' || coalesce(new.listing_title, 'your listing')
        end,
        coalesce(new.renter_display_name, 'A renter') || ' requested ' || coalesce(lower(new.rate_label), 'storage') || ' at ' || coalesce(new.listing_title, 'your Storet listing') || '.',
        'Open host dashboard',
        '/host-dashboard',
        new.listing_id,
        new.id,
        null,
        null,
        null,
        'booking:' || new.id::text || ':created',
        jsonb_build_object('status', booking_status)
      );
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' and coalesce(old.status::text, '') is distinct from booking_status then
    renter_copy := case booking_status
      when 'Approved' then 'Your host approved the request. You can continue to checkout.'
      when 'Waitlisted' then 'The host added your request to the waitlist.'
      when 'Declined' then 'The host declined this request.'
      when 'Confirmed' then 'Your booking is confirmed after checkout.'
      when 'Active' then 'Your storage booking is now active.'
      when 'Completed' then 'Your storage booking is complete. You can now leave a review.'
      when 'Cancelled' then 'This booking has been cancelled.'
      else 'Your booking status changed to ' || booking_status || '.'
    end;

    action_label := case
      when booking_status = 'Approved' then 'Continue to checkout'
      when booking_status in ('Confirmed', 'Active', 'Completed', 'Cancelled') then 'View booking'
      else 'View listing'
    end;

    action_to := case
      when booking_status in ('Approved', 'Confirmed', 'Active', 'Completed', 'Cancelled') then '/checkout/' || new.id::text
      else '/listing/' || new.listing_id::text
    end;

    if new.renter_id is not null and new.renter_id is distinct from new.host_id then
      perform public.upsert_storet_notification(
        new.renter_id,
        new.host_id,
        notification_type,
        'Your booking for ' || coalesce(new.listing_title, 'a Storet space') || ' is ' || lower(booking_status),
        renter_copy,
        action_label,
        action_to,
        new.listing_id,
        new.id,
        null,
        null,
        null,
        'booking:' || new.id::text || ':status:' || booking_status,
        jsonb_build_object('status', booking_status)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists create_booking_notifications on public.booking_requests;
create trigger create_booking_notifications
  after insert or update of status on public.booking_requests
  for each row
  execute function public.handle_booking_notification();

create or replace function public.handle_host_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.host_id is not null and new.host_id is distinct from new.sender_id then
    perform public.upsert_storet_notification(
      new.host_id,
      new.sender_id,
      'message',
      'New message about ' || coalesce(new.listing_title, 'your listing'),
      coalesce(new.sender_display_name, 'A renter') || ' sent: ' || left(coalesce(new.message, ''), 180),
      'Open listing',
      '/listing/' || new.listing_id::text,
      new.listing_id,
      null,
      new.id,
      null,
      null,
      'message:' || new.id::text,
      jsonb_build_object('subject', new.subject)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists create_host_message_notifications on public.host_messages;
create trigger create_host_message_notifications
  after insert on public.host_messages
  for each row
  execute function public.handle_host_message_notification();

create or replace function public.handle_payment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_title text;
  receipt text;
begin
  select listing_title into booking_title
  from public.booking_requests
  where id = new.booking_request_id;

  receipt := coalesce(new.receipt_number, 'your receipt');

  if new.renter_id is not null then
    perform public.upsert_storet_notification(
      new.renter_id,
      null,
      'payment',
      'Payment received for ' || coalesce(booking_title, 'your Storet booking'),
      'Stripe confirmed your payment. Receipt: ' || receipt || '.',
      'View receipt',
      '/checkout/' || new.booking_request_id::text,
      new.listing_id,
      new.booking_request_id,
      null,
      new.id,
      null,
      'payment:' || new.id::text || ':renter',
      jsonb_build_object('status', new.status::text, 'receiptNumber', receipt)
    );
  end if;

  if new.host_id is not null and new.host_id is distinct from new.renter_id then
    perform public.upsert_storet_notification(
      new.host_id,
      new.renter_id,
      'payment',
      'Payment completed for ' || coalesce(booking_title, 'a Storet booking'),
      'A renter completed checkout. Receipt: ' || receipt || '.',
      'Open host dashboard',
      '/host-dashboard',
      new.listing_id,
      new.booking_request_id,
      null,
      new.id,
      null,
      'payment:' || new.id::text || ':host',
      jsonb_build_object('status', new.status::text, 'receiptNumber', receipt)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists create_payment_notifications on public.payment_records;
create trigger create_payment_notifications
  after insert on public.payment_records
  for each row
  execute function public.handle_payment_notification();

create or replace function public.handle_review_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_title text;
begin
  select title into listing_title
  from public.listings
  where id = new.listing_id;

  if new.host_id is not null and new.host_id is distinct from new.reviewer_id then
    perform public.upsert_storet_notification(
      new.host_id,
      new.reviewer_id,
      'review',
      'New ' || new.rating::text || '-star review for ' || coalesce(listing_title, 'your listing'),
      coalesce(new.reviewer_display_name, 'A renter') || ' left a verified review.',
      'View listing',
      '/listing/' || new.listing_id::text,
      new.listing_id,
      new.booking_request_id,
      null,
      null,
      new.id,
      'review:' || new.id::text,
      jsonb_build_object('rating', new.rating)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists create_review_notifications on public.reviews;
create trigger create_review_notifications
  after insert on public.reviews
  for each row
  execute function public.handle_review_notification();

create or replace function public.handle_listing_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.host_id is not null then
    perform public.upsert_storet_notification(
      new.host_id,
      new.host_id,
      'listing',
      new.title || ' is now listed on Storet',
      'Your listing is ready for renters to discover.',
      'View listing',
      '/listing/' || new.id::text,
      new.id,
      null,
      null,
      null,
      null,
      'listing:' || new.id::text || ':created',
      jsonb_build_object('status', new.status::text)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists create_listing_notifications on public.listings;
create trigger create_listing_notifications
  after insert on public.listings
  for each row
  execute function public.handle_listing_notification();

create or replace function public.handle_saved_listing_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_title text;
begin
  select title into listing_title
  from public.listings
  where id = new.listing_id;

  perform public.upsert_storet_notification(
    new.user_id,
    new.user_id,
    'saved',
    coalesce(listing_title, 'A Storet listing') || ' was saved',
    'You can revisit this saved space from your profile.',
    'View profile',
    '/profile',
    new.listing_id,
    null,
    null,
    null,
    null,
    'saved:' || new.user_id::text || ':' || new.listing_id::text,
    '{}'::jsonb
  );

  return new;
end;
$$;

drop trigger if exists create_saved_listing_notifications on public.saved_listings;
create trigger create_saved_listing_notifications
  after insert on public.saved_listings
  for each row
  execute function public.handle_saved_listing_notification();

-- Seed a one-time welcome notification so existing users can confirm the page works immediately.
insert into public.notifications (
  recipient_id,
  actor_id,
  type,
  title,
  description,
  status,
  action_label,
  action_to,
  source_key
)
select
  profiles.id,
  profiles.id,
  'system',
  'Backend notifications are live',
  'Storet will now save booking, message, payment, listing, saved-space, and review updates in Supabase.',
  'Unread',
  'View notifications',
  '/notifications',
  'phase10-welcome:' || profiles.id::text
from public.profiles profiles
on conflict (recipient_id, source_key) where source_key is not null do nothing;

-- Enable postgres change broadcasts for optional Supabase Realtime subscriptions.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception
  when others then
    null;
end $$;
