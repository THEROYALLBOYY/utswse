
const express = require('express');
const app = express();
const { revokeToken } = require('./src/security.cjs');

app.use(express.json({ limit: '10kb' }));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'no-referrer');
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/login', require('./src/controllers/authController.cjs').loginHandler);
app.post('/api/auth/logout', (req, res) => {
  const token = req.get('Authorization')?.split(' ')[1];
  if (token) revokeToken(token);
  return res.json({ success: true, message: 'Logout berhasil' });
});

app.use('/api/pengaduan', require('./src/routes/pengaduanRoutes.cjs'));

app.get('/docs', (req, res) => res.json({ message: 'Swagger UI available at /api-docs' }));

try {
  const swaggerUi = require('swagger-ui-express');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, {
    swaggerOptions: { url: '/openapi.json', validatorUrl: null, persistAuthorization: false }
  }));
} catch (e) {
  console.warn('Swagger UI tidak tersedia:', e.message);
}

app.get('/openapi.json', (req, res) => {
  try {
    const spec = require('./docs/openapi.json');
    res.json(spec);
  } catch (e) {
    console.error('Gagal membaca OpenAPI:', e.message);

    res.status(500).json({
      success: false,
      message: 'Gagal membaca file openapi.json'
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SIMADU API berjalan',
    documentation: '/api-docs',
    openapi: '/openapi.json',
    health: '/health'
  });
});

app.use(require('./src/middleware/errorMiddleware.cjs'));

app.use((req, res) => res.status(404).json({ success: false, message: 'Rute tidak ditemukan.' }));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  res.status(status).json({ success: false, message: status >= 500 ? 'Terjadi kesalahan internal.' : err.message, code });
});

module.exports = app;
