import { getTypedAddressUnit, mapMapboxAddressFeatureToListingAddress } from "./addressUtils";
import { mapAppListingToDatabaseListing, mapDatabaseListingToAppListing } from "../services/backendMappers";

test.each([
  ["123 Main St Apt 4B", "123 Main Street", "Apt 4B"],
  ["123 Main St, Apartment 42", "123 Main St", "Apartment 42"],
  ["123 Main St Suite 200, Cincinnati, OH 45227", "123 Main Street", "Suite 200"],
  ["123 Main St Ste. 2-A", "123 Main Street", "Ste. 2-A"],
  ["123 Main St Unit B", "123 Main St", "Unit B"],
  ["123 Main St #4B", "123 Main Street", "#4B"],
  ["Apt 4B, 123 Main St", "123 Main Street", "Apt 4B"],
  ["123 W Main St Apt #4B", "123 West Main Street", "Apt #4B"],
  ["123 Unit Road Apt 4", "123 Unit Rd", "Apt 4"],
  ["123 Main St Apt 4B", "125 Main Street", ""],
  ["123 Main St Apt 4B", "123 Other Street", ""],
  ["123 Main St 45227", "123 Main St", ""],
  ["123 Main St 4B", "123 Main St", ""],
  ["123 Unit Road", "123 Unit Road", ""],
  ["123 Main St Apt 4B", "", ""],
])("explicit unit from %s for %s is %s", (input,street,unit) => {
  expect(getTypedAddressUnit(input,street)).toBe(unit);
});
const feature = { id: "address.test", address: "123", text: "Main St", place_name: "123 Main St, Cincinnati, Ohio 45227",
  center: [-84.512,39.103], context: [{id:"place.test",text:"Cincinnati"},{id:"region.test",short_code:"US-OH"},{id:"postcode.test",text:"45227"}] };
test("address result preserves a provided second address line",()=>{
  const address=mapMapboxAddressFeatureToListingAddress({...feature,properties:{address_line2:"Suite 200"}});
  expect(address.addressLine2).toBe("Suite 200");expect(address.addressLine1).toBe("123 Main St");expect(address.addressVerified).toBe(true);
});
test("structured unit metadata is copied when provided",()=>{
  const address=mapMapboxAddressFeatureToListingAddress({...feature,properties:{context:{secondary_address:{designator:"UNIT",identifier:"12B"}}}});
  expect(address.addressLine2).toBe("UNIT 12B");
});
test("secondary-line mapping preserves changes and explicit clearing",()=>{
  for(const value of ["Apartment 123B", "Garage behind house, west door", ""]){
    const db=mapAppListingToDatabaseListing({addressLine2:value});expect(db.address_line2).toBe(value);
    expect(mapDatabaseListingToAppListing(db).addressLine2).toBe(value);
  }
});
