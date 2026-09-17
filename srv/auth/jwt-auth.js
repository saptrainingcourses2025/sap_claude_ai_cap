const cds = require('@sap/cds');
const jwt = require('./jwt');

/**
 * CAP custom auth implementation (cds.requires.auth.impl).
 * Populates req.user from a Bearer access token; roles are always
 * reloaded from the DB (never trusted from the token) so a role
 * change or lock takes effect on the very next request.
 */
module.exports = async function jwt_auth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.match(/^bearer /i)) {
    req.user = cds.User.anonymous;
    return next();
  }

  let decoded;
  try {
    decoded = jwt.verify(auth.slice(7), 'access');
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }

  try {
    const user = await loadUser(decoded.sub);
    const ctx = cds.context;
    ctx.user = req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

async function loadUser(userId) {
  const db = await cds.connect.to('db');

  const userRoles = await db.run(
    SELECT.from('anubhav.claude.UserRoles').columns('role_ID').where({ user_ID: userId })
  );
  const roleIds = userRoles.map((r) => r.role_ID);

  const roles = roleIds.length
    ? (await db.run(SELECT.from('anubhav.claude.Roles').columns('code').where({ ID: roleIds }))).map((r) => r.code)
    : [];

  return new cds.User({ id: userId, roles });
}
