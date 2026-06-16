import { PRICING_PERIODS } from "../constants/appEnums";

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function integerOrNull(value) {
  const numberValue = numberOrNull(value);
  return numberValue === null ? null : Math.round(numberValue);
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function arrayOrUndefined(value) {
  return value === undefined ? undefined : arrayOrEmpty(value);
}

function hasAnyField(record = {}, fields = []) {
  return fields.some((field) => Object.prototype.hasOwnProperty.call(record, field));
}

function nullableNumberField(record = {}, fields = []) {
  if (!hasAnyField(record, fields)) {
    return undefined;
  }

  const firstPresentField = fields.find((field) =>
    Object.prototype.hasOwnProperty.call(record, field)
  );

  return numberOrNull(record[firstPresentField]);
}

function nullableIntegerField(record = {}, fields = []) {
  if (!hasAnyField(record, fields)) {
    return undefined;
  }

  const firstPresentField = fields.find((field) =>
    Object.prototype.hasOwnProperty.call(record, field)
  );

  return integerOrNull(record[firstPresentField]);
}

function getNestedProfile(row = {}) {
  if (row.profiles) {
    return Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  }

  if (row.host_profile) {
    return row.host_profile;
  }

  return null;
}

function omitUndefinedFields(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );
}

export function mapDatabaseProfileToAppUser(profile = {}, options = {}) {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    fullName: profile.full_name || profile.fullName || "Storet User",
    email: profile.email || options.email || "",
    role: profile.role || "Renter",
    isAuthenticated: options.isAuthenticated ?? true,
    createdAt: profile.created_at || profile.createdAt || "",
    updatedAt: profile.updated_at || profile.updatedAt || "",
  };
}

export function mapAppUserToDatabaseProfile(user = {}) {
  return omitUndefinedFields({
    id: user.id,
    full_name: user.fullName || user.name,
    email: user.email,
    role: user.role || "Renter",
    updated_at: new Date().toISOString(),
  });
}

