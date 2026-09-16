/**
 * schema.cds
 *
 * Business entities for the Vacation & Traveller Management application.
 * Reusable types and code lists live in ./common.cds.
 */
namespace anubhav.claude;

using { cuid, managed, Currency } from '@sap/cds/common';
using { anubhav.claude as common } from './common';

entity Destinations : cuid {
  address    : String(255) @title: '{i18n>Address}';
  city       : String(40)  @title: '{i18n>City}';
  postalCode : String(8)   @title: '{i18n>PostalCode}';
  country    : String(40)  @title: '{i18n>Country}';
  traveller  : Association to Travellers @title: '{i18n>Traveller}';
}

entity Travellers : cuid, managed {
  userName  : String(255) @mandatory @title: '{i18n>UserName}';
  firstName : String(255) @title: '{i18n>FirstName}';
  lastName  : String(255) @title: '{i18n>LastName}';
  contacts  : Composition of many Contacts on contacts.traveller = $self @title: '{i18n>Contacts}';
  gender    : String(10) @title: '{i18n>Gender}';
  age       : Integer @title: '{i18n>Age}';
  status    : common.Status default 'A' @title: '{i18n>Status}';
  createdBy : String(40) @title: '{i18n>CreatedBy}';
  address   : Composition of Destinations @title: '{i18n>Address}';
  vacations : Composition of many Vacations on vacations.traveller = $self @title: '{i18n>Vacations}';
}

annotate Travellers with {
  modifiedAt @odata.etag;
}

entity Contacts : cuid {
  type      : common.AddressType @title: '{i18n>ContactType}';
  address   : String(255) @title: '{i18n>Address}';
  traveller : Association to Travellers @title: '{i18n>Traveller}';
}

entity Vacations : cuid {
  name        : String(255) @title: '{i18n>Name}';
  budget      : Decimal(10,2) @title: '{i18n>Budget}';
  currency    : Currency @title: '{i18n>Currency}';
  description : String(1024) @title: '{i18n>Description}';
  startsAt    : DateTime @title: '{i18n>StartsAt}';
  endsAt      : DateTime @title: '{i18n>EndsAt}';
  traveller   : Association to Travellers @title: '{i18n>Traveller}';
}

entity AppUsers : cuid, managed {
  userName    : String(100) @mandatory @title: '{i18n>UserName}';
  email       : String(255) @mandatory @title: '{i18n>Email}';
  fullName    : String(255) @title: '{i18n>FullName}';
  role        : common.Role @title: '{i18n>Role}';
  isActive    : Boolean default true @title: '{i18n>IsActive}';
  lastLoginAt : DateTime @title: '{i18n>LastLoginAt}';
  traveller   : Association to Travellers @title: '{i18n>Traveller}';
}
