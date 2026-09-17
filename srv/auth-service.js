module.exports = (srv) => {
  require('./handlers/auth.handler')(srv);
};
