-- Storet Backend Phase 4: optional demo listing seed data
-- Run this only if you want the Explore page to have demo backend listings immediately.
-- The demo listings will be owned by the first profile in your Storet profiles table.

DO $$
DECLARE
  seed_host_id uuid;
  seed_host_name text;
BEGIN
  SELECT id, NULLIF(full_name, '')
  INTO seed_host_id, seed_host_name
  FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 1;

  IF seed_host_id IS NULL THEN
    RAISE EXCEPTION 'No Storet profiles found. Create/sign up for a Storet account first, then rerun this seed file.';
  END IF;

  seed_host_name := COALESCE(seed_host_name, 'Storet Demo Host');

  INSERT INTO public.listings (
    id,
    host_id,
    title,
    location,
    distance_label,
    daily_rate,
    monthly_rate,
    yearly_rate,
    sqft,
    storage_type,
    listing_type,
    access,
    booking_mode,
    availability_status,
    status,
    host_display_name,
    description,
    tags,
    amenities,
    average_rating,
    review_count,
    created_at
  )
  VALUES
    (
      '11111111-1111-4111-8111-111111111111'::uuid,
      seed_host_id,
      'Oakley Garage Space',
      'Oakley, Cincinnati, OH',
      '6 miles away',
      10,
      85,
      900,
      120,
      'Garage',
      'Private host',
      'By appointment',
      'instant',
      'available',
      'active',
      seed_host_name,
      'Clean indoor garage space for boxes, bikes, dorm items, seasonal storage, and small furniture.',
      ARRAY['Indoor', 'Private', 'Instant book'],
      ARRAY['Indoor space', 'Private access', 'Flexible monthly rental'],
      4.9,
      18,
      '2026-04-15T14:00:00.000Z'::timestamptz
    ),
    (
      '22222222-2222-4222-8222-222222222222'::uuid,
      seed_host_id,
      'Clifton Basement Corner',
      'Clifton, Cincinnati, OH',
      '2 miles away',
      8,
      55,
      NULL,
      75,
      'Basement',
      'Private host',
      'Weekly access',
      'waitlist',
      'waitlist',
      'active',
      seed_host_name,
      'Affordable basement storage close to campus and apartment-heavy neighborhoods.',
      ARRAY['Budget', 'Student friendly', 'Waitlist'],
      ARRAY['Student friendly', 'Budget pricing', 'Short-term friendly'],
      4.7,
      11,
      '2026-04-18T16:30:00.000Z'::timestamptz
    ),
    (
      '33333333-3333-4333-8333-333333333333'::uuid,
      seed_host_id,
      'Downtown Storage Locker',
      'Downtown Cincinnati, OH',
      '4 miles away',
      NULL,
      110,
      1180,
      100,
      'Storage unit',
      'Commercial',
      'Daily access',
      'instant',
      'available',
      'active',
      seed_host_name,
      'Traditional storage-style locker with flexible monthly availability.',
      ARRAY['Commercial', 'Daily access', 'Secure'],
      ARRAY['Daily access', 'Secure facility', 'Commercial partner'],
      4.8,
      32,
      '2026-04-21T18:45:00.000Z'::timestamptz
    ),
    (
      '44444444-4444-4444-8444-444444444444'::uuid,
      seed_host_id,
      'Mason Spare Room Storage',
      'Mason, OH',
      '18 miles away',
      12,
      70,
      760,
      90,
      'Spare room',
      'Private host',
      'By appointment',
      'request',
      'available',
      'active',
      seed_host_name,
      'Climate-friendly spare room space for bins, seasonal items, and dorm storage.',
      ARRAY['Climate friendly', 'Residential', 'Flexible'],
      ARRAY['Residential space', 'Flexible access', 'Good for bins'],
      4.6,
      9,
      '2026-04-24T20:15:00.000Z'::timestamptz
    )
  ON CONFLICT (id) DO UPDATE SET
    host_id = EXCLUDED.host_id,
    title = EXCLUDED.title,
    location = EXCLUDED.location,
    distance_label = EXCLUDED.distance_label,
    daily_rate = EXCLUDED.daily_rate,
    monthly_rate = EXCLUDED.monthly_rate,
    yearly_rate = EXCLUDED.yearly_rate,
    sqft = EXCLUDED.sqft,
    storage_type = EXCLUDED.storage_type,
    listing_type = EXCLUDED.listing_type,
    access = EXCLUDED.access,
    booking_mode = EXCLUDED.booking_mode,
    availability_status = EXCLUDED.availability_status,
    status = EXCLUDED.status,
    host_display_name = EXCLUDED.host_display_name,
    description = EXCLUDED.description,
    tags = EXCLUDED.tags,
    amenities = EXCLUDED.amenities,
    average_rating = EXCLUDED.average_rating,
    review_count = EXCLUDED.review_count,
    updated_at = now();
END $$;
