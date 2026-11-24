const { HttpError } = require('../errors.cjs');
const { config, verifyPassword, issueToken, recordFailure, isBlocked, clearFailures, publicUser } = require('../security.cjs');
const userRepo = require('../repositories/userRepository.cjs');

function validateLogin(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Body request harus berupa JSON object.', undefined, 'VALIDATION_ERROR');
  }
  const allowed = new Set(['username', 'password']);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) errors.push({ field: key, message: 'Field tidak diizinkan.' });
  }
  if (typeof body.username !== 'string' || body.username.trim() === '') {
    errors.push({ field: 'username', message: 'username wajib diisi (string).' });
  }
  if (typeof body.password !== 'string' || body.password === '') {
    errors.push({ field: 'password', message: 'password wajib diisi (string).' });
  }
  if (errors.length) throw new HttpError(400, 'Validasi login gagal.', errors, 'VALIDATION_ERROR');
  return { username: body.username.trim().toLowerCase(), password: body.password };
}

function login(body, ip) {
  if (isBlocked(ip)) {
    throw new HttpError(429, 'Terlalu banyak percobaan login gagal. Coba lagi sebentar.', undefined, 'RATE_LIMITED');
  }
  const { username, password } = validateLogin(body);
  const user = userRepo.findByUsername(username);
  const ok = user && verifyPassword(password, user.salt, user.hash);
  if (!ok) {
    recordFailure(ip);
    throw new HttpError(401, 'Username atau password salah.', undefined, 'INVALID_CREDENTIALS');
  }
  clearFailures(ip);
  const token = issueToken(user);
  return {
    token,
    tokenType: 'Bearer',
    expiresIn: config.expiresInSec,
    user: publicUser(user)
  };
}

module.exports = { login, validateLogin };
