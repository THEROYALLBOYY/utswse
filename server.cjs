const fs = require('node:fs');
const https = require('node:https');
const http = require('node:http');
const app = require('./app.cjs');

const PORT = Number(process.env.PORT || 3000);
const HOST = '127.0.0.1';
const certPath = './certs/localhost.crt';
const keyPath = './certs/localhost.key';

const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);

const server = useHttps
  ? https.createServer({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }, app)
  : http.createServer(app);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} sudah dipakai. Hentikan server lama sebelum npm start lagi.`);
    process.exit(1);
  } else {
    console.error('Kesalahan server:', err.message);
  }
});

server.listen(PORT, HOST, () => {
  const url = useHttps ? `https://${HOST}:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`${useHttps ? 'HTTPS' : 'HTTP'} lokal: ${url}`);
  console.log('Listener: 127.0.0.1 (loopback)');
  console.log('Dokumentasi: /api-docs');
});