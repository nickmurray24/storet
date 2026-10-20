# Notification settings and email delivery

This ZIP contains changed/new files only. Extract it into your existing project root, allowing the included files to replace their current versions. It preserves the previous listing, address, calendar, and layout updates.

## What users get

- A Settings link in the navigation for both renter and host modes, plus a Settings button on Notifications.
- Separate **In app** and **Email** switches for booking, waitlist, message, payment, review, listing, saved-space, and general notifications.
- An all-email on/off shortcut and an explicit Save preferences button, with loading, retry, unsaved-change, and success states.
- Both channels enabled initially. Preferences follow the account across devices and modes.
- New activity follows the selected preferences. Existing in-app history stays in place; existing notifications are **not** emailed in bulk.
- Email alerts contain the notification text, a link back to the relevant app page, and a link to Settings. They go only to the verified sign-in email. Authentication/security emails continue through your existing authentication setup.

This extends the app's existing notification events; it does not add new event types or a two-way chat system. One new notification record can produce one email. Updating a notification, marking it read, or replaying the same event/source key does not create another email. Reading an in-app alert does not cancel its queued email; turning off that email category before delivery does.

**Email delivery needs the backend setup below. Copying the React files alone does not enable email.** Use your own Resend account and verified sender domain. No new frontend dependencies or frontend API keys are required.

## Deployment (in order)

### 1. Apply the database migration

In your project's Supabase SQL Editor, run:

`database/20261020_01_notification_preferences_email.sql`

It assumes your existing Phase 10 notification table/triggers are installed. This migration is transactional and safe to rerun. It creates account preferences and a private email queue, adds visibility for new in-app alerts, and restricts browser notification updates to read status. It also prevents browsers from calling the internal notification-creation helper directly.

Deploy the accompanying frontend and backend files together: the new notification service uses the added visibility column, and the older service's read-update payload is incompatible with the stricter permissions.

Only activity after this migration is queued. Jobs can wait while you finish sender setup; no historical backfill runs.

### 2. Set up the email sender

