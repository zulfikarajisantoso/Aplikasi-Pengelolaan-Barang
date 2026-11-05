import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import api from '../api/axios';

const emptyForm = { role: 'Operator', username: '', password: '', nama: '', email: '' };

export default function Users() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [listError, setListError] = useState('');

  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const res = await api.get('/users', { params: { page, pageSize, search, role: roleFilter } });
      setRows(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      setListError(err.response?.data?.error || 'Gagal memuat data pengguna.');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({ role: row.role, username: row.username, password: '', nama: row.nama, email: row.email });
    setFormError('');
    setShowModal(true);
  }

  function validate() {
    if (!['Admin', 'Operator'].includes(form.role)) return 'Role wajib dipilih.';
    if (form.username.length < 8 || form.username.length > 100) return 'Username wajib diisi, 8-100 karakter.';
    const pw = form.password;
    if (!pw || pw.length < 8 || pw.length > 100) return 'Password wajib diisi, 8-100 karakter.';
    if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) {
      return 'Password harus mengandung huruf besar, huruf kecil, dan angka.';
    }
    if (form.nama.length < 8 || form.nama.length > 100) return 'Nama wajib diisi, 8-100 karakter.';
    if (form.email.length < 8 || form.email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return 'Email tidak valid.';
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError('');
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      if (editing) {
        await api.put(`/users/${editing.id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      setShowModal(false);
      load();
    } catch (apiErr) {
      setFormError(apiErr.response?.data?.error || 'Gagal menyimpan pengguna.');
    }
  }

  async function handleToggleLock(row) {
    try {
      await api.patch(`/users/${row.id}/lock`, { isLocked: !row.is_locked });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengubah status kunci.');
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <Layout>
      <div className="page-header">
        <h2>Manajemen User</h2>
      </div>

      <form className="toolbar toolbar-between" onSubmit={handleSearch}>
        <div className="toolbar-search">
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">Semua Role</option>
          <option value="Admin">Admin</option>
          <option value="Operator">Operator</option>
        </select>
        <input
          type="text"
          placeholder="Cari username atau nama..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary">Cari</button>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + Tambah User
        </button>
      </form>

      {listError && <div className="alert alert-error">{listError}</div>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th style={{ width: 220 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="empty-cell">Memuat...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="empty-cell">Belum ada data pengguna.</td></tr>
            )}
            {!loading && rows.map((row) => (
              <tr key={row.id}>
                <td>{row.username}</td>
                <td>{row.nama}</td>
                <td>{row.email}</td>
                <td><span className="badge">{row.role}</span></td>
                <td>
                  {row.is_locked
                    ? <span className="badge badge-danger">Terkunci</span>
                    : <span className="badge badge-success">Aktif</span>}
                </td>
                <td className="action-cell">
                  <button type="button" className="icon-btn" onClick={() => openEdit(row)} title="Edit user" aria-label="Edit user">
                    ✎
                  </button>
                  <button
                    type="button"
                    className={`icon-btn ${row.is_locked ? 'icon-btn-unlock' : 'icon-btn-lock'}`}
                    onClick={() => handleToggleLock(row)}
                    title={row.is_locked ? 'Buka kunci user' : 'Kunci user'}
                    aria-label={row.is_locked ? 'Buka kunci user' : 'Kunci user'}
                  >
                    {row.is_locked ? '♙' : '⚿'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />

      {showModal && (
        <Modal title={editing ? 'Edit User' : 'Tambah User'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            {formError && <div className="alert alert-error">{formError}</div>}
            <label className="field">
              <span>Role</span>
              <select required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="Admin">Admin</option>
                <option value="Operator">Operator</option>
              </select>
            </label>
            <label className="field">
              <span>Username</span>
              <input
                type="text"
                required
                minLength={8}
                maxLength={100}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Password {editing && <small>(kosongkan jika tidak diubah)</small>}</span>
              <input
                type="password"
                required
                minLength={8}
                maxLength={100}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Nama</span>
              <input
                type="text"
                required
                minLength={8}
                maxLength={100}
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                required
                minLength={8}
                maxLength={100}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button type="submit" className="btn btn-primary">Simpan</button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
