import { PAYMENT_STATUSES } from "../constants/appEnums";
import { DEFAULT_PAYMENT_RECORD_MODEL, getIsoTimestamp } from "../models/storetModels";
import { formatRate } from "./pricingUtils";

export function normalizePaymentRecord(payment = {}, index = 0) {
  const now = new Date().toISOString();
  const createdAt = getIsoTimestamp(payment.createdAt || payment.paidAt, now);
  const paidAt = payment.paidAt ? getIsoTimestamp(payment.paidAt, createdAt) : createdAt;
  const storageCharge = Number(payment.storageCharge || 0);
  const ratePeriod = payment.ratePeriod || DEFAULT_PAYMENT_RECORD_MODEL.ratePeriod;

  return {
    ...DEFAULT_PAYMENT_RECORD_MODEL,
    ...payment,
    id: String(payment.id || `payment-${index + 1}`),
    requestId: String(payment.requestId || ""),
    listingId: String(payment.listingId || ""),
    listingTitle: payment.listingTitle || DEFAULT_PAYMENT_RECORD_MODEL.listingTitle,
    hostName: payment.hostName || DEFAULT_PAYMENT_RECORD_MODEL.hostName,
    hostId: String(payment.hostId || ""),
    hostEmail: payment.hostEmail || "",
    renterName: payment.renterName || DEFAULT_PAYMENT_RECORD_MODEL.renterName,
    renterEmail: payment.renterEmail || "",
    renterId: String(payment.renterId || payment.renterEmail || ""),
    cardholderName: payment.cardholderName || payment.renterName || DEFAULT_PAYMENT_RECORD_MODEL.cardholderName,
    billingZip: payment.billingZip || "",
    last4: payment.last4 || DEFAULT_PAYMENT_RECORD_MODEL.last4,
    cardBrand: payment.cardBrand || DEFAULT_PAYMENT_RECORD_MODEL.cardBrand,
    stripeCheckoutSessionId: payment.stripeCheckoutSessionId || "",
    stripePaymentIntentId: payment.stripePaymentIntentId || "",
    storageCharge,
    ratePeriod,
    rateLabel: payment.rateLabel || DEFAULT_PAYMENT_RECORD_MODEL.rateLabel,
    rateDisplay: payment.rateDisplay || formatRate(storageCharge, ratePeriod),
    serviceFee: Number(payment.serviceFee || 0),
    amount: Number(payment.amount || payment.totalAmount || 0),
    status: payment.status || PAYMENT_STATUSES.PAID,
    receiptNumber: payment.receiptNumber || `ST-${Date.now().toString().slice(-8)}`,
    paidAt,
    createdAt,
    updatedAt: getIsoTimestamp(payment.updatedAt || paidAt, paidAt),
  };
}

export function normalizePaymentRecordList(payments) {
  const safePayments = Array.isArray(payments) ? payments : [];
  const seenIds = new Set();

  return safePayments.map(normalizePaymentRecord).filter((payment) => {
    if (!payment.id || seenIds.has(payment.id)) {
      return false;
    }

    seenIds.add(payment.id);
    return true;
  });
}
