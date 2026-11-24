
const seed = [
  { id: 1, mahasiswaId: 'MHS001', judul: 'Proyektor ruang kelas rusak', kategori: 'Fasilitas', deskripsi: 'Proyektor di ruang kelas tidak dapat menyala sejak Senin.', status: 'diajukan', createdAt: '2026-11-24T02:00:00.000Z' },
  { id: 2, mahasiswaId: 'MHS001', judul: 'Nilai mata kuliah belum keluar', kategori: 'Akademik', deskripsi: 'Nilai mata kuliah Web Service belum muncul di portal akademik.', status: 'diproses', createdAt: '2026-11-24T02:15:00.000Z' },
  { id: 3, mahasiswaId: 'MHS002', judul: 'WiFi gedung B sering putus', kategori: 'TI', deskripsi: 'Koneksi WiFi di lantai 2 gedung B terputus setiap 10 menit.', status: 'diajukan', createdAt: '2026-11-24T03:00:00.000Z' },
  { id: 4, mahasiswaId: 'MHS002', judul: 'Kursi ruang kelas patah', kategori: 'Fasilitas', deskripsi: 'Kursi nomor 12 di ruang B201 patah pada bagian sandaran.', status: 'selesai', createdAt: '2026-11-24T03:30:00.000Z' }
];

let data = seed.map(item => ({ ...item }));
let nextId = 5;

function reset() {
  data = seed.map((item) => ({ ...item }));
  nextId = Math.max(...data.map((d) => d.id)) + 1;
}

function clone(item) { return item ? { ...item } : null; }

function findAll() { return data.map(clone); }
function findByOwner(mahasiswaId) { return data.filter((p) => p.mahasiswaId === mahasiswaId).map(clone); }
function findById(id) { return clone(data.find((p) => p.id === id)); }
function create(fields) { const item = { id: nextId++, ...fields }; data.push(item); return clone(item); }
function updateFields(id, fields) { const item = data.find((p) => p.id === id); if (!item) return null; Object.assign(item, fields); return clone(item); }
function remove(id) { const before = data.length; data = data.filter((p) => p.id !== id); return data.length !== before; }

reset();

module.exports = { findAll, findByOwner, findById, create, updateFields, remove, reset };
