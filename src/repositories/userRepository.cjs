const { config } = require('../security.cjs');

const users = config.users;

function findByUsername(username) {
  return users.find((u) => u.username === username) || null;
}

module.exports = { findByUsername };