In [Resend](https://resend.com), verify a domain you control and create an API key with permission to send email for it. Pick a sender such as `Storet <notifications@yourdomain.com>` on that verified domain.

Generate a random worker secret locally (PowerShell or another terminal):

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

In **Supabase → Edge Functions → Secrets**, add:

| Secret | Value |
| --- | --- |
| `RESEND_API_KEY` | Your Resend sending API key |
| `NOTIFICATION_EMAIL_FROM` | `Storet <notifications@your-verified-domain.com>` |
| `NOTIFICATION_WORKER_SECRET` | The generated random secret (at least 32 characters) |
| `STORET_APP_URL` | Your production app URL, such as `https://your-app.com` |

Keep any existing `STORET_APP_URL` consistent with the rest of your app. Use HTTPS in production; HTTP is accepted only for localhost development. Do not put these secrets in a `REACT_APP_*` variable, the browser, or source control. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied to deployed Supabase Edge Functions automatically.

### 3. Deploy the worker

From your project root (the directory containing `supabase/`):

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy send-notification-emails --no-verify-jwt
```

Using `npx supabase` avoids the earlier PowerShell “supabase is not recognized” problem. Node/npm must be installed locally. You do not need to redeploy your other functions for this patch.

The function checks the private `x-storet-email-secret` header itself. `--no-verify-jwt` is intentional because the scheduler uses that secret instead of a user JWT. Calling it without the header returns 401; it never accepts recipients or email content from request bodies.

### 4. Store scheduler credentials in Vault

In **Supabase → Integrations → Vault**, create these two secrets (one value per secret):

| Vault secret name | Value |
| --- | --- |
| `storet_notification_worker_url` | `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-notification-emails` |
| `storet_notification_worker_secret` | The exact same value used for `NOTIFICATION_WORKER_SECRET` |

If Vault is not yet enabled, enable it in the Supabase dashboard first. Use the project's actual function URL if you use a custom Supabase domain. To rotate the worker secret later, update both Edge Function secrets and Vault.

### 5. Enable scheduled delivery

Run this in the Supabase SQL Editor:

`database/20261020_02_schedule_notification_emails.sql`

It enables `pg_cron` and `pg_net`, checks for the Vault entries, and creates the named `storet-notification-emails` job. If your project requires enabling these extensions in the dashboard first, enable them there and rerun the script. Running it again updates the same named job.

The job runs once per minute, processing up to 10 queued emails per invocation. Under light load, email is normally submitted within about a minute. Larger backlogs and provider limits can add delay. The worker spaces provider requests and retries temporary failures. Resend's sending limits and domain configuration still apply.

### 6. Deploy the frontend

Deploy as you normally do:

```sh
npm run build
```

The site host must continue routing `/settings` to your React app, as it does for the other client routes.

## How to check it

Use test accounts you control, with verified sign-in emails:

1. Open **Settings** in both renter and host mode. Toggle a category, save, and refresh; the saved choices should remain.
2. Keep Messages enabled for both channels. Create a new message using the app's existing host-contact flow. The recipient should see one in-app alert and receive one email with the correct listing link.
3. Turn off Messages email but leave In app on, then create another message. Only the in-app alert should appear.
4. Reverse those choices, then create another message. Only an email should arrive; old in-app messages should remain in history.
5. Turn off both channels, save, then create another message. Neither new alert should appear.
6. Restore preferences as desired. Check another supported event, such as creating a listing or requesting a reservation. Mark all read and refresh to verify normal notification behavior.

Emails are sent to the recipient's account, not the sender's. Message and payment text can contain private information, so verify recipients using accounts you control.

## Delivery monitoring and recovery

Inspect **Supabase → Cron → storet-notification-emails → History** and the Edge Function logs. For individual delivery state, run this as an administrator:

```sql
select id, notification_id, category, status, attempts,
       created_at, sent_at, provider_message_id, last_error
from public.notification_email_queue
order by created_at desc
limit 50;
```

- `pending`: waiting for the next run or retry time.
- `processing`: leased by a worker; an interrupted job can be reclaimed after five minutes.
- `sent`: Resend accepted the email. Check Resend's delivery activity for bounces or inbox delivery; provider acceptance is not a guarantee of inbox placement.
- `skipped`: email was disabled, the address was unavailable/unverified, or the account email changed after the payload was prepared.
- `failed`: permanent provider rejection, six attempts exhausted, or the safe retry window expired. Fix sender configuration/quota issues and inspect Resend activity before any manual replay.

Each job has a stable provider idempotency key and a frozen email payload. Automatic retries stop after 23 hours from the first attempt, within Resend's documented 24-hour key retention, to avoid accidentally sending the same email again after that protection expires. Never blindly reset/requeue old failed or sent jobs. Pending jobs that have never been attempted can still start after a longer outage.

No email delivery attempts were made against your live provider during development. The private queue is not accessible to signed-in users; only the worker/service role can claim and complete jobs. Do not rerun an older Phase 10 migration after this patch without reapplying migration 01, because it can restore the earlier policies/function permissions.

To pause delivery, deactivate the named job in Supabase Cron. In-app alerts and Settings will keep working; queued jobs will wait. Queue records and frozen payloads contain notification content, so apply your project's retention policy to completed jobs and review failed jobs as needed.

## Validation performed

- Production React build passed; only the six pre-existing dashboard/context lint warnings remain.
- Local PostgreSQL checks cover preference isolation, category validation, channel independence, no history backfill, browser permission restrictions, actual event-trigger integration, duplicate events, atomic claims, retry backoff, stale leases, frozen payloads, and retry expiry.
- Mocked email-worker checks cover authentication, configuration failures, verified recipients, opt-out rechecks, HTML escaping, safe app links, provider idempotency, timeouts, rate limits, permanent failures, and failed acknowledgements.
- Browser checks cover desktop/mobile layout, persistence, bulk email switches, load/save errors, and links from both modes and Notifications.

References: [Supabase scheduled Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions), [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart), [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email), [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
