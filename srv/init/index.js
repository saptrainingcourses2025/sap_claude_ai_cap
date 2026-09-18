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

    // Auto-provisioning a default admin is a dev/demo convenience. In
    // production it must be an explicit opt-in (SEED_DEFAULT_ADMIN=true),
    // not silent behavior on every first boot against a fresh DB.
    const isProduction = cds.env.profiles.includes('production');
    if (!isProduction || process.env.SEED_DEFAULT_ADMIN === 'true') {
      await ensureDefaultAdmin();
    } else {
      LOG.info('Skipping default admin creation in production (set SEED_DEFAULT_ADMIN=true to opt in)');
    }
  } catch (err) {
    LOG.error('Startup initialization failed', err);
  }
};
