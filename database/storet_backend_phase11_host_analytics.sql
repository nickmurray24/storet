-- Storet Backend Phase 11
-- Host analytics RPC function for the Host Dashboard.
-- Run this file in Supabase SQL Editor.

create or replace function public.get_host_dashboard_analytics()
returns jsonb
language sql
security definer
set search_path = public
as $$
with host_listings as (
  select *
  from public.listings
  where host_id = auth.uid()
),
host_bookings as (
  select *
  from public.booking_requests
  where host_id = auth.uid()
),
host_messages as (
  select *
  from public.host_messages
  where host_id = auth.uid()
),
host_payments as (
  select *
  from public.payment_records
  where host_id = auth.uid()
),
paid_payments as (
  select *
  from host_payments
  where status = 'Paid'
),
listing_saved_counts as (
  select
    sl.listing_id,
    count(*)::integer as saved_count
  from public.saved_listings sl
  join host_listings hl on hl.id = sl.listing_id
  group by sl.listing_id
),
listing_request_counts as (
  select
    listing_id,
    count(*)::integer as total_requests,
    count(*) filter (where status = 'Pending')::integer as pending,
    count(*) filter (where status = 'Waitlisted')::integer as waitlisted,
    count(*) filter (where status = 'Approved')::integer as approved,
    count(*) filter (where status = 'Confirmed')::integer as confirmed,
    count(*) filter (where status = 'Active')::integer as active,
    count(*) filter (where status = 'Completed')::integer as completed,
    count(*) filter (where status = 'Cancelled')::integer as cancelled
  from host_bookings
  group by listing_id
),
listing_message_counts as (
  select
    listing_id,
    count(*)::integer as message_count,
    count(*) filter (where status = 'Unread')::integer as unread_messages
  from host_messages
  group by listing_id
),
listing_payment_totals as (
  select
    listing_id,
    coalesce(sum(amount_cents), 0)::bigint as paid_revenue_cents,
    count(*)::integer as paid_payment_count
  from paid_payments
  group by listing_id
),
listing_rows as (
  select
    hl.id,
    hl.title,
    hl.location,
    hl.status,
    hl.listing_type,
    coalesce(hl.average_rating, 0) as average_rating,
    coalesce(hl.review_count, 0) as review_count,
    coalesce(lsc.saved_count, 0) as saved_count,
    coalesce(lrc.total_requests, 0) as total_requests,
    coalesce(lrc.pending, 0) as pending,
    coalesce(lrc.waitlisted, 0) as waitlisted,
    coalesce(lrc.approved, 0) as approved,
    coalesce(lrc.confirmed, 0) as confirmed,
    coalesce(lrc.active, 0) as active,
    coalesce(lrc.completed, 0) as completed,
    coalesce(lrc.cancelled, 0) as cancelled,
    coalesce(lmc.message_count, 0) as message_count,
    coalesce(lmc.unread_messages, 0) as unread_messages,
    coalesce(lpt.paid_revenue_cents, 0) as paid_revenue_cents
  from host_listings hl
  left join listing_saved_counts lsc on lsc.listing_id = hl.id
  left join listing_request_counts lrc on lrc.listing_id = hl.id
  left join listing_message_counts lmc on lmc.listing_id = hl.id
  left join listing_payment_totals lpt on lpt.listing_id = hl.id
),
summary as (
  select
    count(*)::integer as hosted_listings,
    count(*) filter (where status = 'active')::integer as active_listings,
    count(*) filter (where status = 'paused')::integer as paused_listings,
    coalesce(sum(saved_count), 0)::integer as saved_listings,
    coalesce(avg(nullif(average_rating, 0)), 0) as average_rating,
    coalesce(sum(review_count), 0)::integer as review_count
  from listing_rows
),
booking_summary as (
  select
    count(*)::integer as total_requests,
    count(*) filter (where status = 'Pending')::integer as pending_requests,
    count(*) filter (where status = 'Waitlisted')::integer as waitlisted_requests,
    count(*) filter (where status = 'Approved')::integer as approved_requests,
    count(*) filter (where status = 'Confirmed')::integer as confirmed_bookings,
    count(*) filter (where status = 'Active')::integer as active_bookings,
    count(*) filter (where status = 'Completed')::integer as completed_bookings,
    count(*) filter (where status = 'Cancelled')::integer as cancelled_bookings
  from host_bookings
),
message_summary as (
  select
    count(*)::integer as total_messages,
    count(*) filter (where status = 'Unread')::integer as unread_messages
  from host_messages
),
payment_summary as (
  select
    coalesce(sum(amount_cents), 0)::bigint as gross_revenue_cents,
    count(*)::integer as paid_payment_count
  from paid_payments
),
status_breakdown as (
  select
    status,
    count(*)::integer as count
  from host_bookings
  group by status
),
month_series as (
  select generate_series(
    date_trunc('month', now()) - interval '5 months',
    date_trunc('month', now()),
    interval '1 month'
  )::date as month_start
),
monthly_revenue as (
  select
    ms.month_start,
    to_char(ms.month_start, 'YYYY-MM') as month,
    to_char(ms.month_start, 'Mon YYYY') as label,
    coalesce(sum(pp.amount_cents), 0)::bigint as revenue_cents,
    count(pp.id)::integer as payment_count,
    count(distinct pp.booking_request_id)::integer as booking_count
  from month_series ms
  left join paid_payments pp
    on date_trunc('month', pp.paid_at)::date = ms.month_start
  group by ms.month_start
  order by ms.month_start
)
select jsonb_build_object(
  'summary', jsonb_build_object(
    'hostedListings', coalesce(s.hosted_listings, 0),
    'activeListings', coalesce(s.active_listings, 0),
    'pausedListings', coalesce(s.paused_listings, 0),
    'savedListings', coalesce(s.saved_listings, 0),
    'averageRating', round(coalesce(s.average_rating, 0)::numeric, 2),
    'reviewCount', coalesce(s.review_count, 0),
    'totalRequests', coalesce(bs.total_requests, 0),
    'pendingRequests', coalesce(bs.pending_requests, 0),
    'waitlistedRequests', coalesce(bs.waitlisted_requests, 0),
    'approvedRequests', coalesce(bs.approved_requests, 0),
    'confirmedBookings', coalesce(bs.confirmed_bookings, 0),
    'activeBookings', coalesce(bs.active_bookings, 0),
    'completedBookings', coalesce(bs.completed_bookings, 0),
    'cancelledBookings', coalesce(bs.cancelled_bookings, 0),
    'totalMessages', coalesce(ms.total_messages, 0),
    'unreadMessages', coalesce(ms.unread_messages, 0),
    'grossRevenueCents', coalesce(ps.gross_revenue_cents, 0),
    'grossRevenue', round((coalesce(ps.gross_revenue_cents, 0)::numeric / 100), 2),
    'paidPaymentCount', coalesce(ps.paid_payment_count, 0),
    'conversionRate', case
      when coalesce(bs.total_requests, 0) = 0 then 0
      else round(((coalesce(bs.approved_requests, 0) + coalesce(bs.confirmed_bookings, 0) + coalesce(bs.active_bookings, 0) + coalesce(bs.completed_bookings, 0))::numeric / bs.total_requests::numeric) * 100, 1)
    end,
    'actionNeededCount', coalesce(bs.pending_requests, 0) + coalesce(bs.waitlisted_requests, 0) + coalesce(ms.unread_messages, 0) + coalesce(s.paused_listings, 0)
  ),
  'listingAnalytics', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'listingId', lr.id,
        'title', lr.title,
        'location', lr.location,
        'status', lr.status,
        'listingType', lr.listing_type,
        'averageRating', round(lr.average_rating::numeric, 2),
        'reviewCount', lr.review_count,
        'savedCount', lr.saved_count,
        'totalRequests', lr.total_requests,
        'pending', lr.pending,
        'waitlisted', lr.waitlisted,
        'approved', lr.approved,
        'confirmed', lr.confirmed,
        'active', lr.active,
        'completed', lr.completed,
        'cancelled', lr.cancelled,
        'messageCount', lr.message_count,
        'unreadMessages', lr.unread_messages,
        'paidRevenueCents', lr.paid_revenue_cents,
        'paidRevenue', round((lr.paid_revenue_cents::numeric / 100), 2)
      )
      order by lr.paid_revenue_cents desc, lr.total_requests desc, lr.average_rating desc
    )
    from listing_rows lr
  ), '[]'::jsonb),
  'monthlyRevenue', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'month', mr.month,
        'label', mr.label,
        'revenueCents', mr.revenue_cents,
        'revenue', round((mr.revenue_cents::numeric / 100), 2),
        'paymentCount', mr.payment_count,
        'bookingCount', mr.booking_count
      )
      order by mr.month_start
    )
    from monthly_revenue mr
  ), '[]'::jsonb),
  'statusBreakdown', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'status', sb.status,
        'count', sb.count
      )
      order by sb.status
    )
    from status_breakdown sb
  ), '[]'::jsonb),
  'refreshedAt', now()
)
from summary s
cross join booking_summary bs
cross join message_summary ms
cross join payment_summary ps;
$$;

grant execute on function public.get_host_dashboard_analytics() to authenticated;
