module.exports = (srv) => {
  const { Destinations } = srv.entities;

  srv.before('CREATE', Destinations, async (req) => {
    const { name } = req.data;
    if (!name) return;

    const existing = await SELECT.one.from(Destinations).where({ name });
    if (existing) return req.error(409, 'Destination with this name already exists');
  });

  // Destinations are an immutable master list: Create+Read are open, but
  // Update/Delete must be rejected. Neither @readonly (blocks Create too)
  // nor @insertonly (blocks Read too) matches this exact combination, so
  // it's enforced explicitly here instead.
  srv.before('UPDATE', Destinations, (req) => {
    req.reject(405, 'Destinations are immutable once created');
  });

  srv.before('DELETE', Destinations, (req) => {
    req.reject(405, 'Destinations are immutable once created');
  });
};
