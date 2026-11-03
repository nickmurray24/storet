import { normalizeSupportEmail } from "../utils/supportUtils";

// This is a public contact address, never a Gmail password or API key.
// The backend recipient is configured separately; frontend values never choose where a request is sent.
export const SUPPORT_EMAIL = normalizeSupportEmail(process.env.REACT_APP_SUPPORT_EMAIL) || "storet.support@gmail.com";
