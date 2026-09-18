const cds = require('@sap/cds');
const password = require('../auth/password');

async function audit(action, details) {
  try {
    const auditLog = await cds.connect.to('audit-log');
    if (auditLog?.log) await auditLog.log(action, details);
  } catch {
    // audit logging is best-effort and must never block a write operation
  }
}

function validatePassword(req, value) {
  if (!value || !value.trim()) {
    req.error(400, 'Password must not be empty');
    return false;
  }
  if (value.length < 8) {
    req.error(400, 'Password must be at least 8 characters');
    return false;
  }
  return true;
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
    const { firstName, lastName, email, roleId, initialPassword } = req.data;

    if (!validatePassword(req, initialPassword)) return;

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

    const passwordHash = await password.hash(initialPassword);
    await INSERT.into('anubhav.claude.UserCredentials').entries({ user_ID: userID, passwordHash, failedAttempts: 0 });
    await INSERT.into(UserRoles).entries({ user_ID: userID, role_ID: role.ID });
    await audit('createUser', { userId: userID, roleId: role.ID });

    if (req.http) req.http.res.status(201);
    return SELECT.one.from(Users).where({ ID: userID });
  });

  srv.on('resetPassword', async (req) => {
    const { userId, newPassword } = req.data;

    if (!validatePassword(req, newPassword)) return;

    const user = await SELECT.one.from(Users).where({ ID: userId });
    if (!user) return req.error(404, 'User not found');

    const passwordHash = await password.hash(newPassword);
    const creds = await SELECT.one.from('anubhav.claude.UserCredentials').where({ user_ID: userId });
    if (creds) {
      await UPDATE('anubhav.claude.UserCredentials').set({ passwordHash, failedAttempts: 0 }).where({ ID: creds.ID });
    } else {
      await INSERT.into('anubhav.claude.UserCredentials').entries({ user_ID: userId, passwordHash, failedAttempts: 0 });
    }

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
