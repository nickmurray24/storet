import {
  mapAppPaymentToDatabasePayment,
  mapDatabasePaymentToAppPayment,
} from "./backendMappers";
import { formatServiceResponse, requireSupabase } from "./backendServiceUtils";
import { PAYMENT_STATUSES } from "../constants/appEnums";

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
      .select("*")
      .or(`renter_id.eq.${user.id},host_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (queryError) {
      return formatServiceResponse([], queryError);
    }

    return formatServiceResponse((data || []).map(mapDatabasePaymentToAppPayment));
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
      .select("*")
      .single();

    if (insertError) {
      return formatServiceResponse(null, insertError);
    }

    return formatServiceResponse(mapDatabasePaymentToAppPayment(data));
  },
};
