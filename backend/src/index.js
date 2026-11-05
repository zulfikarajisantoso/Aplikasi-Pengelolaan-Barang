require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const kategoriRoutes = require('./routes/kategori');
const subKategoriRoutes = require('./routes/subKategori');
const barangMasukRoutes = require('./routes/barangMasuk');
const usersRoutes = require('./routes/users');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',') }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded lampiran files.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/kategori', kategoriRoutes);
app.use('/api/sub-kategori', subKategoriRoutes);
app.use('/api/barang-masuk', barangMasukRoutes);
app.use('/api/users', usersRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
