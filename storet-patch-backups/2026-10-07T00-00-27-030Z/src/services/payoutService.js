import { mapDatabaseProfileToAppUser } from "./backendMappers";
import { createServiceError, formatServiceResponse, requireSupabase } from "./backendServiceUtils";


async function getFunctionErrorMessage(functionError, fallbackMessage) {
  if (!functionError) {
    return fallbackMessage;
  }

  const context = functionError.context;

  if (context) {
    try {
      const response = typeof context.clone === "function" ? context.clone() : context;
      const body = await response.json();

      if (typeof body?.error === "string" && body.error.trim()) {
        return body.error;
      }

      if (typeof body?.message === "string" && body.message.trim()) {
        return body.message;
      }
    } catch (jsonError) {
      try {
        const response = typeof context.clone === "function" ? context.clone() : context;
        const text = await response.text();

        if (text?.trim()) {
          return text.trim();
        }
      } catch (textError) {
        // Fall through to the Supabase error message below.
      }
    }
  }

  return functionError.message || fallbackMessage;
}

function formatFunctionError(functionError, fallbackMessage) {
  return getFunctionErrorMessage(functionError, fallbackMessage).then((message) =>
    formatServiceResponse(null, createServiceError(message, { originalError: functionError }))
  );
}

function normalizeProfileResponse(data) {
  const profile = data?.profile || data?.user || null;

  return {
    ...(data || {}),
    user: profile ? mapDatabaseProfileToAppUser(profile, { isAuthenticated: true }) : null,
  };
}

export const payoutService = {
  async createConnectAccountLink({ returnPath, refreshPath } = {}) {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const { data, error: functionError } = await supabase.functions.invoke(
      "create-connect-account-link",
      {
        body: {
          returnPath,
          refreshPath,
        },
      }
    );

    if (functionError) {
      return formatFunctionError(functionError, "Could not start payout setup.");
    }

    if (data?.error) {
      return formatServiceResponse(null, createServiceError(data.error));
    }

    return formatServiceResponse(normalizeProfileResponse(data));
  },

  async refreshConnectAccountStatus() {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const { data, error: functionError } = await supabase.functions.invoke(
      "refresh-connect-account-status",
      { body: {} }
    );

    if (functionError) {
      return formatFunctionError(functionError, "Could not refresh payout setup status.");
    }

    if (data?.error) {
      return formatServiceResponse(null, createServiceError(data.error));
    }

    return formatServiceResponse(normalizeProfileResponse(data));
  },
};
