const cds = require('@sap/cds');
const password = require('../auth/password');

const ADMIN_EMAIL = 'anubhav@anubhavtrainings.com';
const ADMIN_PASSWORD = 'Welcome1!';

module.exports = async function ensureDefaultAdmin() {
  const LOG = cds.log('init');
  const db = await cds.connect.to('db');

  const existing = await db.run(SELECT.one.from('anubhav.claude.Users').where({ loginName: ADMIN_EMAIL }));
  if (existing) return;

  const adminRole = await db.run(SELECT.one.from('anubhav.claude.Roles').where({ code: 'ADMIN' }));
  if (!adminRole) {
    LOG.warn('ADMIN role not found — skipping default admin user creation');
    return;
  }

  const created = await db.run(
    INSERT.into('anubhav.claude.Users').entries({
      firstName: 'Anubhav',
      lastName: 'Admin',
      loginName: ADMIN_EMAIL,
      isLocked: false
    })
  );
  const userID = created?.ID ?? (await db.run(SELECT.one.from('anubhav.claude.Users').where({ loginName: ADMIN_EMAIL }))).ID;

  const passwordHash = await password.hash(ADMIN_PASSWORD);
  await db.run(INSERT.into('anubhav.claude.UserCredentials').entries({ user_ID: userID, passwordHash, failedAttempts: 0 }));
  await db.run(INSERT.into('anubhav.claude.UserRoles').entries({ user_ID: userID, role_ID: adminRole.ID }));

  LOG.info(`Created default admin user ${ADMIN_EMAIL}`);
};
