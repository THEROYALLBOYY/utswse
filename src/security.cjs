const crypto = require('node:crypto');
const path = require('node:path');
const dotenv = require('dotenv');
const { HttpError } = require('./errors.cjs');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const sessions = new Map();
const failedLogins = new Map();

function digest(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function equalSecret(a, b) {
  const aa = crypto.createHash('sha256').update(String(a)).digest();
  const bb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(aa, bb);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}

function verifyPassword(password, salt, expectedHex) {
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

function readConfig() {
  const problems = [];
  const apiKey = process.env.API_KEY || '';
  const expiresIn = Number(process.env.TOKEN_EXPIRES_IN || 3600);
  const minExpiry = process.env.NODE_ENV === 'test' ? 1 : 60;

  if (apiKey.length < 12) problems.push('API_KEY wajib diisi minimal 12 karakter');
  if (!Number.isInteger(expiresIn) || expiresIn < minExpiry || expiresIn > 86400) {
    problems.push(`TOKEN_EXPIRES_IN harus bilangan bulat antara ${minExpiry} dan 86400 detik`);
  }

  const definitions = [
    { username: 'admin', password: process.env.ADMIN_PASSWORD, id: 'ADM001', role: 'admin' },
    { username: 'mhs001', password: process.env.MAHASISWA1_PASSWORD, id: 'MHS001', role: 'mahasiswa' },
    { username: 'mhs002', password: process.env.MAHASISWA2_PASSWORD, id: 'MHS002', role: 'mahasiswa' }
  ];

  const users = definitions.map((u) => {
    if (!u.password || u.password.length < 8) {
      problems.push(`password demo akun ${u.username} wajib diisi minimal 8 karakter`);
    }
    const { salt, hash } = hashPassword(u.password || crypto.randomBytes(12).toString('hex'));
    return { id: u.id, username: u.username, role: u.role, salt, hash };
  });

  if (problems.length) {
    throw new Error(`Konfigurasi .env tidak valid: ${problems.join('; ')}. Periksa .env di root proyek (lihat .env.example).`);
  }

  return {
    port: Number(process.env.PORT || 3000),
    nodeEnv: process.env.NODE_ENV || 'development',
    apiKey,
    expiresInSec: expiresIn,
    maxBodySize: '10kb',
    users
  };
}

const config = readConfig();

function publicUser(user) {
  return { id: user.id, username: user.username, role: user.role };
}

function checkApiKey(value) {
  if (!equalSecret(value || '', config.apiKey)) {
    throw new HttpError(401, 'API key tidak valid.', undefined, 'INVALID_API_KEY');
  }
}

function issueToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(digest(token), {
    userId: user.id,
    username: user.username,
    role: user.role,
    expiresAt: Date.now() + config.expiresInSec * 1000
  });
  return token;
}

function verifyToken(token) {
  const key = digest(token);
  const session = sessions.get(key);
  if (!session) throw new HttpError(401, 'Token tidak valid atau sudah tidak berlaku.', undefined, 'INVALID_TOKEN');
  if (session.expiresAt <= Date.now()) {
    sessions.delete(key);
    throw new HttpError(401, 'Token sudah kedaluwarsa.', undefined, 'TOKEN_EXPIRED');
  }
  return { id: session.userId, username: session.username, role: session.role };
}

function revokeToken(token) {
  return sessions.delete(digest(token));
}

function recordFailure(ip) {
  const now = Date.now();
  const prev = failedLogins.get(ip);
  const count = prev && prev.resetAt > now ? prev.count + 1 : 1;
  failedLogins.set(ip, { count, resetAt: now + 60 * 1000 });
  return count;
}

function isBlocked(ip) {
  const rec = failedLogins.get(ip);
  return Boolean(rec && rec.resetAt > Date.now() && rec.count >= 5);
}

function clearFailures(ip) { failedLogins.delete(ip); }

module.exports = {
  config, digest, equalSecret, hashPassword, verifyPassword, publicUser, checkApiKey,
  issueToken, verifyToken, revokeToken, recordFailure, isBlocked, clearFailures
};