-- Storet Backend Phase 3
-- Supabase Auth -> public.profiles sync
-- Run this in the Supabase SQL Editor after Phase 1 schema has been applied.

create or replace function public.handle_new_storet_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.storet_user_role;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'role' in ('Renter', 'Host', 'Both')
      then (new.raw_user_meta_data ->> 'role')::public.storet_user_role
    else 'Renter'::public.storet_user_role
  end;

  insert into public.profiles (
    id,
    full_name,
    email,
    role
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      'Storet User'
    ),
    coalesce(new.email, ''),
    requested_role
  )
  on conflict (id) do update
    set
      full_name = excluded.full_name,
      email = excluded.email,
      role = excluded.role,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_storet_profile on auth.users;

create trigger on_auth_user_created_storet_profile
after insert on auth.users
for each row
execute function public.handle_new_storet_user();


-- Optional backfill: create profiles for any Auth users that existed before this trigger was added.
insert into public.profiles (
  id,
  full_name,
  email,
  role
)
select
  users.id,
  coalesce(
    nullif(users.raw_user_meta_data ->> 'full_name', ''),
    nullif(users.raw_user_meta_data ->> 'name', ''),
    'Storet User'
  ) as full_name,
  coalesce(users.email, '') as email,
  case
    when users.raw_user_meta_data ->> 'role' in ('Renter', 'Host', 'Both')
      then (users.raw_user_meta_data ->> 'role')::public.storet_user_role
    else 'Renter'::public.storet_user_role
  end as role
from auth.users users
where not exists (
  select 1
  from public.profiles profiles
  where profiles.id = users.id
)
on conflict (id) do nothing;
