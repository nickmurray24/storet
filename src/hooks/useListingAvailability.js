import { useCallback, useEffect, useRef, useState } from "react";
import { listingAvailabilityService, availabilityError } from "../services/listingAvailabilityService";
export default function useListingAvailability(listingId, bookings = []) {
  const [state, setState] = useState({ ranges: [], loading: true, error: "" });
  const version = useRef(0);
  const bookingKey = JSON.stringify(bookings.map(b => [b.id, b.listingId, b.status, b.moveInDate, b.moveOutDate]));
  const refresh = useCallback(async () => {
    if (!listingId) return;
    const current = ++version.current;
    setState(s => ({ ...s, loading: true, error: "" }));
    try {
      const result = await listingAvailabilityService.getRanges(listingId, bookings);
      if (current === version.current) setState({ ranges: result.data || [], loading: false, error: result.error ? availabilityError(result.error) : "" });
    } catch (error) {
      if (current === version.current) setState({ ranges: [], loading: false, error: availabilityError(error) });
    }
    // Only availability-relevant fields should refetch the calendar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, bookingKey]);
  useEffect(() => {
    refresh();
    const focus = () => refresh(); window.addEventListener("focus", focus);
    // This ref is a request generation counter, not a DOM ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { version.current++; window.removeEventListener("focus", focus); };
  }, [refresh]);
  return { ...state, refresh };
}
