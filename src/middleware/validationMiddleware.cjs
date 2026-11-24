const { HttpError, errorBody } = require('../errors.cjs');

function sendValidation(res, errors) {
  return res.status(400).json(errorBody('Validasi gagal.', 'VALIDATION_ERROR', errors));
}

const loginValidator = (req, res, next) => {
  const errors = [];
  const body = req.body;
  const allowed = new Set(['username', 'password']);
  if (body && typeof body === 'object') {
    for (const key of Object.keys(body)) if (!allowed.has(key)) errors.push({ field: key, message: 'Field tidak diizinkan.' });
  } else {
    errors.push({ field: 'body', message: 'Body harus berupa JSON object.' });
  }
  if (typeof body.username !== 'string' || body.username.trim() === '') errors.push({ field: 'username', message: 'username wajib (string).' });
  if (typeof body.password !== 'string' || body.password === '') errors.push({ field: 'password', message: 'password wajib (string).' });
  if (errors.length) return sendValidation(res, errors);
  next();
};

const createValidator = (req, res, next) => {
  const errors = [];
  const body = req.body;
  const allowed = new Set(['judul', 'kategori', 'deskripsi']);
  if (body && typeof body === 'object') {
    for (const key of Object.keys(body)) if (!allowed.has(key)) errors.push({ field: key, message: 'Field tidak diizinkan.' });
  } else {
    errors.push({ field: 'body', message: 'Body harus berupa JSON object.' });
    return sendValidation(res, errors);
  }
  if (typeof body.judul !== 'string' || body.judul.trim() === '') errors.push({ field: 'judul', message: 'judul wajib (string).' });
  const kategori = ['Fasilitas', 'Akademik', 'TI'];
  if (typeof body.kategori !== 'string' || !kategori.includes(body.kategori)) errors.push({ field: 'kategori', message: 'kategori wajib: Fasilitas, Akademik, atau TI.' });
  if (typeof body.deskripsi !== 'string' || body.deskripsi.trim() === '') errors.push({ field: 'deskripsi', message: 'deskripsi wajib (string).' });
  if (body.judul && body.judul.length > 120) errors.push({ field: 'judul', message: 'judul maksimal 120 karakter.' });
  if (errors.length) return sendValidation(res, errors);
  next();
};

const updateValidator = (req, res, next) => {
  const errors = [];
  const body = req.body;
  const allowed = new Set(['judul', 'kategori', 'deskripsi']);
  if (body && typeof body === 'object') {
    for (const key of Object.keys(body)) if (!allowed.has(key)) errors.push({ field: key, message: 'Field tidak diizinkan.' });
  } else {
    errors.push({ field: 'body', message: 'Body harus berupa JSON object.' });
    return sendValidation(res, errors);
  }
  if (body.judul !== undefined && (typeof body.judul !== 'string' || body.judul.trim() === '')) errors.push({ field: 'judul', message: 'judul harus string tidak kosong.' });
  const kategori = ['Fasilitas', 'Akademik', 'TI'];
  if (body.kategori !== undefined && typeof body.kategori !== 'string') errors.push({ field: 'kategori', message: 'kategori wajib: Fasilitas, Akademik, atau TI.' });
  if (body.deskripsi !== undefined && (typeof body.deskripsi !== 'string' || body.deskripsi.trim() === '')) errors.push({ field: 'deskripsi', message: 'deskripsi harus string tidak kosong.' });
  const patchKeys = Object.keys(body).filter((k) => allowed.has(k));
  if (patchKeys.length === 0) errors.push({ field: 'body', message: 'Minimal satu field (judul, kategori, deskripsi) harus diisi.' });
  if (errors.length) return sendValidation(res, errors);
  next();
};

const statusValidator = (req, res, next) => {
  const errors = [];
  const body = req.body;
  const allowed = new Set(['status']);
  const statuses = new Set(['diajukan', 'diproses', 'selesai']);
  if (body && typeof body === 'object') {
    for (const key of Object.keys(body)) if (!allowed.has(key)) errors.push({ field: key, message: 'Field tidak diizinkan. Hanya status yang boleh diubah.' });
  } else {
    errors.push({ field: 'body', message: 'Body harus berupa JSON object.' });
    return sendValidation(res, errors);
  }
  if (typeof body.status !== 'string' || !statuses.has(body.status)) errors.push({ field: 'status', message: 'status wajib: diajukan, diproses, atau selesai.' });
  if (errors.length) return sendValidation(res, errors);
  next();
};

module.exports = { loginValidator, createValidator, updateValidator, statusValidator };
