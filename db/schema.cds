namespace anubhav.claude;

using { sap.common.CodeList }        from '@sap/cds/common';
using { cuid, managed, Currency }    from '@sap/cds/common';

entity AddressTypes : CodeList {
  key code : String(1);
}

entity TravellerStatus : CodeList {
  key code : String(1);
}

type AddressType : Association to AddressTypes;
type Status      : Association to TravellerStatus;

entity Destinations : cuid {
  address    : String(255);
  city       : String(40);
  postalCode : String(8);
  country    : String(40);
  traveller  : Association to Travellers;
}

entity Travellers : cuid, managed {
  userName  : String(255) @mandatory;
  firstName : String(255);
  lastName  : String(255);
  contacts  : Composition of many Contacts on contacts.traveller = $self;
  gender    : String(10);
  age       : Integer;
  status    : Status default 'A';
  createdBy : String(40);
  address   : Composition of Destinations;
  vacations : Composition of many Vacations on vacations.traveller = $self;
}

annotate Travellers with {
  modifiedAt @odata.etag;
}

entity Contacts : cuid {
  type      : AddressType;
  address   : String(255);
  traveller : Association to Travellers;
}

entity Vacations : cuid {
  name        : String(255);
  budget      : Decimal(10,2);
  currency    : Currency;
  description : String(1024);
  startsAt    : DateTime;
  endsAt      : DateTime;
  traveller   : Association to Travellers;
}
