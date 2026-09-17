/**
 * schema.cds
 *
 * Business entities for the Travel Management application.
 * Reusable types and code lists live in ./common.cds.
 */
namespace anubhav.claude;

using { cuid } from '@sap/cds/common';
using { anubhav.claude as common } from './common';

entity Destinations : cuid {
  name        : String(200)  @mandatory @title: '{i18n>DestinationName}';
  country     : String(100)  @mandatory @title: '{i18n>Country}';
  city        : String(100)  @mandatory @title: '{i18n>City}';
  region      : String(100)  @title: '{i18n>Region}';
  description : LargeString  @title: '{i18n>Description}';
}

annotate Destinations with @assert.unique: { name: [ name ] };

entity Travellers : cuid {
  firstName   : String(80)  @mandatory @title: '{i18n>FirstName}';
  lastName    : String(80)  @mandatory @title: '{i18n>LastName}';
  virtual fullName : String(160) @Core.Computed @title: '{i18n>FullName}';
  email       : String(120) @mandatory @title: '{i18n>Email}';
  phone       : String(20)  @title: '{i18n>Phone}';
  addressType : common.AddressType   @title: '{i18n>AddressType}';
  type        : common.TravellerType @mandatory @title: '{i18n>TravellerType}';
  status      : common.Status @mandatory default 'A' @title: '{i18n>Status}';
  userID      : String(100) @mandatory @title: '{i18n>UserID}';
  locations   : Composition of many TravelledLocations on locations.traveller = $self @title: '{i18n>Locations}';
  modifiedAt  : Timestamp @cds.on.update: $now @odata.etag @title: '{i18n>ModifiedAt}';
}

annotate Travellers with @assert.unique: { email: [ email ] };

entity TravelledLocations : cuid {
  traveller   : Association to Travellers @mandatory @title: '{i18n>Traveller}';
  destination : Association to Destinations @mandatory @title: '{i18n>Destination}';
  travelFrom  : Date @mandatory @title: '{i18n>TravelFrom}';
  travelTo    : Date @mandatory @title: '{i18n>TravelTo}';
  notes       : LargeString @title: '{i18n>Notes}';
}

entity Users : cuid {
  loginName : String(120) @mandatory @title: '{i18n>LoginName}';
  firstName : String(80)  @mandatory @title: '{i18n>FirstName}';
  lastName  : String(80)  @mandatory @title: '{i18n>LastName}';
  isLocked  : Boolean default false @title: '{i18n>IsLocked}';
  createdAt : Timestamp @cds.on.insert: $now @title: '{i18n>CreatedAt}';
  roles     : Composition of many UserRoles on roles.user = $self @title: '{i18n>UserRoles}';
}

annotate Users with @assert.unique: { loginName: [ loginName ] };

entity Roles : cuid {
  code  : String(10) @mandatory @title: '{i18n>RoleCode}';
  name  : String(80) @mandatory @title: '{i18n>RoleName}';
  descr : String(255) @title: '{i18n>RoleDescription}';
}

annotate Roles with @assert.unique: { code: [ code ] };

entity UserRoles : cuid {
  user : Association to Users @mandatory @title: '{i18n>User}';
  role : Association to Roles @mandatory @title: '{i18n>Role}';
}
