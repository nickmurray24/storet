-- Step 2: Refresh listing status constraints after the enum change has been committed.
-- Run this only after Step 1 has completed successfully in a separate Supabase SQL Editor run.

alter table public.listings
  drop constraint if exists listings_status_check;

alter table public.listings
  add constraint listings_status_check
  check (status in ('draft', 'active', 'paused', 'archived'));
