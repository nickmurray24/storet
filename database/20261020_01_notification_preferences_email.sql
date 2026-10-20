-- Run after storet_backend_phase10_notifications.sql. Safe to re-run.
-- Only NEW notification inserts are queued; existing history is not emailed.
begin;

create table if not exists public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('booking','waitlist','message','payment','review','listing','saved','system')),
  in_app boolean not null default true,
  email boolean not null default true,
  primary key (user_id, category)
);
alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public, anon, authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;
drop policy if exists notification_preferences_own on public.notification_preferences;
create policy notification_preferences_own on public.notification_preferences to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.notifications add column if not exists in_app_visible boolean not null default true;
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated
  using (recipient_id = auth.uid() and in_app_visible);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
  using (recipient_id = auth.uid() and in_app_visible)
  with check (recipient_id = auth.uid() and in_app_visible);
-- Browsers may mark their notifications read, but cannot manufacture email content.
revoke insert, update on public.notifications from public, anon, authenticated;
grant update (status, read_at) on public.notifications to authenticated;
revoke all on function public.upsert_storet_notification(uuid,uuid,text,text,text,text,text,uuid,uuid,uuid,uuid,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.upsert_storet_notification(uuid,uuid,text,text,text,text,text,uuid,uuid,uuid,uuid,uuid,text,jsonb) to service_role;

create or replace function public.storet_notification_category(p_type text)
returns text language sql immutable set search_path = '' as $$
  select case when p_type in ('booking','waitlist','message','payment','review','listing','saved','system') then p_type else 'system' end;
$$;
create or replace function public.storet_notification_channel_enabled(p_user uuid, p_type text, p_channel text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select case when p_channel = 'email' then p.email else p.in_app end
    from public.notification_preferences p where p.user_id = p_user
      and p.category = public.storet_notification_category(p_type)), true);
$$;
revoke all on function public.storet_notification_channel_enabled(uuid,text,text) from public, anon, authenticated;
grant execute on function public.storet_notification_channel_enabled(uuid,text,text) to service_role;

create table if not exists public.notification_email_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null unique references public.notifications(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  title text not null,
  description text not null,
  action_label text,
  action_to text,
  status text not null default 'pending' check (status in ('pending','processing','sent','skipped','failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  claim_token uuid,
  leased_until timestamptz,
  first_attempt_at timestamptz,
  provider_payload jsonb,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists notification_email_queue_due_idx on public.notification_email_queue(status,next_attempt_at);
alter table public.notification_email_queue enable row level security;
revoke all on public.notification_email_queue from public, anon, authenticated;
grant all on public.notification_email_queue to service_role;

create or replace function public.storet_stamp_notification_visibility()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.in_app_visible := public.storet_notification_channel_enabled(new.recipient_id,new.type,'in_app');
  return new;
end;
$$;
create or replace function public.storet_queue_notification_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.storet_notification_channel_enabled(new.recipient_id,new.type,'email') then
    insert into public.notification_email_queue(notification_id,recipient_id,category,title,description,action_label,action_to)
    values(new.id,new.recipient_id,public.storet_notification_category(new.type),new.title,new.description,new.action_label,new.action_to)
    on conflict (notification_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.storet_stamp_notification_visibility() from public,anon,authenticated;
revoke all on function public.storet_queue_notification_email() from public,anon,authenticated;
drop trigger if exists storet_stamp_notification_visibility on public.notifications;
create trigger storet_stamp_notification_visibility before insert on public.notifications
  for each row execute function public.storet_stamp_notification_visibility();
drop trigger if exists storet_queue_notification_email on public.notifications;
create trigger storet_queue_notification_email after insert on public.notifications
  for each row execute function public.storet_queue_notification_email();

create or replace function public.storet_claim_notification_emails(p_limit integer default 10)
returns setof public.notification_email_queue language plpgsql security definer set search_path = '' as $$
begin
  -- Stop before the provider's 24-hour idempotency window expires. Never automatically replay old attempts.
  update public.notification_email_queue set status='failed',claim_token=null,leased_until=null,
    last_error='Retry limit or safe retry window exceeded; inspect provider delivery before any manual replay.'
  where (status='pending' or (status='processing' and leased_until < now()))
    and (attempts >= 6 or first_attempt_at < now() - interval '23 hours');
  return query
  with candidates as (
    select q.id from public.notification_email_queue q
    where (q.status='pending' and q.next_attempt_at <= now())
       or (q.status='processing' and q.leased_until < now())
    order by q.created_at,q.id for update skip locked limit least(greatest(p_limit,1),20)
  )
  update public.notification_email_queue q set status='processing',attempts=q.attempts+1,
    claim_token=gen_random_uuid(),leased_until=now()+interval '5 minutes',
    first_attempt_at=coalesce(q.first_attempt_at,now())
  from candidates c where q.id=c.id returning q.*;
end;
$$;

create or replace function public.storet_get_notification_email_context(p_job_id uuid,p_claim_token uuid)
returns table(email text, email_verified boolean, email_enabled boolean)
language sql stable security definer set search_path = '' as $$
  select u.email, u.email_confirmed_at is not null,
    public.storet_notification_channel_enabled(q.recipient_id,q.category,'email')
  from public.notification_email_queue q join auth.users u on u.id=q.recipient_id
  where q.id=p_job_id and q.claim_token=p_claim_token and q.status='processing' and q.leased_until>now();
$$;

create or replace function public.storet_prepare_notification_email(p_job_id uuid,p_claim_token uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare payload jsonb;
begin
  update public.notification_email_queue set provider_payload=coalesce(provider_payload,p_payload)
  where id=p_job_id and claim_token=p_claim_token and status='processing' and leased_until>now()
  returning provider_payload into payload;
  return payload;
end;
$$;

create or replace function public.storet_finish_notification_email(p_job_id uuid,p_claim_token uuid,
  p_outcome text,p_provider_id text default null,p_error text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  if p_outcome not in ('sent','skipped','failed','retry') then raise exception 'Invalid email outcome'; end if;
  update public.notification_email_queue set
    status=case when p_outcome='retry' then case when attempts>=6 then 'failed' else 'pending' end else p_outcome end,
    next_attempt_at=now()+make_interval(secs=>least(3600,30*power(2,greatest(attempts-1,0)))::integer),
    provider_message_id=coalesce(p_provider_id,provider_message_id),
    sent_at=case when p_outcome='sent' then now() else sent_at end,
    last_error=left(p_error,500),claim_token=null,leased_until=null
  where id=p_job_id and claim_token=p_claim_token and status='processing';
  get diagnostics affected = row_count;
  return affected=1;
end;
$$;
revoke all on function public.storet_claim_notification_emails(integer) from public,anon,authenticated;
revoke all on function public.storet_get_notification_email_context(uuid,uuid) from public,anon,authenticated;
revoke all on function public.storet_prepare_notification_email(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.storet_finish_notification_email(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.storet_claim_notification_emails(integer) to service_role;
grant execute on function public.storet_get_notification_email_context(uuid,uuid) to service_role;
grant execute on function public.storet_prepare_notification_email(uuid,uuid,jsonb) to service_role;
grant execute on function public.storet_finish_notification_email(uuid,uuid,text,text,text) to service_role;
commit;
