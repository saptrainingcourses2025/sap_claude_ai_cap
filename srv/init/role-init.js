const cds = require('@sap/cds');

const REQUIRED_ROLES = [
  { code: 'ADMIN', name: 'Administrator', descr: 'Full system access' },
  { code: 'AGENT', name: 'Travel Agent', descr: 'Agent access for managing travellers' },
  { code: 'TRAVELLER', name: 'Traveller', descr: 'Self-service traveller access' }
];

module.exports = async function ensureRoles() {
  const LOG = cds.log('init');
  const db = await cds.connect.to('db');

  for (const role of REQUIRED_ROLES) {
    const existing = await db.run(SELECT.one.from('anubhav.claude.Roles').where({ code: role.code }));
    if (existing) continue;

    await db.run(INSERT.into('anubhav.claude.Roles').entries(role));
    LOG.info(`Created role ${role.code}`);
  }
};
