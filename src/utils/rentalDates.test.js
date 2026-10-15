import { addCalendarMonth, bookingRanges, hasBookingDates, isDateKey, quoteRental, rentalDays, validateRentalAvailability } from "./rentalDates";
import { normalizeListing } from "./listingUtils";
import { createBookingRequest } from "./bookingUtils";
import { normalizePricing, getAvailablePricingOptions, getMonthlyEquivalentAmount } from "./pricingUtils";
import { mapAppListingToDatabaseListing, mapDatabaseListingToAppListing, mapAppBookingToDatabaseBooking, mapDatabaseBookingToAppBooking } from "../services/backendMappers";
const today = "2026-10-15";
const quote = (start, end, amount, period) => quoteRental({ start, end, amount, period, today });
test.each([
  ["2030-01-01", "2030-01-08", 70, "weekly", 70],
  ["2030-01-01", "2030-01-11", 70, "weekly", 100],
  ["2030-01-01", "2030-01-11", 85, "monthly", 28.33],
  ["2030-01-01", "2030-01-02", 900, "yearly", 2.47],
  ["2030-01-01", "2030-01-04", 12.99, "daily", 38.97],
  ["2030-01-01", "2031-01-01", 900, "yearly", 900],
])("quote %s to %s at %s/%s = %s", (start,end,amount,period,total) => { expect(quote(start,end,amount,period).total).toBe(total); });
test("date-only arithmetic handles DST and leap days", () => {
  expect(rentalDays("2030-03-09", "2030-03-12")).toBe(3);
  expect(rentalDays("2028-02-28", "2028-03-01")).toBe(2);
  expect(rentalDays("2030-11-02", "2030-11-05")).toBe(3);
  expect(addCalendarMonth("2028-01-31")).toBe("2028-02-29");
  expect(addCalendarMonth("2030-01-31")).toBe("2030-02-28");
});
test.each([["", "2030-01-08"], ["2030-02-30", "2030-03-05"], ["2030-01-08", "2030-01-08"], ["2030-01-08", "2030-01-01"], ["2020-01-01", "2020-01-02"]])("reject invalid date range %s to %s", (start,end) => expect(quote(start,end,70,"weekly").error).toBeTruthy());
test("rounding never charges zero or overflows Stripe integer storage", () => {
  expect(quote("2030-01-01","2030-01-02",0.01,"yearly").error).toBeTruthy();
  expect(quote("2030-01-01","2031-01-01",99999999,"daily").error).toBeTruthy();
});
test("exclusive move-out permits adjacent reservations and catches middle-day blocks", () => {
  const ranges=[{startDate:"2030-01-08",endDate:"2030-01-15"}];
  expect(validateRentalAvailability("2030-01-01","2030-01-08",ranges)).toBe("");
  expect(validateRentalAvailability("2030-01-15","2030-01-20",ranges)).toBe("");
  expect(validateRentalAvailability("2030-01-01","2030-01-20",ranges)).toBeTruthy();
});
test("legacy undated holds block all dates; pending and waitlisted never hold", () => {
  const ranges=bookingRanges([{listingId:"x",id:"a",status:"Approved"},{listingId:"x",id:"b",status:"Pending"},{listingId:"x",id:"c",status:"Waitlisted"}],"x");
  expect(ranges).toHaveLength(1);expect(hasBookingDates({})).toBe(false);
  expect(validateRentalAvailability("2030-01-01","2030-01-08",ranges)).toBeTruthy();
  expect(validateRentalAvailability("2030-01-01","2030-01-08",ranges,"a")).toBe("");
});
test("weekly-only listing survives normalization and database round trip", () => {
  const listing = normalizeListing({id:"weekly-only",pricing:{weekly:70}});
  expect(normalizeListing(listing).pricing.monthly).toBeNull();
  expect(mapAppListingToDatabaseListing(listing).monthly_rate).toBeNull();
  const pricing=normalizePricing({weekly:70});expect(getAvailablePricingOptions(pricing).map(r=>r.period)).toEqual(["weekly"]);
  expect(getMonthlyEquivalentAmount(pricing)).toBe(300);
  const db=mapAppListingToDatabaseListing({pricing});expect(db.weekly_rate).toBe(70);
  expect(mapDatabaseListingToAppListing(db).pricing.weekly).toBe(70);
});
test("booking carries date quote into backend mapper without replacing the unit rate", () => {
  const booking=createBookingRequest({listing:{id:"x",title:"Weekly garage",pricing:{weekly:70},hostId:"host"},currentUser:{id:"renter"},requestData:{moveInDate:"2030-01-01",moveOutDate:"2030-01-11",ratePeriod:"weekly"}});
  expect(booking.listingPrice).toBe(70);expect(booking.storageTotal).toBe(100);expect(booking.rentalDays).toBe(10);
  const mapped=mapDatabaseBookingToAppBooking(mapAppBookingToDatabaseBooking(booking));
  expect(mapped.storageTotal).toBe(100);expect(mapped.moveOutDate).toBe("2030-01-11");
});
test("date validator rejects timestamps and impossible dates",()=>{
  expect(isDateKey("2030-01-01T00:00:00Z")).toBe(false);expect(isDateKey("2030-02-29")).toBe(false);expect(isDateKey("2028-02-29")).toBe(true);
});
