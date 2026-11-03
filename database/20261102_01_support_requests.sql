-- Private support intake, durable delivery state, and atomic spam limits.
-- Supabase SQL Editor, postgres role. Safe to rerun. No cron job is needed.
begin;
create table if not exists public.support_requests (
  id uuid primary key,
  ticket_number bigint generated always as identity unique,
  visit_id uuid not null,
  payload jsonb not null,
  ip_hash text not null check (length(ip_hash)=64),
  email_hash text not null check (length(email_hash)=64),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts integer not null default 0,
  claim_token uuid,
  leased_until timestamptz,
  first_attempt_at timestamptz,
  delivery_payload jsonb,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists support_requests_created_idx on public.support_requests(created_at);
create index if not exists support_requests_visit_idx on public.support_requests(visit_id);
create index if not exists support_requests_email_created_idx on public.support_requests(email_hash,created_at);
create index if not exists support_requests_ip_created_idx on public.support_requests(ip_hash,created_at);
alter table public.support_requests enable row level security;
revoke all on public.support_requests from public,anon,authenticated;
revoke all on sequence public.support_requests_ticket_number_seq from public,anon,authenticated;
grant all on public.support_requests to service_role;
grant usage,select on sequence public.support_requests_ticket_number_seq to service_role;

create or replace function public.storet_claim_support_request(
  p_request_id uuid,p_visit_id uuid,p_payload jsonb,p_ip_hash text,p_email_hash text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  request public.support_requests;
  visit_count integer;
  hourly_count integer; daily_count integer; ip_count integer; email_count integer;
begin
  if p_request_id is null or p_visit_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object'
     or p_ip_hash is null or p_email_hash is null or length(p_ip_hash)<>64 or length(p_email_hash)<>64 then
    raise exception 'Invalid support request';
  end if;
  if coalesce(p_payload->>'topic','') not in ('renting','hosting','payments','account','technical','other')
     or length(btrim(coalesce(p_payload->>'subject',''))) not between 1 and 120
     or length(btrim(coalesce(p_payload->>'message',''))) not between 1 and 4000
     or length(coalesce(p_payload->>'name',''))>100
     or length(coalesce(p_payload->>'reference',''))>200
     or length(coalesce(p_payload->>'email',''))>254
     or coalesce(p_payload->>'email','') !~* '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$' then
    raise exception 'Invalid support fields';
  end if;
  -- Serialize this small intake transaction, including global counters. Concurrent tabs cannot race the limits.
  perform pg_catalog.pg_advisory_xact_lock(8420261103::bigint);
  select * into request from public.support_requests where id=p_request_id for update;
  if found then
    if request.visit_id<>p_visit_id or request.payload<>p_payload then
      return jsonb_build_object('state','conflict');
    end if;
  else
    select count(*) into visit_count from public.support_requests where visit_id=p_visit_id;
    if visit_count>=3 then return jsonb_build_object('state','visit_limit'); end if;
    select count(*) filter(where created_at>now()-interval '1 hour'),count(*),
      count(*) filter(where ip_hash=p_ip_hash and created_at>now()-interval '1 hour'),
      count(*) filter(where email_hash=p_email_hash and created_at>now()-interval '1 hour')
    into hourly_count,daily_count,ip_count,email_count
    from public.support_requests where created_at>now()-interval '1 day';
    if hourly_count>=30 or daily_count>=100 or ip_count>=5 or email_count>=3 then
      return jsonb_build_object('state','rate_limit');
    end if;
    insert into public.support_requests(id,visit_id,payload,ip_hash,email_hash)
      values(p_request_id,p_visit_id,p_payload,p_ip_hash,p_email_hash) returning * into request;
  end if;
  select count(*) into visit_count from public.support_requests where visit_id=p_visit_id;
  if request.status='sent' then
    return jsonb_build_object('state','sent','reference','ST-'||request.ticket_number,'visit_count',visit_count);
  end if;
  if request.status='processing' and request.leased_until>now() then
    return jsonb_build_object('state','in_progress');
  end if;
  if request.attempts>=5 or request.first_attempt_at<now()-interval '23 hours' then
    return jsonb_build_object('state','review_required','reference','ST-'||request.ticket_number);
  end if;
  update public.support_requests set status='processing',claim_token=gen_random_uuid(),
    leased_until=now()+interval '2 minutes',attempts=attempts+1,
    first_attempt_at=coalesce(first_attempt_at,now())
  where id=p_request_id returning * into request;
  return jsonb_build_object('state','claimed','request',to_jsonb(request),'visit_count',visit_count);
end;
$$;

create or replace function public.storet_prepare_support_email(p_request_id uuid,p_claim_token uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  update public.support_requests set delivery_payload=coalesce(delivery_payload,p_payload)
  where id=p_request_id and claim_token=p_claim_token and status='processing' and leased_until>now()
  returning delivery_payload into result;
  return result;
end;
$$;

create or replace function public.storet_finish_support_email(p_request_id uuid,p_claim_token uuid,
  p_outcome text,p_provider_id text default null,p_error text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
  if p_outcome not in ('sent','failed') then raise exception 'Invalid support outcome'; end if;
  update public.support_requests set status=p_outcome,claim_token=null,leased_until=null,
    provider_message_id=coalesce(p_provider_id,provider_message_id),last_error=left(p_error,300),
    sent_at=case when p_outcome='sent' then now() else sent_at end
  where id=p_request_id and claim_token=p_claim_token and status='processing';
  get diagnostics affected=row_count;
  return affected=1;
end;
$$;
revoke all on function public.storet_claim_support_request(uuid,uuid,jsonb,text,text) from public,anon,authenticated;
revoke all on function public.storet_prepare_support_email(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.storet_finish_support_email(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.storet_claim_support_request(uuid,uuid,jsonb,text,text) to service_role;
grant execute on function public.storet_prepare_support_email(uuid,uuid,jsonb) to service_role;
grant execute on function public.storet_finish_support_email(uuid,uuid,text,text,text) to service_role;
commit;
