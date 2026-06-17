import {
  AVAILABILITY_STATUSES,
  BOOKING_MODES,
  LISTING_STATUSES,
  LISTING_TYPES,
  PAYMENT_STATUSES,
  PRICING_PERIODS,
  USER_ROLES,
} from "../constants/appEnums";

export const MODEL_PREFIXES = {
  USER: "user",
  LISTING: "listing",
  BOOKING: "booking",
  PAYMENT: "payment",
  HOST_MESSAGE: "host-message",
  REVIEW: "review",
};

export const DEFAULT_USER_PROFILE = {
  id: "demo-user",
  fullName: "Demo User",
  email: "demo@storet.com",
  role: USER_ROLES.RENTER,
  isAuthenticated: true,
};

export const DEFAULT_LISTING_MODEL = {
  id: "",
  title: "Storage space",
  location: "Cincinnati, OH",
  distance: "Nearby",
  price: 75,
  pricePeriod: PRICING_PERIODS.MONTHLY,
  priceLabel: "Monthly",
  priceDisplay: "$75/mo",
  pricing: {
    [PRICING_PERIODS.DAILY]: null,
    [PRICING_PERIODS.MONTHLY]: 75,
    [PRICING_PERIODS.YEARLY]: null,
  },
  sqft: 100,
  storageType: "Storage space",
  listingType: LISTING_TYPES.PRIVATE_HOST,
  access: "Flexible access",
  rating: 4.8,
  reviews: 0,
  instantBook: false,
  waitlist: false,
  bookingMode: BOOKING_MODES.REQUEST,
  availabilityStatus: AVAILABILITY_STATUSES.AVAILABLE,
  status: LISTING_STATUSES.ACTIVE,
  host: "Storet Host",
  hostId: "",
  hostEmail: "",
  ownerId: "",
  ownerEmail: "",
  createdBy: "",
  description: "Flexible local storage space for short-term or long-term needs.",
  tags: [],
  amenities: ["Flexible rental", "Local storage", "Host managed"],
  images: [],
  imageUrl: "",
  coverImageUrl: "",
  createdAt: "",
  updatedAt: "",
};

export const DEFAULT_BOOKING_REQUEST_MODEL = {
  id: "",
  listingId: "",
  listingTitle: "Storage space",
  listingLocation: "",
  listingPrice: 0,
  ratePeriod: PRICING_PERIODS.MONTHLY,
  rateLabel: "Monthly",
  rateDisplay: "$0/mo",
  pricingSnapshot: {
    [PRICING_PERIODS.DAILY]: null,
    [PRICING_PERIODS.MONTHLY]: null,
    [PRICING_PERIODS.YEARLY]: null,
  },
  hostName: "Storet Host",
  hostId: "",
  hostEmail: "",
  renterName: "Demo User",
  renterEmail: "",
  renterId: "",
  requesterName: "Demo User",
  requesterEmail: "",
  submittedAt: "",
  moveInDate: "Not selected",
  moveOutDate: "Not selected",
  duration: "Month-to-month",
  notes: "",
  status: "Pending",
  createdAt: "",
  updatedAt: "",
  approvedAt: null,
  waitlistedAt: null,
  declinedAt: null,
  confirmedAt: null,
  activatedAt: null,
  completedAt: null,
  cancelledAt: null,
  paymentRecordId: null,
};

export const DEFAULT_PAYMENT_RECORD_MODEL = {
  id: "",
  requestId: "",
  listingId: "",
  listingTitle: "Storage space",
  hostName: "Storet Host",
  hostId: "",
  hostEmail: "",
  renterName: "Demo User",
  renterEmail: "",
  renterId: "",
  cardholderName: "Demo User",
  billingZip: "",
  last4: "0000",
  cardBrand: "Card",
  stripeCheckoutSessionId: "",
  stripePaymentIntentId: "",
  storageCharge: 0,
  ratePeriod: PRICING_PERIODS.MONTHLY,
  rateLabel: "Monthly",
  rateDisplay: "$0/mo",
  serviceFee: 0,
  amount: 0,
  status: PAYMENT_STATUSES.PAID,
  receiptNumber: "",
  paidAt: "",
  createdAt: "",
  updatedAt: "",
};

export const DEFAULT_HOST_MESSAGE_MODEL = {
  id: "",
  listingId: "",
  listingTitle: "Storage space",
  listingLocation: "",
  hostName: "Storet Host",
  hostId: "",
  hostEmail: "",
  senderName: "Demo User",
  senderEmail: "",
  senderId: "",
  subject: "Listing question",
  message: "",
  status: "Unread",
  submittedAt: "",
  createdAt: "",
  updatedAt: "",
  readAt: null,
};

export function createModelId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getIsoTimestamp(value, fallbackValue = new Date().toISOString()) {
  if (!value) {
    return fallbackValue;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallbackValue : date.toISOString();
}

export function normalizeUserProfile(user = {}) {
  if (!user) {
    return null;
  }

  const email = user.email || "";

  return {
    ...DEFAULT_USER_PROFILE,
    ...user,
    id: String(user.id || user.userId || email || DEFAULT_USER_PROFILE.id),
    fullName: user.fullName || user.name || DEFAULT_USER_PROFILE.fullName,
    email,
    role: user.role || DEFAULT_USER_PROFILE.role,
    isAuthenticated: Boolean(user.isAuthenticated),
  };
}
