const cds = require('@sap/cds');

async function audit(action, details) {
  try {
    const auditLog = await cds.connect.to('audit-log');
    if (auditLog?.log) await auditLog.log(action, details);
  } catch {
    // audit logging is best-effort and must never block a write operation
  }
}

module.exports = (srv) => {
  const { Users, Roles, UserRoles } = srv.entities;

  srv.on('lockUser', async (req) => {
    const user = await SELECT.one.from(Users).where({ ID: req.data.userId });
    if (!user) return req.error(404, 'User not found');
    if (user.isLocked) return false;

    await UPDATE(Users).set({ isLocked: true }).where({ ID: user.ID });
    await audit('lockUser', { userId: user.ID });
    return true;
  });

  srv.on('unlockUser', async (req) => {
    const user = await SELECT.one.from(Users).where({ ID: req.data.userId });
    if (!user) return req.error(404, 'User not found');
    if (!user.isLocked) return false;

    await UPDATE(Users).set({ isLocked: false }).where({ ID: user.ID });
    await audit('unlockUser', { userId: user.ID });
    return true;
  });

  srv.on('createUser', async (req) => {
    const { firstName, lastName, email, roleId } = req.data;

    const role = await SELECT.one.from(Roles).where({ ID: roleId });
    if (!role) return req.error(404, 'Role not found');

    const existing = await SELECT.one.from(Users).where({ loginName: email });
    if (existing) return req.error(409, 'User already exists');

    const created = await INSERT.into(Users).entries({
      firstName,
      lastName,
      loginName: email,
      isLocked: false
    });
    const userID = created?.ID ?? (await SELECT.one.from(Users).where({ loginName: email })).ID;

    await INSERT.into(UserRoles).entries({ user_ID: userID, role_ID: role.ID });
    await audit('createUser', { userId: userID, roleId: role.ID });

    if (req.http) req.http.res.status(201);
    return SELECT.one.from(Users).where({ ID: userID });
  });

  srv.on('resetPassword', async (req) => {
    const { userId, newPassword } = req.data;

    if (!newPassword || !newPassword.trim()) {
      return req.error(400, 'Password must not be empty');
    }
    if (newPassword.length < 8) {
      return req.error(400, 'Password must be at least 8 characters');
    }

    const user = await SELECT.one.from(Users).where({ ID: userId });
    if (!user) return req.error(404, 'User not found');

    await audit('resetPassword', { userId: user.ID });
    return true;
  });

  srv.on('assignRole', async (req) => {
    const { userId, roleId } = req.data;

    const role = await SELECT.one.from(Roles).where({ ID: roleId });
    if (!role) return req.error(404, 'Role not found');

    const user = await SELECT.one.from(Users).where({ ID: userId });
    if (!user) return req.error(404, 'User not found');

    const existing = await SELECT.one.from(UserRoles).where({ user_ID: userId, role_ID: roleId });
    if (!existing) {
      await INSERT.into(UserRoles).entries({ user_ID: userId, role_ID: roleId });
    }

    await audit('assignRole', { userId, roleId });
    return true;
  });

  srv.on('unassignRole', async (req) => {
    const { userId, roleId } = req.data;

    const existing = await SELECT.one.from(UserRoles).where({ user_ID: userId, role_ID: roleId });
    if (!existing) return req.error(404, 'Role assignment not found');

    await DELETE.from(UserRoles).where({ ID: existing.ID });
    await audit('unassignRole', { userId, roleId });
    return true;
  });
};
