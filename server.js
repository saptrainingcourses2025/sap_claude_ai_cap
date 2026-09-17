const cds = require('@sap/cds');
const runStartupInit = require('./srv/init');

cds.on('bootstrap', (app) => {
  app.use(require('@cap-js-community/odata-v2-adapter')());
});

// Seed required roles + the default admin user once the DB is connected,
// so a fresh deployment is immediately usable via /auth/login.
cds.on('served', runStartupInit);

module.exports = cds.server;
