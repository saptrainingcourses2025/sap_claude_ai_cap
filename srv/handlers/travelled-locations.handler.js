module.exports = (srv) => {
  const { TravelledLocations, Travellers, Destinations } = srv.entities;

  srv.before('CREATE', TravelledLocations, async (req) => {
    const travellerID = req.data.traveller_ID || req.data.traveller?.ID;
    const destinationID = req.data.destination_ID || req.data.destination?.ID;
    const { travelFrom, travelTo } = req.data;

    if (!travelFrom || !travelTo) {
      return req.error(400, 'travelFrom and travelTo are required');
    }
    if (travelFrom > travelTo) {
      return req.error(400, 'Travel start date must be before end date');
    }

    if (destinationID) {
      const destination = await SELECT.one.from(Destinations).where({ ID: destinationID });
      if (!destination) return req.error(400, 'Destination does not exist');
    }

    if (!travellerID) return req.error(400, 'traveller is required');

    if (!req.user.is('ADMIN')) {
      const traveller = await SELECT.one.from(Travellers).where({ ID: travellerID, userID: req.user.id });
      if (!traveller) return req.error(404, 'Traveller not found');
    }

    const overlapping = await SELECT.one.from(TravelledLocations).where({
      traveller_ID: travellerID,
      travelFrom: { '<=': travelTo },
      travelTo: { '>=': travelFrom }
    });
    if (overlapping) {
      return req.error(409, 'Traveller already has a trip during this date range');
    }
  });

  // DELETE is granted broadly at the @restrict level (see
  // srv/catalog-service.cds); ownership is enforced here instead so a
  // non-owner's DELETE resolves to 404 (not found) rather than the 403
  // that @restrict's where-clause would produce for a mutating event.
  srv.before('DELETE', TravelledLocations, async (req) => {
    if (req.user.is('ADMIN')) return;

    const id = req.data.ID;
    const owned = await SELECT.one.from(TravelledLocations)
      .where({ ID: id, 'traveller.userID': req.user.id });
    if (!owned) return req.error(404, 'TravelledLocations not found');
  });

  // TravelledLocations is an immutable travel log: Create/Read/Delete are
  // granted (see @restrict in srv/catalog-service.cds), but Update is never
  // granted to any role, including Admin. Same rationale as the explicit
  // reject on Destinations — no CDS annotation matches this exact CRUD
  // combination, so it's enforced here to return 405 instead of a generic 403.
  srv.before('UPDATE', TravelledLocations, (req) => {
    req.reject(405, 'TravelledLocations are immutable once created');
  });

  srv.after('READ', TravelledLocations, (data) => {
    const rows = Array.isArray(data) ? data : [data];
    for (const d of rows) {
      if (d?.traveller) {
        d.traveller.fullName = `${d.traveller.firstName || ''} ${d.traveller.lastName || ''}`.trim();
      }
    }
  });
};
