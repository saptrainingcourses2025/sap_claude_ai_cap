module.exports = (srv) => {
  require('./handlers/travellers.handler')(srv);
  require('./handlers/travelled-locations.handler')(srv);
  require('./handlers/destinations.handler')(srv);
};
