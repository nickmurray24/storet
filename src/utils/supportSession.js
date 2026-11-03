export const SUPPORT_REQUESTS_PER_VISIT = 3;
const SESSION_KEY = "storet.support.visit.v1";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let memoryVisit;

export function createSupportId() {
  const secureCrypto = typeof window !== "undefined" ? window.crypto : undefined;
  if (secureCrypto?.randomUUID) return secureCrypto.randomUUID();
  if (!secureCrypto?.getRandomValues) return "";
  const bytes = secureCrypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function saveVisit(visit) {
  memoryVisit = visit;
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(visit)); } catch { /* Backend limits still apply when browser storage is blocked. */ }
  return visit;
}

export function getSupportVisit() {
  let candidate;
  try { candidate = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { /* Use a tab-local fallback. */ }
  if (candidate && uuidPattern.test(candidate.id) && Number.isInteger(candidate.count)
      && candidate.count >= 0 && candidate.count <= SUPPORT_REQUESTS_PER_VISIT && Array.isArray(candidate.sentIds)) {
    memoryVisit = { id: candidate.id, count: candidate.count, sentIds: candidate.sentIds.filter(id => uuidPattern.test(id)).slice(0, 3) };
  }
  return memoryVisit || saveVisit({ id: createSupportId(), count: 0, sentIds: [] });
}

export function recordSupportSent(visit, requestId, serverCount = 0) {
  const latest = getSupportVisit();
  const current = latest.id === visit.id ? latest : visit;
  const alreadyCounted = current.sentIds.includes(requestId);
  const sentIds = alreadyCounted ? current.sentIds : [...current.sentIds, requestId].slice(-3);
  const reportedCount = Number.isInteger(serverCount) ? serverCount : 0;
  return saveVisit({ id: visit.id, sentIds, count: Math.min(SUPPORT_REQUESTS_PER_VISIT, Math.max(current.count + (alreadyCounted ? 0 : 1), reportedCount)) });
}

export function markSupportVisitLimited(visit) {
  return saveVisit({ ...visit, count: SUPPORT_REQUESTS_PER_VISIT });
}
