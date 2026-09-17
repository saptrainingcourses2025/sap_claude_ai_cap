const cds = require('@sap/cds');

cds.on('bootstrap', (app) => {
  app.use(require('@cap-js-community/odata-v2-adapter')());
});

module.exports = cds.server;
