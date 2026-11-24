
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3400;
const BASE = `http://127.0.0.1:${PORT}`;
const EXPIRE_PORT = 3401;
const EXPIRE_BASE = `http://127.0.0.1:${EXPIRE_PORT}`;

const results = [];
let pass = 0, fail = 0;

function startServer(port, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['server.cjs'], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(port), ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let log = '';
    child.stdout.on('data', d => { log += d.toString(); });
    child.stderr.on('data', d => { log += d.toString(); });
    const base = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + 10000;
    const poll = async () => {
      try {
        const r = await fetch(`${base}/health`);
        if (r.ok) return resolve({ child, getLog: () => log });
      } catch (e) {}
      if (Date.now() > deadline) return reject(new Error('Server tidak siap: ' + log));
      setTimeout(poll, 100);
    };
    poll();
  });
}

async function req(base, method, route, { token, body, raw } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const payload = raw !== undefined ? raw : (body !== undefined ? JSON.stringify(body) : undefined);
  try {
    const r = await fetch(base + route, { method, headers, body: payload });
    const text = await r.text();
    let parsed = text;
    try { parsed = text ? JSON.parse(text) : null; } catch (e) {}
    return { status: r.status, body: parsed };
  } catch (e) {
    return { status: 0, body: null, error: e.message };
  }
}

async function check(no, desc, fn) {
  try {
    const detail = await fn();
    results.push({ no, desc, status: 'PASS', detail: detail || '' });
    pass++;
    console.log(`[PASS] ${no}. ${desc}${detail ? ' - ' + detail : ''}`);
  } catch (e) {
    results.push({ no, desc, status: 'FAIL', detail: e.message });
    fail++;
    console.log(`[FAIL] ${no}. ${desc} - ${e.message}`);
  }
}

function expect(cond, msg) { if (!cond) throw new Error(msg); }

