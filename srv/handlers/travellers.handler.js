module.exports = (srv) => {
  const { Travellers } = srv.entities;

  srv.before('CREATE', Travellers, async (req) => {
    const { firstName, lastName, email } = req.data;

    if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
      return req.error(400, 'First name and last name are required');
    }

    if (!req.user.is('Admin')) {
      req.data.userID = req.user.id;
    }

    if (email) {
      const existing = await SELECT.one.from(Travellers).where({ email });
      if (existing) return req.error(409, 'Email already registered');
    }
  });

  srv.before('UPDATE', Travellers, (req) => {
    if (req.data.fullName !== undefined) {
      return req.error(400, 'fullName is computed and cannot be updated');
    }
  });

  srv.after('READ', Travellers, (data) => {
    if (Array.isArray(data)) data.forEach(enrichFullName);
    else enrichFullName(data);
  });
};

const enrichFullName = (d) => {
  if (d) d.fullName = `${d.firstName || ''} ${d.lastName || ''}`.trim();
};
