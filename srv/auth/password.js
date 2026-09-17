const bcrypt = require('bcryptjs');

const ROUNDS = 10;

module.exports = {
  hash: (plain) => bcrypt.hash(plain, ROUNDS),
  compare: (plain, hash) => bcrypt.compare(plain, hash),
};
