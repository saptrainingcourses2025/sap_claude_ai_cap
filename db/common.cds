/**
 * common.cds
 *
 * Reusable types, code lists, and type definitions shared across
 * the Travel Management data model.
 *
 * This file is the single source of truth for reusable artifacts.
 * Business entities should import from this file rather than
 * redefining these types.
 */
namespace anubhav.claude;

using { sap.common.CodeList } from '@sap/cds/common';

@readonly
@cds.autoexpose
entity AddressTypes : CodeList {
  key code : String(1) @title: '{i18n>AddressTypeCode}';
}

@readonly
@cds.autoexpose
entity TravellerStatus : CodeList {
  key code : String(1) @title: '{i18n>TravellerStatusCode}';
}

@readonly
@cds.autoexpose
entity TravellerTypes : CodeList {
  key code : String(2) @title: '{i18n>TravellerTypeCode}';
}

type AddressType   : Association to AddressTypes;
type Status        : Association to TravellerStatus;
type TravellerType : Association to TravellerTypes;
