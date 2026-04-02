/**
 * Docker healthcheck: uses HTTPS when SSL_CERT_PATH + SSL_KEY_PATH are set (same as server.js).
 */
import http from 'http';
import https from 'https';

const port = parseInt(process.env.PORT || '8080', 10);
const useTls = !!(process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH);
const lib = useTls ? https : http;
const url = `${useTls ? 'https' : 'http'}://127.0.0.1:${port}/api/health`;

const req = lib.get(url, { rejectUnauthorized: false }, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on('error', () => process.exit(1));
req.setTimeout(8000, () => {
  req.destroy();
  process.exit(1);
});
