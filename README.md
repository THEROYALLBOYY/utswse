# SIMADU API

REST API **Sistem Layanan Informasi dan Pengaduan Mahasiswa** — tugas UTS Web Service Engineering 2026.

- Node.js + Express 5 (CommonJS)
- Autentikasi Bearer Token dengan masa kedaluwarsa
- Otorisasi berbasis role (`mahasiswa`, `admin`) dan kepemilikan data
- Validasi input terpusat dengan daftar error per field
- Error response konsisten: `{ success:false, message, code, errors? }`
- Dokumentasi OpenAPI di `/openapi.json`, Swagger UI di `/api-docs`
- Pengujian otomatis: `npm test` (32 skenario)

## Akun Demo

| Username | Password       | Role      |
|----------|----------------|-----------|
| mhs001   | MhsDemo123!    | mahasiswa |
| mhs002   | MhsDemo123!    | mahasiswa |
| admin    | AdminDemo123!  | admin     |

Password disimpan sebagai hash `scrypt` di memori saat server start; plaintext hanya ada di `.env`.

## Menjalankan

```bash
npm install
cp .env.example .env   # isi API_KEY & password demo
npm start              # http://127.0.0.1:3000
npm test               # 32 skenario pengujian otomatis
```

Jika tersedia `certs/localhost.crt` dan `certs/localhost.key`, server otomatis HTTPS.

## Endpoint

| Method | Path                        | Akses        | Keterangan |
|--------|-----------------------------|--------------|------------|
| POST   | `/api/auth/login`           | publik       | login, balas token Bearer |
| POST   | `/api/auth/logout`          | bearer       | cabut token |
| GET    | `/api/pengaduan`            | bearer       | mahasiswa: miliknya; admin: semua |
| GET    | `/api/pengaduan/:id`        | bearer       | pemilik / admin |
| POST   | `/api/pengaduan`            | mahasiswa    | buat pengaduan |
| PUT    | `/api/pengaduan/:id`        | mahasiswa    | ubah (status `diajukan` saja) |
| PATCH  | `/api/pengaduan/:id/status` | admin        | ubah status |
| DELETE | `/api/pengaduan/:id`        | mahasiswa    | hapus (status `diajukan` saja) |
| GET    | `/health`                   | publik       | health check |
| GET    | `/openapi.json`              | publik       | spesifikasi OpenAPI |
| GET    | `/api-docs`                 | publik       | Swagger UI |

## Aturan Penting

- `id` dan `mahasiswaId` **ditentukan server**, tidak bisa dipaksakan lewat body (field tambahan ditolak).
- Mahasiswa hanya boleh mengakses pengaduan miliknya sendiri.
- Hanya admin yang boleh mengubah status; admin **tidak** boleh membuat/mengubah/menghapus isi pengaduan.
- Token kedaluwarsa otomatis ditolak (`401 TOKEN_EXPIRED`).
- Response error selalu konsisten: `success:false`, `message`, `code`, dan `errors[]` bila validasi gagal.

## Struktur Kode (berlapis)

```
app.cjs                  -> aplikasi Express + mounting route + error handler
server.cjs               -> HTTP(S) listener
src/
  security.cjs           -> dotenv, scrypt, token session, rate-limit login
  errors.cjs             -> HttpError, parseId, format response error
  repositories/          -> data in-memory (pengaduan, user)
  services/              -> aturan bisnis & otorisasi
  controllers/           -> handler request/response
  middleware/            -> auth, role, validasi, id param
  routes/                -> definisi endpoint
docs/openapi.json        -> spesifikasi OpenAPI
tests/uts-scenarios.cjs  -> 32 skenario pengujian otomatis
```

## Hasil Pengujian

Hasil lengkap tersimpan di `docs/hasil-pengujian.txt` dan `docs/hasil-pengujian.json`.
