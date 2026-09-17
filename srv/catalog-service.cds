using { anubhav.claude as db } from '../db/schema';
using { anubhav.claude as common } from '../db/common';

@requires: 'authenticated-user'
service CatalogService @(path: 'catalog') {

  entity Travellers         as projection on db.Travellers;
  entity TravelledLocations as projection on db.TravelledLocations;
  entity Destinations       as projection on db.Destinations;

  entity TravellerTypes  as projection on common.TravellerTypes;
  entity TravellerStatus as projection on common.TravellerStatus;
  entity AddressTypes    as projection on common.AddressTypes;
}

// Travellers: Admin has full access to all rows. Traveller role is
// row-filtered to its own record (userID = $user). CREATE is granted
// to Traveller as well (per spec 2.1/3.1), even though a where-clause
// cannot scope an INSERT — ownership on CREATE is enforced instead in
// srv/handlers/travellers.handler.js, which forces userID = $user for
// non-Admin callers.
annotate CatalogService.Travellers with @restrict: [
  { grant: ['READ','UPDATE','CREATE'], to: 'Traveller', where: 'userID = $user' },
  { grant: '*', to: 'Admin' }
];

// TravelledLocations: immutable travel log — Create/Read/Delete only,
// no Update. Traveller is row-filtered via the parent Travellers
// composition (traveller.userID = $user) for READ/CREATE. DELETE is
// granted broadly here and ownership is instead checked explicitly in
// srv/handlers/travelled-locations.handler.js, because @restrict's
// where-clause rejects a mismatched DELETE with a hard 403 rather than
// the 404 (row simply not found) the spec requires for this case.
annotate CatalogService.TravelledLocations with @restrict: [
  { grant: ['READ','CREATE'], to: 'Traveller', where: 'traveller.userID = $user' },
  { grant: 'DELETE', to: 'Traveller' },
  { grant: '*', to: 'Admin' }
];

// Destinations: master list, immutable once created. All CRUD ops are
// authorized here for any authenticated user; Update/Delete are then
// rejected with 405 (not 403) explicitly in
// srv/handlers/destinations.handler.js, since @restrict itself always
// denies with 403, not 405, for operations outside the grant list.
annotate CatalogService.Destinations with @restrict: [
  { grant: '*', to: 'authenticated-user' }
];

// Value helps: read-only for all authenticated users.
annotate CatalogService.TravellerTypes with @restrict: [
  { grant: 'READ', to: 'authenticated-user' }
];

annotate CatalogService.TravellerStatus with @restrict: [
  { grant: 'READ', to: 'authenticated-user' }
];

annotate CatalogService.AddressTypes with @restrict: [
  { grant: 'READ', to: 'authenticated-user' }
];
