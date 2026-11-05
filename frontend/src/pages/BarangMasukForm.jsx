import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, parseRupiah } from '../utils/format';

function newItem() {
  return {
    namaBarang: '',
    harga: '',
    jumlah: '',
    satuan: '',
    tglExpired: '',
  };
}

export default function BarangMasukForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [operators, setOperators] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [subKategoriList, setSubKategoriList] = useState([]);
  const [selectedSubKategori, setSelectedSubKategori] = useState(null);

  const [tanggal, setTanggal] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [kategoriId, setKategoriId] = useState('');
  const [subKategoriId, setSubKategoriId] = useState('');
  const [asalBarang, setAsalBarang] = useState('');
  const [nomorSurat, setNomorSurat] = useState('');
  const [lampiran, setLampiran] = useState(null);
  const [existingLampiran, setExistingLampiran] = useState(null);
  const [items, setItems] = useState([newItem()]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user.role === 'Admin') {
      api.get('/users', { params: { role: 'Operator', all: 1 } }).then((res) => setOperators(res.data.data));
    } else {
      setOperatorId(user.id);
    }
    api.get('/kategori', { params: { all: 1 } }).then((res) => setKategoriList(res.data.data));
  }, [user]);

  useEffect(() => {
    if (!kategoriId) {
      setSubKategoriList([]);
      return;
    }
    setSubKategoriList([]);
    setSubKategoriId('');
    api.get('/sub-kategori', { params: { all: 1, kategoriId } }).then((res) => setSubKategoriList(res.data.data));
  }, [kategoriId]);

  useEffect(() => {
    const found = subKategoriList.find((sk) => sk.id === subKategoriId);
    setSelectedSubKategori(found || null);
  }, [subKategoriId, subKategoriList]);

  const loadExisting = useCallback(async () => {
    if (!isEdit) return;
    setLoading(true);
    try {
      const res = await api.get(`/barang-masuk/${id}`);
      const data = res.data.data;
      setTanggal(data.tanggal ? data.tanggal.slice(0, 10) : '');
      setOperatorId(data.operator_id);
      setKategoriId(data.kategori_id);
      setAsalBarang(data.asal_barang);
      setNomorSurat(data.nomor_surat || '');
      setExistingLampiran(data.lampiran_path);
      setItems(
        data.items.length > 0
          ? data.items.map((it) => ({
              namaBarang: it.nama_barang,
              harga: String(Math.trunc(Number(it.harga))),
              jumlah: String(it.jumlah),
              satuan: it.satuan,
              tglExpired: it.tgl_expired ? it.tgl_expired.slice(0, 10) : '',
            }))
          : [newItem()]
      );
      // sub kategori is set after kategori's list loads, store target to apply once available
      setPendingSubKategoriId(data.sub_kategori_id);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, [id, isEdit]);

  const [pendingSubKategoriId, setPendingSubKategoriId] = useState(null);
  useEffect(() => {
    if (pendingSubKategoriId && subKategoriList.some((sk) => sk.id === pendingSubKategoriId)) {
      setSubKategoriId(pendingSubKategoriId);
      setPendingSubKategoriId(null);
    }
  }, [subKategoriList, pendingSubKategoriId]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  function updateItem(index, patch) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }

  function removeItem(index) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function itemTotal(item) {
    const harga = Number(item.harga) || 0;
    const jumlah = Number(item.jumlah) || 0;
    return harga * jumlah;
  }

  const grandTotal = items.reduce((sum, it) => sum + itemTotal(it), 0);
  const batasHarga = selectedSubKategori ? Number(selectedSubKategori.batas_harga) : null;
  const overBudget = batasHarga !== null && grandTotal > batasHarga;

  function validate() {
    if (!tanggal) return 'Tanggal wajib diisi.';
    if (!operatorId) return 'Operator wajib dipilih.';
    if (!kategoriId) return 'Kategori wajib dipilih.';
    if (!subKategoriId) return 'Sub kategori wajib dipilih.';
    if (!asalBarang.trim()) return 'Asal barang wajib diisi.';
    if (asalBarang.length > 200) return 'Asal barang maksimal 200 karakter.';
    if (nomorSurat && nomorSurat.length > 100) return 'Nomor surat maksimal 100 karakter.';
    if (lampiran) {
      const ext = lampiran.name.slice(lampiran.name.lastIndexOf('.')).toLowerCase();
      if (!['.doc', '.docx', '.zip'].includes(ext)) {
        return 'Lampiran hanya boleh berformat .doc, .docx, atau .zip.';
      }
    }
    if (items.length === 0) return 'Minimal harus ada 1 barang.';
    for (const it of items) {
      if (!it.namaBarang.trim()) return 'Nama barang wajib diisi untuk setiap baris.';
      if (it.namaBarang.length > 200) return 'Nama barang maksimal 200 karakter.';
      if (it.harga === '' || Number.isNaN(Number(it.harga))) return 'Harga wajib diisi dengan angka yang valid.';
      if (it.jumlah === '' || Number.isNaN(Number(it.jumlah))) return 'Jumlah wajib diisi dengan angka yang valid.';
      if (!it.satuan.trim()) return 'Satuan wajib diisi untuk setiap baris.';
      if (it.satuan.length > 40) return 'Satuan maksimal 40 karakter.';
    }
    if (batasHarga !== null && grandTotal > batasHarga) {
      return `Total harga barang (Rp ${formatRupiah(grandTotal)}) melebihi batas harga sub kategori (Rp ${formatRupiah(batasHarga)}).`;
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('tanggal', tanggal);
      formData.append('operatorId', operatorId);
      formData.append('kategoriId', kategoriId);
      formData.append('subKategoriId', subKategoriId);
      formData.append('asalBarang', asalBarang.trim());
      formData.append('nomorSurat', nomorSurat.trim());
      formData.append(
        'items',
        JSON.stringify(
          items.map((it) => ({
            namaBarang: it.namaBarang.trim(),
            harga: Number(it.harga),
            jumlah: Number(it.jumlah),
            satuan: it.satuan.trim(),
            tglExpired: it.tglExpired || null,
          }))
        )
      );
      if (lampiran) {
        formData.append('lampiran', lampiran);
      }

      if (isEdit) {
        await api.put(`/barang-masuk/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/barang-masuk', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      navigate('/barang-masuk');
    } catch (apiErr) {
      setError(apiErr.response?.data?.error || 'Gagal menyimpan data barang masuk.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="page-loading">Memuat...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <h2>{isEdit ? 'Edit Barang Masuk' : 'Tambah Barang Masuk'}</h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="bm-form">
        <section className="form-section">
          <h3>Informasi Umum</h3>
          <div className="form-grid">
            <label className="field">
              <span>Tanggal *</span>
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </label>

            <label className="field">
              <span>Operator *</span>
              {user.role === 'Admin' ? (
                <select required value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
                  <option value="">-- Pilih Operator --</option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>{op.nama} ({op.username})</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={`${user.nama} (${user.username})`} disabled />
              )}
            </label>

            <label className="field">
              <span>Kategori *</span>
              <select required value={kategoriId} onChange={(e) => { setKategoriId(e.target.value); setSubKategoriId(''); }}>
                <option value="">-- Pilih Kategori --</option>
                {kategoriList.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Sub Kategori *</span>
              <select required value={subKategoriId} onChange={(e) => setSubKategoriId(e.target.value)} disabled={!kategoriId}>
                <option value="">-- Pilih Sub Kategori --</option>
                {subKategoriList.map((sk) => (
                  <option key={sk.id} value={sk.id}>{sk.nama}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Batas Harga</span>
              <input type="text" readOnly value={batasHarga !== null ? `Rp ${formatRupiah(batasHarga)}` : ''} />
            </label>

            <label className="field">
              <span>Asal Barang *</span>
              <input
                type="text"
                required
                maxLength={200}
                value={asalBarang}
                onChange={(e) => setAsalBarang(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Nomor Surat</span>
              <input
                type="text"
                maxLength={100}
                value={nomorSurat}
                onChange={(e) => setNomorSurat(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Lampiran (.doc, .docx, .zip)</span>
              <input
                type="file"
                accept=".doc,.docx,.zip"
                onChange={(e) => setLampiran(e.target.files[0] || null)}
              />
              {existingLampiran && !lampiran && (
                <a href={`${(import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api$/, '')}${existingLampiran}`} target="_blank" rel="noreferrer">
                  Lihat lampiran saat ini
                </a>
              )}
            </label>
          </div>
        </section>

        <section className="form-section">
          <h3>Informasi Barang</h3>
          {overBudget && (
            <div className="alert alert-error">
              Total harga barang (Rp {formatRupiah(grandTotal)}) melebihi batas harga sub kategori (Rp {formatRupiah(batasHarga)}).
            </div>
          )}
          <div className="table-wrap">
            <table className="data-table item-form-table">
              <thead>
                <tr>
                  <th>Nama Barang *</th>
                  <th>Harga *</th>
                  <th>Jumlah *</th>
                  <th>Satuan *</th>
                  <th>Total</th>
                  <th>Tgl Expired</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        required
                        maxLength={200}
                        value={item.namaBarang}
                        onChange={(e) => updateItem(index, { namaBarang: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        value={formatRupiah(item.harga)}
                        onChange={(e) => updateItem(index, { harga: parseRupiah(e.target.value) })}
                        placeholder="60.000"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        required
                        min="0"
                        value={item.jumlah}
                        onChange={(e) => updateItem(index, { jumlah: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        required
                        maxLength={40}
                        value={item.satuan}
                        onChange={(e) => updateItem(index, { satuan: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        readOnly
                        value={`Rp ${formatRupiah(itemTotal(item))}`}
                        aria-label={`Total item ${index + 1}`}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={item.tglExpired}
                        onChange={(e) => updateItem(index, { tglExpired: e.target.value })}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-small btn-danger"
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right"><strong>Grand Total</strong></td>
                  <td className="text-right"><strong>Rp {formatRupiah(grandTotal)}</strong></td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <button type="button" className="btn btn-add-item" onClick={addItem}>
            <span className="add-item-icon" aria-hidden="true">+</span>
            <span>Tambah Barang</span>
          </button>
        </section>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/barang-masuk')}>Batal</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Layout>
  );
}
