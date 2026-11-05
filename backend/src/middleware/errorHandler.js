const multer = require('multer');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-console
  console.error(err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload gagal: ${err.message}` });
  }

  if (err && err.message && err.message.includes('Lampiran hanya boleh')) {
    return res.status(400).json({ error: err.message });
  }

  if (err && err.code === '23505') {
    return res.status(409).json({ error: 'Data sudah ada (duplikat).' });
  }

  if (err && err.code === '23503') {
    return res.status(409).json({ error: 'Data tidak dapat diproses karena masih digunakan oleh data lain.' });
  }

  const status = err.status || 500;
  const message = err.message || 'Terjadi kesalahan pada server.';
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
