import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import api from '../api/axios';

const emptyForm = { kode: '', nama: '' };

export default function Kategori() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
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
      const res = await api.get('/kategori', { params: { page, pageSize, search } });
      setRows(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      setListError(err.response?.data?.error || 'Gagal memuat data kategori.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

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
    setForm({ kode: row.kode, nama: row.nama });
    setFormError('');
    setShowModal(true);
  }

  function validate() {
    if (!form.kode.trim()) return 'Kode kategori wajib diisi.';
    if (form.kode.length > 10) return 'Kode kategori maksimal 10 karakter.';
    if (!form.nama.trim()) return 'Nama kategori wajib diisi.';
    if (form.nama.length > 100) return 'Nama kategori maksimal 100 karakter.';
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
      if (editing) {
        await api.put(`/kategori/${editing.id}`, form);
      } else {
        await api.post('/kategori', form);
      }
      setShowModal(false);
      load();
    } catch (apiErr) {
      setFormError(apiErr.response?.data?.error || 'Gagal menyimpan kategori.');
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Hapus kategori "${row.nama}"?`)) return;
    try {
      await api.delete(`/kategori/${row.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus kategori.');
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
        <h2>Master Data - Kategori</h2>
      </div>

      <form className="toolbar toolbar-between" onSubmit={handleSearch}>
        <div className="toolbar-search">
        <input
          type="text"
          placeholder="Cari kode atau nama kategori..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary">Cari</button>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + Tambah Kategori
        </button>
      </form>

      {listError && <div className="alert alert-error">{listError}</div>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Kategori</th>
              <th style={{ width: 160 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={3} className="empty-cell">Memuat...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={3} className="empty-cell">Belum ada data kategori.</td></tr>
            )}
            {!loading && rows.map((row) => (
              <tr key={row.id}>
                <td>{row.kode}</td>
                <td>{row.nama}</td>
                <td className="action-cell">
                  <button type="button" className="icon-btn" onClick={() => openEdit(row)} title="Edit kategori" aria-label="Edit kategori">✎</button>
                  <button type="button" className="icon-btn icon-btn-danger" onClick={() => handleDelete(row)} title="Hapus kategori" aria-label="Hapus kategori">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />

      {showModal && (
        <Modal title={editing ? 'Edit Kategori' : 'Tambah Kategori'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            {formError && <div className="alert alert-error">{formError}</div>}
            <label className="field">
              <span>Kode Kategori</span>
              <input
                type="text"
                required
                maxLength={10}
                value={form.kode}
                onChange={(e) => setForm({ ...form, kode: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Nama Kategori</span>
              <input
                type="text"
                required
                maxLength={100}
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
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
