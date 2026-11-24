const { HttpError } = require('../errors.cjs');
const repo = require('../repositories/pengaduanRepository.cjs');

const KATEGORI = new Set(['Fasilitas', 'Akademik', 'TI']);
const STATUS = new Set(['diajukan', 'diproses', 'selesai']);

function ensureObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Body request harus berupa JSON object.', undefined, 'VALIDATION_ERROR');
  }
}

function validateCreate(body) {
  ensureObject(body);
  const allowed = new Set(['judul', 'kategori', 'deskripsi']);
  const errors = [];
  for (const k of Object.keys(body)) if (!allowed.has(k)) errors.push({ field: k, message: 'Field tidak diizinkan.' });
  if (typeof body.judul !== 'string' || body.judul.trim() === '') errors.push({ field: 'judul', message: 'judul wajib (string, tidak kosong).' });
  if (typeof body.kategori !== 'string' || !KATEGORI.has(body.kategori)) errors.push({ field: 'kategori', message: 'kategori wajib: Fasilitas, Akademik, atau TI.' });
  if (typeof body.deskripsi !== 'string' || body.deskripsi.trim() === '') errors.push({ field: 'deskripsi', message: 'deskripsi wajib (string, tidak kosong).' });
  if (body.judul && body.judul.length > 120) errors.push({ field: 'judul', message: 'judul maksimal 120 karakter.' });
  if (body.deskripsi && body.deskripsi.length > 2000) errors.push({ field: 'deskripsi', message: 'deskripsi maksimal 2000 karakter.' });
  if (errors.length) throw new HttpError(400, 'Validasi data pengaduan gagal.', errors, 'VALIDATION_ERROR');
  return { judul: body.judul.trim(), kategori: body.kategori, deskripsi: body.deskripsi.trim() };
}

function validateUpdate(body) {
  ensureObject(body);
  const allowed = new Set(['judul', 'kategori', 'deskripsi']);
  const errors = [];
  for (const k of Object.keys(body)) if (!allowed.has(k)) errors.push({ field: k, message: 'Field tidak diizinkan.' });
  if (body.judul !== undefined && (typeof body.judul !== 'string' || body.judul.trim() === '')) errors.push({ field: 'judul', message: 'judul harus string tidak kosong.' });
  if (body.kategori !== undefined && !KATEGORI.has(body.kategori)) errors.push({ field: 'kategori', message: 'kategori harus Fasilitas, Akademik, atau TI.' });
  if (body.deskripsi !== undefined && (typeof body.deskripsi !== 'string' || body.deskripsi.trim() === '')) errors.push({ field: 'deskripsi', message: 'deskripsi harus string tidak kosong.' });
  const patch = {};
  if (body.judul !== undefined) patch.judul = body.judul.trim();
  if (body.kategori !== undefined) patch.kategori = body.kategori;
  if (body.deskripsi !== undefined) patch.deskripsi = body.deskripsi.trim();
  if (Object.keys(patch).length === 0) errors.push({ field: 'body', message: 'Minimal satu field (judul/kategori/deskripsi) harus diisi.' });
  if (errors.length) throw new HttpError(400, 'Validasi update pengaduan gagal.', errors, 'VALIDATION_ERROR');
  return patch;
}

function validateStatus(body) {
  ensureObject(body);
  const allowed = new Set(['status']);
  const errors = [];
  for (const k of Object.keys(body)) if (!allowed.has(k)) errors.push({ field: k, message: 'Field tidak diizinkan. Hanya status yang boleh diubah.' });
  if (typeof body.status !== 'string' || !STATUS.has(body.status)) errors.push({ field: 'status', message: 'status wajib: diajukan, diproses, atau selesai.' });
  if (errors.length) throw new HttpError(400, 'Validasi status gagal.', errors, 'VALIDATION_ERROR');
  return body.status;
}

function list(user) {
  if (user.role === 'admin') return repo.findAll();
  return repo.findByOwner(user.id);
}

function detail(id, user) {
  const p = repo.findById(id);
  if (!p) throw new HttpError(404, 'Pengaduan tidak ditemukan.', undefined, 'NOT_FOUND');
  if (user.role !== 'admin' && p.mahasiswaId !== user.id) {
    throw new HttpError(403, 'Anda tidak berhak mengakses pengaduan ini.', undefined, 'FORBIDDEN');
  }
  return p;
}

function create(user, body) {
  if (user.role !== 'mahasiswa') {
    throw new HttpError(403, 'Hanya mahasiswa yang dapat membuat pengaduan.', undefined, 'FORBIDDEN');
  }
  const fields = validateCreate(body);
  return repo.create({
    mahasiswaId: user.id,
    judul: fields.judul,
    kategori: fields.kategori,
    deskripsi: fields.deskripsi,
    status: 'diajukan',
    createdAt: new Date().toISOString()
  });
}

function update(id, user, body) {
  const p = repo.findById(id);
  if (!p) throw new HttpError(404, 'Pengaduan tidak ditemukan.', undefined, 'NOT_FOUND');
  if (user.role === 'admin') throw new HttpError(403, 'Admin tidak boleh mengubah isi pengaduan mahasiswa.', undefined, 'FORBIDDEN');
  if (p.mahasiswaId !== user.id) throw new HttpError(403, 'Anda tidak berhak mengubah pengaduan ini.', undefined, 'FORBIDDEN');
  if (p.status !== 'diajukan') throw new HttpError(409, 'Pengaduan hanya bisa diubah saat status diajukan.', undefined, 'INVALID_STATE');
  const patch = validateUpdate(body);
  return repo.updateFields(id, patch);
}

function updateStatus(id, user, body) {
  if (user.role !== 'admin') throw new HttpError(403, 'Hanya admin yang dapat mengubah status.', undefined, 'FORBIDDEN');
  const p = repo.findById(id);
  if (!p) throw new HttpError(404, 'Pengaduan tidak ditemukan.', undefined, 'NOT_FOUND');
  const status = validateStatus(body);
  return repo.updateFields(id, { status });
}

function remove(id, user) {
  const p = repo.findById(id);
  if (!p) throw new HttpError(404, 'Pengaduan tidak ditemukan.', undefined, 'NOT_FOUND');
  if (user.role === 'admin') throw new HttpError(403, 'Admin tidak boleh menghapus pengaduan mahasiswa.', undefined, 'FORBIDDEN');
  if (p.mahasiswaId !== user.id) throw new HttpError(403, 'Anda tidak berhak menghapus pengaduan ini.', undefined, 'FORBIDDEN');
  if (p.status !== 'diajukan') throw new HttpError(409, 'Pengaduan hanya bisa dihapus saat status diajukan.', undefined, 'INVALID_STATE');
  repo.remove(id);
}

module.exports = { list, detail, create, update, updateStatus, remove, KATEGORI, STATUS };