async function main() {
  console.log('=== SIMADU API - PENGUJIAN FUNGSIONAL & KEAMANAN ===\n');
  const main = await startServer(PORT);

  let adminToken, mhs1Token, mhs2Token, createdId;

  await check(1, 'Login admin dengan kredensial benar', async () => {
    const r = await req(BASE, 'POST', '/api/auth/login', { body: { username: 'admin', password: 'AdminDemo123!' } });
    expect(r.status === 200, `status ${r.status}`);
    expect(r.body.data.token && r.body.data.tokenType === 'Bearer', 'token tidak ada');
    expect(!('salt' in r.body.data.user) && !('hash' in r.body.data.user), 'salt/hash bocor');
    adminToken = r.body.data.token;
    return `expiresIn=${r.body.data.expiresIn}s`;
  });

  await check(2, 'Login mhs001 dengan kredensial benar', async () => {
    const r = await req(BASE, 'POST', '/api/auth/login', { body: { username: 'mhs001', password: 'MhsDemo123!' } });
    expect(r.status === 200, `status ${r.status}`);
    mhs1Token = r.body.data.token;
    return `user=${r.body.data.user.id}`;
  });

  await check(3, 'Login mhs002 dengan kredensial benar', async () => {
    const r = await req(BASE, 'POST', '/api/auth/login', { body: { username: 'mhs002', password: 'MhsDemo123!' } });
    expect(r.status === 200, `status ${r.status}`);
    mhs2Token = r.body.data.token;
    return `user=${r.body.data.user.id}`;
  });

  await check(4, 'Login password salah ditolak (401)', async () => {
    const r = await req(BASE, 'POST', '/api/auth/login', { body: { username: 'mhs001', password: 'salah123' } });
    expect(r.status === 401, `status ${r.status}`);
  });

  await check(5, 'Login field kosong ditolak (400)', async () => {
    const r = await req(BASE, 'POST', '/api/auth/login', { body: { username: '' } });
    expect(r.status === 400 && Array.isArray(r.body.errors), `status ${r.status}`);
    return `${r.body.errors.length} field error`;
  });

  await check(6, 'Login field tambahan ditolak (400)', async () => {
    const r = await req(BASE, 'POST', '/api/auth/login', { body: { username: 'mhs001', password: 'MhsDemo123!', role: 'admin' } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await check(7, 'Akses tanpa token ditolak (401)', async () => {
    const r = await req(BASE, 'GET', '/api/pengaduan');
    expect(r.status === 401, `status ${r.status}`);
  });

  await check(8, 'Akses token palsu ditolak (401)', async () => {
    const r = await req(BASE, 'GET', '/api/pengaduan', { token: 'a'.repeat(64) });
    expect(r.status === 401, `status ${r.status}`);
    expect(r.body.code === 'INVALID_TOKEN', `code ${r.body.code}`);
  });

  await check(9, 'Mahasiswa hanya lihat pengaduan sendiri', async () => {
    const r = await req(BASE, 'GET', '/api/pengaduan', { token: mhs1Token });
    expect(r.status === 200, `status ${r.status}`);
    expect(r.body.data.length === 2, `jumlah ${r.body.data.length}`);
    expect(r.body.data.every(p => p.mahasiswaId === 'MHS001'), 'ada data orang lain');
    return `${r.body.data.length} data`;
  });

  await check(10, 'Admin lihat semua pengaduan', async () => {
    const r = await req(BASE, 'GET', '/api/pengaduan', { token: adminToken });
    expect(r.status === 200 && r.body.data.length === 4, `status ${r.status}, jumlah ${r.body.data.length}`);
    return `${r.body.data.length} data`;
  });

  await check(11, 'Mahasiswa baca detail pengaduan sendiri (200)', async () => {
    const r = await req(BASE, 'GET', '/api/pengaduan/1', { token: mhs1Token });
    expect(r.status === 200 && r.body.data.id === 1, `status ${r.status}`);
  });

  await check(12, 'Mahasiswa dilarang baca pengaduan orang lain (403)', async () => {
    const r = await req(BASE, 'GET', '/api/pengaduan/3', { token: mhs1Token });
    expect(r.status === 403, `status ${r.status}`);
  });

  await check(13, 'Mahasiswa buat pengaduan valid (201)', async () => {
    const r = await req(BASE, 'POST', '/api/pengaduan', { token: mhs1Token, body: { judul: 'AC lab komputer rusak', kategori: 'Fasilitas', deskripsi: 'AC di lab tidak dingin sejak kemarin.' } });
    expect(r.status === 201, `status ${r.status} ${JSON.stringify(r.body)}`);
    expect(r.body.data.mahasiswaId === 'MHS001', 'pemilik salah');
    expect(r.body.data.status === 'diajukan', 'status awal salah');
    createdId = r.body.data.id;
    return `id=${createdId}`;
  });

  await check(14, 'Client tidak bisa menentukan mahasiswaId (400)', async () => {
    const r = await req(BASE, 'POST', '/api/pengaduan', { token: mhs1Token, body: { judul: 'Test spoof', kategori: 'TI', deskripsi: 'Coba menyamar.', mahasiswaId: 'MHS002' } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await check(15, 'Kategori invalid ditolak (400)', async () => {
    const r = await req(BASE, 'POST', '/api/pengaduan', { token: mhs1Token, body: { judul: 'Test kategori', kategori: 'Olahraga', deskripsi: 'Kategori tidak ada.' } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await check(16, 'Admin dilarang membuat pengaduan (403)', async () => {
    const r = await req(BASE, 'POST', '/api/pengaduan', { token: adminToken, body: { judul: 'Admin buat', kategori: 'TI', deskripsi: 'Tidak boleh.' } });
    expect(r.status === 403, `status ${r.status}`);
  });

  await check(17, 'Pemilik ubah pengaduan status diajukan (200)', async () => {
    const r = await req(BASE, 'PUT', `/api/pengaduan/${createdId}`, { token: mhs1Token, body: { judul: 'AC lab komputer perbaikan', kategori: 'Fasilitas', deskripsi: 'Sudah dilaporkan ke teknisi.' } });
    expect(r.status === 200 && r.body.data.judul.includes('perbaikan'), `status ${r.status}`);
  });

  await check(18, 'Update dengan field status ditolak (400)', async () => {
    const r = await req(BASE, 'PUT', `/api/pengaduan/${createdId}`, { token: mhs1Token, body: { status: 'selesai' } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await check(19, 'Mahasiswa lain dilarang mengubah (403)', async () => {
    const r = await req(BASE, 'PUT', `/api/pengaduan/${createdId}`, { token: mhs2Token, body: { judul: 'Hack' } });
    expect(r.status === 403, `status ${r.status}`);
  });

  await check(20, 'Admin ubah status pengaduan (200)', async () => {
    const r = await req(BASE, 'PATCH', `/api/pengaduan/${createdId}/status`, { token: adminToken, body: { status: 'diproses' } });
    expect(r.status === 200 && r.body.data.status === 'diproses', `status ${r.status}`);
  });

  await check(21, 'Mahasiswa dilarang ubah status (403)', async () => {
    const r = await req(BASE, 'PATCH', `/api/pengaduan/1/status`, { token: mhs1Token, body: { status: 'selesai' } });
    expect(r.status === 403, `status ${r.status}`);
  });

  await check(22, 'Status invalid ditolak (400)', async () => {
    const r = await req(BASE, 'PATCH', `/api/pengaduan/1/status`, { token: adminToken, body: { status: 'random' } });
    expect(r.status === 400, `status ${r.status}`);
  });

  await check(23, 'Update pengaduan yang sudah diproses ditolak (409)', async () => {
    const r = await req(BASE, 'PUT', `/api/pengaduan/${createdId}`, { token: mhs1Token, body: { judul: 'Terlambat' } });
    expect(r.status === 409, `status ${r.status}`);
  });

  await check(24, 'Admin dilarang menghapus pengaduan (403)', async () => {
    const r = await req(BASE, 'DELETE', '/api/pengaduan/1', { token: adminToken });
    expect(r.status === 403, `status ${r.status}`);
  });

  await check(25, 'Mahasiswa hapus pengaduan sendiri (204)', async () => {
    const r = await req(BASE, 'DELETE', '/api/pengaduan/1', { token: mhs1Token });
    expect(r.status === 204, `status ${r.status}`);
  });

  await check(26, 'ID tidak ditemukan (404)', async () => {
    const r = await req(BASE, 'GET', '/api/pengaduan/99999', { token: mhs1Token });
    expect(r.status === 404, `status ${r.status}`);
  });

  await check(27, 'ID tidak valid (400)', async () => {
    const r = await req(BASE, 'GET', '/api/pengaduan/abc', { token: mhs1Token });
    expect(r.status === 400, `status ${r.status}`);
  });

  await check(28, 'JSON malformed ditolak (400)', async () => {
    const r = await req(BASE, 'POST', '/api/auth/login', { raw: '{bad json' });
    expect(r.status === 400, `status ${r.status}`);
  });

  await check(29, 'Dokumentasi OpenAPI tersedia (200)', async () => {
    const r = await req(BASE, 'GET', '/openapi.json');
    expect(r.status === 200 && r.body.data.openapi === '3.0.0', `status ${r.status}`);
    expect(Object.keys(r.body.data.paths).length >= 5, 'path kurang');
    return `${Object.keys(r.body.data.paths).length} path`;
  });

  await check(30, 'Swagger UI merespons (200)', async () => {
    const r = await fetch(`${BASE}/api-docs/`);
    expect(r.status === 200, `status ${r.status}`);
  });

  await check(31, 'Logout mencabut token (401 setelah logout)', async () => {
    const r1 = await req(BASE, 'POST', '/api/auth/logout', { token: mhs2Token });
    expect(r1.status === 200, `logout ${r1.status}`);
    const r2 = await req(BASE, 'GET', '/api/pengaduan', { token: mhs2Token });
    expect(r2.status === 401, `setelah logout ${r2.status}`);
  });

  main.child.kill();

  // Server terpisah dengan expiry 1 detik untuk uji kedaluwarsa
  const exp = await startServer(EXPIRE_PORT, { NODE_ENV: 'test', TOKEN_EXPIRES_IN: '1' });
  await check(32, 'Token kedaluwarsa ditolak (401)', async () => {
    const r1 = await req(EXPIRE_BASE, 'POST', '/api/auth/login', { body: { username: 'mhs001', password: 'MhsDemo123!' } });
    expect(r1.status === 200, `login ${r1.status}`);
    await new Promise(res => setTimeout(res, 1300));
    const r2 = await req(EXPIRE_BASE, 'GET', '/api/pengaduan', { token: r1.body.data.token });
    expect(r2.status === 401 && r2.body.code === 'TOKEN_EXPIRED', `status ${r2.status} code ${r2.body.code}`);
  });
  exp.child.kill();

  const total = pass + fail;
  console.log(`\nHASIL: ${pass}/${total} lolos, ${fail} gagal.`);

  const out = {
    judul: 'SIMADU API - Hasil Pengujian Fungsional & Keamanan',
    tanggal: new Date().toISOString(),
    total, lulus: pass, gagal: fail,
    hasil: results
  };
  const docsDir = path.join(ROOT, 'docs');
  fs.writeFileSync(path.join(docsDir, 'hasil-pengujian.json'), JSON.stringify(out, null, 2));
  const lines = [
    'SIMADU API - HASIL PENGUJIAN FUNGSIONAL & KEAMANAN',
    'Tanggal: ' + new Date().toLocaleString('id-ID'),
    `Total: ${total} | Lulus: ${pass} | Gagal: ${fail}`,
    '',
    ...results.map(r => `${r.status} | ${String(r.no).padStart(2,'0')}. ${r.desc}${r.detail ? ' - ' + r.detail : ''}`)
  ];
  fs.writeFileSync(path.join(docsDir, 'hasil-pengujian.txt'), lines.join('\n'));

  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