export function mapDatabaseListingToAppListing(row = {}) {
  const hostProfile = getNestedProfile(row);
  const pricing = {
    [PRICING_PERIODS.DAILY]: numberOrNull(row.daily_rate),
    [PRICING_PERIODS.MONTHLY]: numberOrNull(row.monthly_rate),
    [PRICING_PERIODS.YEARLY]: numberOrNull(row.yearly_rate),
  };

  return {
    id: row.id,
    title: row.title,
    location: row.location,
    distance: row.distance_label || row.distance || "Nearby",
    distanceLabel: row.distance_label || row.distance || "Nearby",
    latitude: numberOrNull(row.latitude),
    longitude: numberOrNull(row.longitude),
    pricing,
    sqft: integerOrNull(row.sqft),
    storageType: row.storage_type,
    listingType: row.listing_type,
    access: row.access,
    bookingMode: row.booking_mode,
    availabilityStatus: row.availability_status,
    status: row.status,
    description: row.description,
    tags: arrayOrEmpty(row.tags),
    amenities: arrayOrEmpty(row.amenities),
    images: arrayOrEmpty(row.images),
    rating: numberOrNull(row.average_rating),
    averageRating: numberOrNull(row.average_rating),
    reviews: integerOrNull(row.review_count),
    reviewCount: integerOrNull(row.review_count),
    hostId: row.host_id,
    ownerId: row.host_id,
    createdBy: row.host_id,
    host: hostProfile?.full_name || row.host_display_name || "Storet Host",
    hostName: hostProfile?.full_name || row.host_display_name || "Storet Host",
    hostEmail: hostProfile?.email || "",
    ownerEmail: hostProfile?.email || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAppListingToDatabaseListing(listing = {}, options = {}) {
  const pricing = listing.pricing || {};
  const hasPricingFields =
    hasAnyField(listing, ["pricing"]) ||
    hasAnyField(pricing, [
      PRICING_PERIODS.DAILY,
      PRICING_PERIODS.MONTHLY,
      PRICING_PERIODS.YEARLY,
    ]) ||
    hasAnyField(listing, ["dailyRate", "monthlyRate", "yearlyRate", "price"]);

  return omitUndefinedFields({
    host_id: options.hostId || listing.hostId || listing.ownerId || listing.createdBy,
    title: listing.title,
    location: listing.location,
    distance_label: listing.distanceLabel || listing.distance,
    latitude: nullableNumberField(listing, ["latitude"]),
    longitude: nullableNumberField(listing, ["longitude"]),
    daily_rate: hasPricingFields
      ? numberOrNull(pricing[PRICING_PERIODS.DAILY] ?? listing.dailyRate)
      : undefined,
    monthly_rate: hasPricingFields
      ? numberOrNull(
          pricing[PRICING_PERIODS.MONTHLY] ?? listing.monthlyRate ?? listing.price
        )
      : undefined,
    yearly_rate: hasPricingFields
      ? numberOrNull(pricing[PRICING_PERIODS.YEARLY] ?? listing.yearlyRate)
      : undefined,
    sqft: nullableIntegerField(listing, [
      "sqft",
      "squareFeet",
      "sizeSqft",
      "squareFootage",
      "size",
    ]),
    storage_type: listing.storageType || listing.type,
    listing_type: listing.listingType,
    access: listing.access,
    booking_mode: listing.bookingMode,
    availability_status: listing.availabilityStatus,
    status: listing.status,
    description: listing.description,
    tags: arrayOrUndefined(listing.tags),
    amenities: arrayOrUndefined(listing.amenities),
    images: arrayOrUndefined(listing.images),
    host_display_name: listing.hostName || listing.host,
    average_rating: nullableNumberField(listing, ["averageRating", "rating"]),
    review_count: nullableIntegerField(listing, ["reviewCount", "reviews"]),
    updated_at: new Date().toISOString(),
  });
}

export function mapDatabaseSavedListingToAppId(row = {}) {
  return String(row.listing_id || row.listingId || "");
}

function dateOrNull(value) {
  if (!value || value === "Not selected") {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : value;
}

export function mapDatabaseBookingToAppBooking(row = {}) {
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    listingLocation: row.listing_location,
    listingPrice: numberOrNull(row.listing_price),
    ratePeriod: row.rate_period,
    rateLabel: row.rate_label,
    rateDisplay: row.rate_display,
    pricingSnapshot: row.pricing_snapshot || {},
    hostName: row.host_display_name,
    hostId: row.host_id,
    hostEmail: "",
    renterName: row.renter_display_name,
    renterEmail: "",
    renterId: row.renter_id,
    requesterName: row.renter_display_name,
    requesterEmail: "",
    moveInDate: row.move_in_date || "Not selected",
    moveOutDate: row.move_out_date || "Not selected",
    duration: row.duration,
    notes: row.notes,
    status: row.status,
    submittedAt: row.submitted_at || row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    waitlistedAt: row.waitlisted_at,
    declinedAt: row.declined_at,
    confirmedAt: row.confirmed_at,
    activatedAt: row.activated_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    paymentRecordId: row.payment_record_id || row.paymentRecordId || null,
  };
}

export function mapAppBookingToDatabaseBooking(booking = {}, options = {}) {
  return omitUndefinedFields({
    listing_id: booking.listingId,
    host_id: booking.hostId,
    renter_id: options.renterId || booking.renterId || booking.requesterId,
    listing_title: booking.listingTitle,
    listing_location: booking.listingLocation,
    listing_price: numberOrNull(booking.listingPrice),
    rate_period: booking.ratePeriod,
    rate_label: booking.rateLabel,
    rate_display: booking.rateDisplay,
    pricing_snapshot: booking.pricingSnapshot || {},
    host_display_name: booking.hostName,
    renter_display_name: booking.renterName || booking.requesterName,
    move_in_date: dateOrNull(booking.moveInDate),
    move_out_date: dateOrNull(booking.moveOutDate),
    duration: booking.duration,
    notes: booking.notes,
    status: booking.status,
    submitted_at: booking.submittedAt,
    approved_at: booking.approvedAt,
    waitlisted_at: booking.waitlistedAt,
    declined_at: booking.declinedAt,
    confirmed_at: booking.confirmedAt,
    activated_at: booking.activatedAt,
    completed_at: booking.completedAt,
    cancelled_at: booking.cancelledAt,
    updated_at: new Date().toISOString(),
  });
}

function centsToDollars(value) {
  const cents = integerOrNull(value);
  return cents === null ? null : cents / 100;
}

function dollarsToCents(value) {
  const dollars = numberOrNull(value);
  return dollars === null ? null : Math.round(dollars * 100);
}

export function mapDatabasePaymentToAppPayment(row = {}) {
  const booking = row.booking_request || row.bookingRequest || {};

  return {
    id: row.id,
    requestId: row.booking_request_id,
    listingId: row.listing_id,
    listingTitle: booking.listing_title || row.listing_title,
    listingLocation: booking.listing_location || row.listing_location,
    hostName: booking.host_display_name || row.host_display_name,
    hostId: row.host_id,
    hostEmail: row.host_email || "",
    renterName: booking.renter_display_name || row.renter_display_name,
    renterEmail: row.renter_email || "",
    renterId: row.renter_id,
    last4: row.display_last4,
    cardBrand: row.display_card_brand,
    storageCharge: centsToDollars(row.storage_charge_cents),
    ratePeriod: row.rate_period,
    rateLabel: row.rate_label,
    rateDisplay: row.rate_display,
    serviceFee: centsToDollars(row.service_fee_cents),
    amount: centsToDollars(row.amount_cents),
    amountCents: integerOrNull(row.amount_cents),
    serviceFeeCents: integerOrNull(row.service_fee_cents),
    currency: row.currency,
    status: row.status,
    receiptNumber: row.receipt_number,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAppPaymentToDatabasePayment(payment = {}, options = {}) {
  const storageChargeCents =
    integerOrNull(payment.storageChargeCents) ?? dollarsToCents(payment.storageCharge);
  const serviceFeeCents =
    integerOrNull(payment.serviceFeeCents) ?? dollarsToCents(payment.serviceFee);
  const amountCents = integerOrNull(payment.amountCents) ?? dollarsToCents(payment.amount);

  return omitUndefinedFields({
    booking_request_id: payment.requestId || payment.bookingRequestId,
    listing_id: payment.listingId,
    host_id: payment.hostId,
    renter_id: options.renterId || payment.renterId,
    stripe_checkout_session_id: payment.stripeCheckoutSessionId,
    stripe_payment_intent_id: payment.stripePaymentIntentId,
    display_card_brand: payment.cardBrand,
    display_last4: payment.last4,
    storage_charge_cents: storageChargeCents,
    service_fee_cents: serviceFeeCents,
    amount_cents: amountCents,
    currency: payment.currency || "usd",
    rate_period: payment.ratePeriod,
    rate_label: payment.rateLabel,
    rate_display: payment.rateDisplay,
    status: payment.status,
    receipt_number: payment.receiptNumber,
    paid_at: payment.paidAt,
    updated_at: new Date().toISOString(),
  });
}

export function mapDatabaseHostMessageToAppMessage(row = {}) {
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    listingLocation: row.listing_location,
    hostName: row.host_display_name,
    hostId: row.host_id,
    hostEmail: "",
    senderName: row.sender_display_name,
    senderEmail: "",
    senderId: row.sender_id,
    subject: row.subject,
    message: row.message,
    status: row.status,
    submittedAt: row.submitted_at || row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readAt: row.read_at,
  };
}

export function mapAppHostMessageToDatabaseMessage(message = {}, options = {}) {
  return omitUndefinedFields({
    listing_id: message.listingId,
    host_id: message.hostId,
    sender_id: options.senderId || message.senderId,
    listing_title: message.listingTitle,
    listing_location: message.listingLocation,
    host_display_name: message.hostName,
    sender_display_name: message.senderName,
    subject: message.subject,
    message: message.message,
    status: message.status,
    submitted_at: message.submittedAt,
    read_at: message.readAt,
    updated_at: new Date().toISOString(),
  });
}
