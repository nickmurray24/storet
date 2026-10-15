# Storet: weekly rates and rental calendars

This ZIP contains only changed and new files. Copy its `src`, `database`, and `supabase` contents into the matching folders in your existing project. Keep the folder structure; do not replace your entire project with this ZIP. No new frontend dependencies or environment variables are needed.

## Install in this order

Use a short maintenance/deployment window: the new database requires dates for every new reservation, so the old frontend must be updated in the same rollout.

1. Back up your current project/database. In Supabase SQL Editor, run `database/20261015_00_calendar_preflight.sql`. It is read only.
   - The first result identifies overlapping existing Approved/Confirmed/Active reservations. If it returns rows, review and resolve the real booking/payment situation before continuing. The migration will stop instead of deleting or overwriting a reservation.
   - The other results identify older requests without valid dates. A single existing approved/paid/active undated booking is supported and retains its full-listing hold until resolved. Old undated Pending/Waitlisted requests need cancellation and a new dated request before approval.
2. Run `database/20261015_01_weekly_period.sql` **by itself**. Wait for Success. Do not combine it with the next script: PostgreSQL needs the new enum value committed first.
3. In a separate SQL Editor run, execute `database/20261015_02_rental_calendar.sql`. This is one transaction and can be rerun. It assumes your existing Storet schema, payout setup, booking availability, listing edit, and Stripe migrations are already installed. Do not rerun the older availability migration afterward, because it restores whole-listing blocking.
4. From the project root in PowerShell/Terminal, deploy both updated Edge Functions:

   ```powershell
   npx supabase functions deploy create-checkout-session --no-verify-jwt
   npx supabase functions deploy stripe-webhook --no-verify-jwt
   ```

   If this computer has not been linked to the project yet, run these first:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

   The checkout function verifies the signed-in user internally. The webhook verifies Stripe's signature. Keep your existing `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STORET_APP_URL`, and Supabase secrets. Keep the existing Stripe webhook endpoint subscribed to `checkout.session.completed`.
5. Build/redeploy your React app as usual (`npm run build`), or restart `npm start` for local testing. Hard refresh the browser.

## What changes

- Hosts can enter a **Weekly rate** while creating or editing a listing. Weekly is offered to renters only when the host supplies it, just like the other rates. Existing listing edit locks still apply during Approved/Confirmed/Active bookings.
- Renters choose **move-in and move-out** on the listing page using date fields or the month calendar. They see the rental length, selected rate, and storage total before requesting.
- The quote prorates by calendar days using the chosen rate: daily / 1, weekly / 7, monthly / 30, yearly / 365. The total is rounded to cents once. The existing $19 booking service fee is added at checkout. Example: $70/week for 10 days costs $100 storage + $19 fee.
- **Move-out is the first free day.** January 1 → January 8 is seven charged days. Another reservation or host block can start on January 8.
- On **Host Dashboard → Listings → Calendar**, hosts can block a day, week, calendar month, or a custom range spanning multiple days/weeks/months. “Available again” is the first unblocked day. Notes are private. Remove a manual block to reopen those dates.
- Approved, Confirmed, and Active reservations hold their dates automatically. Pending and Waitlisted requests do not hold dates. A request cannot be submitted or approved over an existing hold or host block.
- The listing remains in Explore for other dates. Cancelling a request releases its hold; completing a dated rental releases the dates without hiding the whole listing. Host blocks cannot overwrite reservations, and deleting a manual block cannot cancel a booking.
- Approval holds remain until the booking is cancelled/completed or changes to a nonholding state; this patch does not add automatic approval expiry.
- Older bookings keep their existing amounts and receipts. Their dates are never fabricated. A legacy undated hold continues to block the whole listing until resolved through the existing booking workflow.
- Reservation dates and the quote are fixed once submitted. To request different dates/rates, cancel and submit a new request.

The server calculates the price from the listing's stored rates rather than trusting a browser-supplied total. An exclusion constraint protects booking holds and host blocks together, including simultaneous requests. Public calendars expose date ranges and reserved/blocked labels without renter identities, booking IDs, or host notes. Checkout records payment and confirmation atomically; a paid checkout that arrives after cancellation, or a second paid checkout for the same booking, is refunded instead of reviving/duplicating the reservation. Technical webhook failures return a retry response.

## Check it in your app

1. As a host, add a weekly rate on an editable listing. Open its Calendar and add a future week. Close/reopen the calendar and verify the block remains. Try a calendar month and a custom multiweek range too.
2. As another signed-in renter, open that listing. Verify its blocked dates are marked and cannot be reserved. A range that crosses a block should also be rejected, even if its endpoints are outside the block.
3. Choose an available 10-day range at a $70 weekly rate. Check that the quote and Stripe checkout both show $100 storage plus the $19 fee.
4. For an approval listing, submit two overlapping Pending requests. Approve one as the host; approving the other should fail with a date conflict. Verify an adjacent request starting on the first booking's move-out day can still be approved.
5. Complete a Stripe test-mode checkout. Verify the booking becomes Confirmed and has one receipt with the dated amount. Check that another renter sees those dates reserved while the listing remains discoverable for other dates.
6. Cancel an unpaid Approved request and verify those dates reopen. Complete a dated paid rental through the existing host workflow and verify the listing stays discoverable. Existing cancellation/refund policies for already confirmed rentals are unchanged.
7. Check an older undated booking: its amount/receipt should be unchanged and its listing should stay unavailable while that legacy hold is open.

## Validation performed

- Production React build passed; the six pre-existing HostDashboardPanel/StoretAppContext lint warnings remain.
- 18 automated pricing/date/mapping tests passed, covering weekly-only listings, rounding, daylight saving changes, leap days, adjacent rentals, invalid dates, and legacy holds.
- 42 checks against real PostgreSQL 18 passed over the existing schema with security, payout, address, review, notification, and analytics migrations. Checks include RLS/privacy, price tampering, lifecycle transitions, migration reruns, atomic receipt/confirmation, duplicate/late payments, concurrent overlapping approvals, and a host block racing with a request.
- 37 browser checks passed at desktop and 390/320px widths, including weekly/date submission, host block persistence/removal, conflict feedback, month presets, checkout totals, and the existing own-listing restriction.
- 27 isolated Edge Function checks passed with mocked Supabase/Stripe responses, including authoritative totals, auth, legacy charges, webhook retries, and idempotent refund calls.

Live Supabase deployment and a real Stripe test payment still need the account-level checks above; no live project or payment account was modified here. Run the included unit tests with:

```powershell
npm test -- --watchAll=false --runInBand src/utils/rentalDates.test.js
```
