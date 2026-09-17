using { anubhav.claude as db } from '../db/schema';
using { anubhav.claude as common } from '../db/common';

service CatalogService @(
  path     : 'catalog',
  requires : 'authenticated-user'
) {

  // CREATE is granted broadly to every authenticated user: ownership for
  // non-admins is enforced in srv/handlers/travellers.handler.js (which
  // force-sets userID to the caller's own id before insert), since a
  // where-clause on CREATE would be checked against client-submitted data
  // rather than the enforced value. READ/UPDATE are row-filtered here so
  // a non-admin only ever sees/touches their own record.
  @restrict: [
    { grant: 'CREATE', to: 'authenticated-user' },
    { grant: ['READ', 'UPDATE'], to: 'ADMIN' },
    { grant: ['READ', 'UPDATE'], to: 'authenticated-user', where: 'userID = $user' }
  ]
  entity Travellers         as projection on db.Travellers;
 
  // CREATE/DELETE are granted broadly for the same reason as Travellers.CREATE
  // above: ownership for non-admins is enforced in
  // srv/handlers/travelled-locations.handler.js, which resolves a non-owner's
  // CREATE/DELETE to 404 (traveller/record "not found") rather than the 403 a
  // where-clause would produce for a mutating event. READ is row-filtered here.
  @restrict: [
    { grant: ['CREATE', 'DELETE'], to: 'authenticated-user' },
    { grant: 'READ', to: 'ADMIN' },
    { grant: 'READ', to: 'authenticated-user', where: 'traveller.userID = $user' }
  ]
  entity TravelledLocations as projection on db.TravelledLocations;

  entity Destinations       as projection on db.Destinations;

  entity TravellerTypes  as projection on common.TravellerTypes;
  entity TravellerStatus as projection on common.TravellerStatus;
  entity AddressTypes    as projection on common.AddressTypes;
}


