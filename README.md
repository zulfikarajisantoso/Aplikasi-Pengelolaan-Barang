# Aplikasi Pengelolaan Barang

Full-stack technical test application for managing incoming goods ("Barang
Masuk"), categories ("Kategori" / "Sub Kategori") and users, with
role-based access (Admin / Operator).

## Informasi Aplikasi

1. **Link Deployment (Live App):** `[URL Aplikasi]` *(isi dengan URL deployment)*
2. **Link Video Demo:** `[URL Video]` *(isi dengan URL video demo)*
3. **Tech Stack yang Digunakan:**
   - **Frontend:** React, Vite, React Router, Axios, CSS
   - **Backend:** Node.js, Express, JWT, bcryptjs, Multer, ExcelJS
   - **Database:** PostgreSQL (dapat menggunakan Supabase)
4. **Petunjuk Instalasi Lokal:** lihat langkah-langkah pada bagian [Instalasi Lokal](#instalasi-lokal).
5. **Akun Pengujian:** username `administrator`, password `Admin123` (role Admin).

## Instalasi Lokal

### 1. Siapkan database

1. Buat database PostgreSQL, misalnya melalui [Supabase](https://supabase.com).
2. Jalankan migrasi:

   ```bash
   psql "$DATABASE_URL" -f backend/migrations/001_init.sql
   ```

### 2. Jalankan backend

```bash
cd backend
cp .env.example .env
# isi DATABASE_URL, JWT_SECRET, PORT, dan CORS_ORIGIN pada .env
npm install
npm run seed
npm run dev
```

Backend berjalan pada `http://localhost:4000`.

### 3. Jalankan frontend

Buka terminal baru dari direktori repository:

```bash
cd frontend
cp .env.example .env
# pastikan VITE_API_URL=http://localhost:4000/api
npm install
npm run dev
```

Frontend berjalan pada `http://localhost:5173`.

## Tech stack

- **Backend**: Node.js + Express (plain JavaScript), `pg` for raw
  PostgreSQL queries (works against any Postgres, including Supabase's
  connection pooler), JWT auth (`jsonwebtoken` + `bcryptjs`), file upload
  via `multer`, Excel export via `exceljs`.
- **Frontend**: React + Vite (plain JavaScript), `react-router-dom`,
  `axios`, plain CSS.

## 1. Set up the database (Supabase)

1. Create a new project at [supabase.com](https://supabase.com).
2. In **Project Settings > Database**, copy the connection string. Use the
   **Transaction pooler** or **Session pooler** URI (works well with
   serverless/short-lived connections). It looks like:

   ```
   postgresql://postgres.xxxxx:[PASSWORD]@aws-0-xxxx.pooler.supabase.com:6543/postgres
   ```

   or the direct connection on port 5432:

   ```
   postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres?sslmode=require
   ```

3. Run the migration against that database:

   ```bash
   psql "$DATABASE_URL" -f backend/migrations/001_init.sql
   ```

   This creates all tables (`users`, `kategori`, `sub_kategori`,
   `barang_masuk`, `barang_masuk_item`) and enables the `pgcrypto`
   extension for `gen_random_uuid()`.

4. Seed an initial Admin user plus one sample Kategori/Sub Kategori (see
   step 2 below - the seed is a Node script, not raw SQL, because the
   admin password must be bcrypt-hashed).

## 2. Run the backend

```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL, JWT_SECRET, PORT, CORS_ORIGIN
npm install
npm run seed   # creates admin/Admin123 + sample kategori/sub-kategori
npm run dev    # starts on http://localhost:4000 (or `npm start` for production)
```

Default seeded login: **username `admin`, password `Admin123`** (Admin
role).

## 3. Run the frontend

```bash
cd frontend
cp .env.example .env
# edit .env: set VITE_API_URL (e.g. http://localhost:4000/api)
npm install
npm run dev    # starts on http://localhost:5173
```

Build for production / static hosting (Vercel, Netlify, etc.):

```bash
npm run build   # outputs to frontend/dist
```

## Project structure

```
backend/
  migrations/        SQL migrations (001_init.sql, 002_seed.sql)
  scripts/seed.js     Repeatable seed script (admin user + sample data)
  src/
    index.js          Express app entry point
    db.js             pg Pool wrapper
    middleware/        auth (JWT + role guard), upload (multer), errorHandler
    routes/             auth, kategori, subKategori, barangMasuk, users
    utils/validators.js
  uploads/            Uploaded lampiran files (served at /uploads/...)

frontend/
  src/
    api/axios.js       axios instance with JWT Authorization interceptor
    context/AuthContext.jsx
    components/        Layout (sidebar/topbar), Modal, Pagination, ProtectedRoute
    pages/              Login, BarangMasukList, BarangMasukForm, BarangMasukPrint,
                        Kategori, SubKategori, Users
    styles/index.css
```

## Roles & permissions

| Feature | Admin | Operator |
|---|---|---|
| Login | yes | yes |
| Barang Masuk (CRUD) | yes | yes (own records for edit/delete) |
| Master Data > Kategori | yes | no |
| Master Data > Sub Kategori | yes | no |
| Manajemen User | yes | no |

Enforced both in the Express routes (role-checking middleware) and in the
React app (route guards + hidden nav items).

## Notable business rules

- The sum of all item totals on a Barang Masuk record must not exceed the
  selected Sub Kategori's `batas_harga`. Validated client-side (blocks
  submit) and server-side (returns HTTP 400 - this is the one that
  actually matters for correctness).
- Item totals are always recomputed server-side from `harga * jumlah` -
  the client-submitted total is never trusted.
- Locked users (`is_locked = true`) cannot log in.
- Lampiran uploads are restricted to `.doc`, `.docx`, `.zip` (validated
  both client-side and via a multer `fileFilter`).
