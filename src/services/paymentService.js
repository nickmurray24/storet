import {
  mapAppPaymentToDatabasePayment,
  mapDatabasePaymentToAppPayment,
} from "./backendMappers";
import { formatServiceResponse, requireSupabase } from "./backendServiceUtils";
import { PAYMENT_STATUSES } from "../constants/appEnums";
import { normalizePaymentRecord } from "../utils/paymentUtils";

const PAYMENT_WITH_BOOKING_SELECT = `
  *,
  booking_request:booking_requests!payment_records_booking_request_id_fkey(*)
`;

export const paymentService = {
  async getCurrentUserPaymentRecords() {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse([], error);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return formatServiceResponse([], userError);
    }

    const { data, error: queryError } = await supabase
      .from("payment_records")
      .select(PAYMENT_WITH_BOOKING_SELECT)
      .or(`renter_id.eq.${user.id},host_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (queryError) {
      return formatServiceResponse([], queryError);
    }

    return formatServiceResponse(
      (data || []).map((payment) =>
        normalizePaymentRecord(mapDatabasePaymentToAppPayment(payment))
      )
    );
  },

  async createMockPaymentRecord(payment) {
    const { supabase, error } = requireSupabase();

    if (error) {
      return formatServiceResponse(null, error);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return formatServiceResponse(null, userError);
    }

    const payload = mapAppPaymentToDatabasePayment(
      {
        ...payment,
        status: payment.status || PAYMENT_STATUSES.PAID,
      },
      { renterId: user.id }
    );

    const { data, error: insertError } = await supabase
      .from("payment_records")
      .insert(payload)
      .select(PAYMENT_WITH_BOOKING_SELECT)
      .single();

    if (insertError) {
      return formatServiceResponse(null, insertError);
    }

    return formatServiceResponse(
      normalizePaymentRecord(mapDatabasePaymentToAppPayment(data))
    );
  },
};
