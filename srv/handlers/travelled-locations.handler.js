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

    if (!req.user.is('Admin')) {
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
    if (req.user.is('Admin')) return;

    const id = req.data.ID;
    const owned = await SELECT.one.from(TravelledLocations)
      .where({ ID: id, 'traveller.userID': req.user.id });
    if (!owned) return req.error(404, 'TravelledLocations not found');
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
