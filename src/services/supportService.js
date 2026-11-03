import { formatServiceResponse, requireSupabase } from "./backendServiceUtils";

const DEFAULT_ERROR = "We couldn’t confirm your request was sent. Your message is still here; please try again later.";
const messages = {
  VISIT_LIMIT: "You’ve reached the limit of 3 support requests for this visit.",
  RATE_LIMIT: "Too many support requests have been submitted. Please wait up to an hour before trying again.",
  IN_PROGRESS: "Your request is still being processed. Please wait two minutes before retrying.",
  REVIEW_REQUIRED: "This request needs a delivery check. Keep its reference and email support directly.",
  CONFLICT: "This request changed. Edit your message and try again.",
  NOT_CONFIGURED: "Support is temporarily unavailable. Your message is still here; please try again later.",
};

export const supportService = {
  async send(fields, { requestId, visitId }) {
    const { supabase, error } = requireSupabase();
    if (error) return formatServiceResponse(null, { message: messages.NOT_CONFIGURED });
    try {
      const result = await supabase.functions.invoke("send-support-request", {
        body: { request_id: requestId, visit_id: visitId, topic: fields.topic,
          name: fields.name, email: fields.email, reference: fields.reference,
          subject: fields.subject, message: fields.message, website: fields.website || "" },
      });
      if (result.error) {
        let detail = {};
        try {
          const response = result.error.context?.clone?.() || result.error.context;
          if (response?.json) detail = await response.json();
        } catch { /* Return a readable failure when the gateway did not return JSON. */ }
        const reference = /^ST-\d+$/.test(detail.reference || "") ? detail.reference : "";
        return formatServiceResponse(null, { code: detail.code || "SEND_FAILED", reference,
          message: messages[detail.code] || DEFAULT_ERROR });
      }
      if (!result.data?.ok || !/^ST-\d+$/.test(result.data.reference || "")) {
        return formatServiceResponse(null, { message: DEFAULT_ERROR });
      }
      return formatServiceResponse({ reference: result.data.reference, visitCount: result.data.visitCount });
    } catch {
      return formatServiceResponse(null, { message: DEFAULT_ERROR });
    }
  },
};
