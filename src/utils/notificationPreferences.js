export const NOTIFICATION_CATEGORIES = [
  { key: "booking", label: "Booking updates", description: "New requests, approvals, confirmations, and rental status changes." },
  { key: "waitlist", label: "Waitlist updates", description: "New waitlist requests and changes to your place on a waitlist." },
  { key: "message", label: "Messages", description: "New messages about your spaces or bookings." },
  { key: "payment", label: "Payments and receipts", description: "Payment confirmations and receipt updates." },
  { key: "review", label: "Reviews", description: "New reviews of your hosted spaces." },
  { key: "listing", label: "Your listings", description: "Updates about the spaces you list on Storet." },
  { key: "saved", label: "Saved spaces", description: "Updates related to spaces you save." },
  { key: "system", label: "General updates", description: "Other Storet activity and account updates in your notification feed." },
];
export function normalizeNotificationPreferences(rows = []) {
  return Object.fromEntries(NOTIFICATION_CATEGORIES.map(({ key }) => {
    const row = Array.isArray(rows) ? rows.find(r => r.category === key) : rows?.[key];
    return [key, { inApp: typeof (row?.in_app ?? row?.inApp) === "boolean" ? row.in_app ?? row.inApp : true,
      email: typeof row?.email === "boolean" ? row.email : true }];
  }));
}
export function preferenceRows(preferences, userId) {
  const normalized = normalizeNotificationPreferences(preferences);
  return NOTIFICATION_CATEGORIES.map(({ key }) => ({ user_id: userId, category: key,
    in_app: normalized[key].inApp, email: normalized[key].email }));
}
