/**
 * common.cds
 *
 * Reusable types, code lists, and type definitions shared across
 * the Vacation & Traveller Management data model.
 *
 * This file is the single source of truth for reusable artifacts.
 * Business entities should import from this file rather than
 * redefining these types.
 */
namespace anubhav.claude;

using { sap.common.CodeList } from '@sap/cds/common';

entity AddressTypes : CodeList {
  key code : String(1) @title: '{i18n>AddressTypeCode}';
}

entity TravellerStatus : CodeList {
  key code : String(1) @title: '{i18n>TravellerStatusCode}';
}

entity Roles : CodeList {
  key code : String(10) @title: '{i18n>RoleCode}';
}

type AddressType : Association to AddressTypes;
type Status      : Association to TravellerStatus;
type Role        : Association to Roles;
