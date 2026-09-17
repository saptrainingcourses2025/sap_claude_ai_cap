const jwt = require('jsonwebtoken');

const ACCESS_TTL = process.env.AUTH_ACCESS_TTL || '15m';
const REFRESH_TTL = process.env.AUTH_REFRESH_TTL || '7d';

let devSecret;

function secret() {
  if (process.env.AUTH_JWT_SECRET) return process.env.AUTH_JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_JWT_SECRET must be set in production');
  }
  if (!devSecret) {
    devSecret = require('crypto').randomBytes(32).toString('hex');
    console.warn('[auth] AUTH_JWT_SECRET not set — using a random secret for this process only.');
  }
  return devSecret;
}

// only the "15m" / "7d" / "30s" shapes used by AUTH_ACCESS_TTL / AUTH_REFRESH_TTL
function ttlSeconds(ttl) {
  const m = /^(\d+)([smhd])$/.exec(ttl);
  if (!m) return Number(ttl);
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[m[2]];
  return Number(m[1]) * multiplier;
}

function ttlFor(kind) {
  return kind === 'refresh' ? REFRESH_TTL : ACCESS_TTL;
}

function sign(payload, kind) {
  return jwt.sign(payload, secret(), { expiresIn: ttlFor(kind), audience: kind });
}

function verify(token, kind) {
  return jwt.verify(token, secret(), { audience: kind });
}

module.exports = {
  sign,
  verify,
  expiresIn: (kind) => ttlSeconds(ttlFor(kind)),
};
