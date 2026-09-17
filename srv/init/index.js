const cds = require('@sap/cds');
const ensureRoles = require('./role-init');
const ensureDefaultAdmin = require('./user-init');

// Runs once the DB service is up (see server.js `cds.on('served', ...)`).
// Skipped under the [test] profile so jest runs don't mutate the seeded
// fixtures that catalog/user-management tests rely on.
module.exports = async function runStartupInit() {
  if (cds.env.profiles.includes('test')) return;

  const LOG = cds.log('init');
  try {
    await ensureRoles();
    await ensureDefaultAdmin();
  } catch (err) {
    LOG.error('Startup initialization failed', err);
  }
};
