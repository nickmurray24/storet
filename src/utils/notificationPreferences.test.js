import { normalizeNotificationPreferences, preferenceRows } from "./notificationPreferences";

test("missing categories default on while explicit channel opt-outs survive database loading", () => {
  const preferences = normalizeNotificationPreferences([{ category: "message", in_app: false, email: false }]);
  expect(preferences.message).toEqual({ inApp: false, email: false });
  expect(preferences.booking).toEqual({ inApp: true, email: true });
  expect(Object.keys(preferences)).toHaveLength(8);
});

test("saving preserves independently selected channels and only supported categories", () => {
  const preferences = { message: { inApp: false, email: true }, payment: { inApp: true, email: false }, unknown: { inApp: false, email: false } };
  const rows = preferenceRows(preferences, "signed-in-user");
  expect(rows).toHaveLength(8);
  expect(rows.every(row => row.user_id === "signed-in-user")).toBe(true);
  expect(rows.find(row => row.category === "message")).toEqual({ user_id: "signed-in-user", category: "message", in_app: false, email: true });
  expect(normalizeNotificationPreferences(rows).payment).toEqual({ inApp: true, email: false });
  expect(rows.some(row => row.category === "unknown")).toBe(false);
});
