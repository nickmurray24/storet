-- READ ONLY. Run before 01/02 on a database with existing reservations.
-- Query 1: overlapping Approved/Confirmed/Active rows. 02 will stop rather than
-- discard a reservation if any of these pairs exists. Review real bookings and
-- resolve their lifecycle/payment state before retrying; never delete paid data.
with holds as (
  select id,listing_id,listing_title,status,move_in_date,move_out_date,
    daterange(case when move_out_date>move_in_date then move_in_date end,
              case when move_out_date>move_in_date then move_out_date end,'[)') as held_dates
  from public.booking_requests where status in ('Approved','Confirmed','Active')
)
select a.listing_id,a.listing_title,a.id as booking_a,a.status as status_a,
  a.move_in_date as move_in_a,a.move_out_date as move_out_a,
  b.id as booking_b,b.status as status_b,b.move_in_date as move_in_b,b.move_out_date as move_out_b
from holds a join holds b on a.listing_id=b.listing_id and a.id<b.id and a.held_dates && b.held_dates;

-- Query 2: legacy holds with missing/invalid dates. A single undated hold is
-- supported and stays blocked for all dates until resolved. No dates are invented.
select id,listing_id,listing_title,status,move_in_date,move_out_date
from public.booking_requests
where status in ('Approved','Confirmed','Active')
  and (move_in_date is null or move_out_date is null or move_out_date<=move_in_date);

-- Query 3: undated Pending/Waitlisted requests must be cancelled and resubmitted
-- with dates before a host can approve them after this update.
select id,listing_id,listing_title,status,move_in_date,move_out_date
from public.booking_requests
where status in ('Pending','Waitlisted')
  and (move_in_date is null or move_out_date is null or move_out_date<=move_in_date);
