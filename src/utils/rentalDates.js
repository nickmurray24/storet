// Date-only arithmetic stays in UTC so daylight saving changes cannot change the quote.
export const RATE_DAYS = { daily: 1, weekly: 7, monthly: 30, yearly: 365 };
export const HOLD_STATUSES = ["Approved", "Confirmed", "Active"];
export const isBackendListingId = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function isDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function rentalDays(start, end) {
  return isDateKey(start) && isDateKey(end) ? (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000 : 0;
}
export function hasBookingDates(booking) { return rentalDays(booking?.moveInDate, booking?.moveOutDate) > 0; }
export function addDateDays(key, days) {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}
export function addCalendarMonth(key) {
  const d = new Date(`${key}T00:00:00Z`), day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last)); return d.toISOString().slice(0, 10);
}
export function rangesOverlap(start, end, range) {
  return (!range.endDate || start < range.endDate) && (!range.startDate || end > range.startDate);
}
export function bookingRanges(bookings = [], listingId) {
  return bookings.filter(b => String(b.listingId) === String(listingId) && HOLD_STATUSES.includes(b.status))
    .map(b => ({ startDate: hasBookingDates(b) ? b.moveInDate : null, endDate: hasBookingDates(b) ? b.moveOutDate : null,
      kind: "booked", bookingId: b.id }));
}
export function quoteRental({ start, end, amount, period, today = todayKey() }) {
  if (!isDateKey(start) || !isDateKey(end)) return { error: "Choose a move-in date and a move-out date." };
  const days = rentalDays(start, end);
  if (days <= 0) return { error: "Move-out must be after move-in." };
  if (start < today) return { error: "Move-in cannot be in the past." };
  if (!RATE_DAYS[period] || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return { error: "Choose an available rate." };
  const cents = Math.round(Math.round(Number(amount) * 100) * days / RATE_DAYS[period]);
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > 2147481747) return { error: "Choose a rental period with a valid total." };
  return { days, cents, total: cents / 100, basis: RATE_DAYS[period], error: "" };
}
export function validateRentalAvailability(start, end, ranges = [], ignoreBookingId) {
  return ranges.some(r => (!ignoreBookingId || r.bookingId !== ignoreBookingId) && rangesOverlap(start, end, r))
    ? "These dates include reserved or host-blocked days. Choose another range." : "";
}
export const formatRentalMoney = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
