-- Storet Backend Phase 8 optional production hardening
-- Run this only after Stripe Checkout and the stripe-webhook Edge Function are working.
-- It removes the browser/client ability to insert payment records directly.
-- Stripe webhook inserts still work because the Edge Function uses the service role key.

begin;

drop policy if exists "payment_records_insert_renter_mock" on public.payment_records;

commit;
