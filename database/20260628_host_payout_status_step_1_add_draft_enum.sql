-- Step 1: Add the draft value to the listings status enum.
-- IMPORTANT: Run this file by itself in Supabase SQL Editor first.
-- Do not run Step 2 in the same SQL Editor execution.
-- Postgres must commit this enum change before 'draft' can be used by constraints/defaults.

alter type public.storet_listing_status add value if not exists 'draft';
