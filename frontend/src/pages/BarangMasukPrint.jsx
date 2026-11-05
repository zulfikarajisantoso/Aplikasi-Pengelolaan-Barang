import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { formatRupiah, formatDate } from '../utils/format';

export default function BarangMasukPrint() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/barang-masuk/${id}`)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.error || 'Gagal memuat data.'));
  }, [id]);

  if (error) {
    return <div className="print-page"><p className="alert alert-error">{error}</p></div>;
  }

  if (!data) {
    return <div className="print-page"><p>Memuat...</p></div>;
  }

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>Print</button>
      </div>

      <div className="print-doc">
        <h1>Surat Barang Masuk</h1>
        <table className="print-info-table">
          <tbody>
            <tr><td>Tanggal</td><td>:</td><td>{formatDate(data.tanggal)}</td></tr>
            <tr><td>Operator</td><td>:</td><td>{data.operator_nama}</td></tr>
            <tr><td>Kategori</td><td>:</td><td>{data.kategori_nama}</td></tr>
            <tr><td>Sub Kategori</td><td>:</td><td>{data.sub_kategori_nama}</td></tr>
            <tr><td>Asal Barang</td><td>:</td><td>{data.asal_barang}</td></tr>
            <tr><td>Nomor Surat</td><td>:</td><td>{data.nomor_surat || '-'}</td></tr>
            <tr><td>Status</td><td>:</td><td>{data.status_verifikasi ? 'Terverifikasi' : 'Belum Terverifikasi'}</td></tr>
          </tbody>
        </table>

        <table className="print-item-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Barang</th>
              <th>Harga</th>
              <th>Jumlah</th>
              <th>Satuan</th>
              <th>Total</th>
              <th>Tgl Expired</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={item.id}>
                <td>{idx + 1}</td>
                <td>{item.nama_barang}</td>
                <td>Rp {formatRupiah(item.harga)}</td>
                <td>{item.jumlah}</td>
                <td>{item.satuan}</td>
                <td>Rp {formatRupiah(item.total)}</td>
                <td>{item.tgl_expired ? formatDate(item.tgl_expired) : '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="text-right"><strong>Total</strong></td>
              <td><strong>Rp {formatRupiah(data.total)}</strong></td>
              <td />
            </tr>
          </tfoot>
        </table>

        <div className="print-signature">
          <div>
            <p>Diserahkan oleh,</p>
            <div className="signature-space" />
            <p>(.........................)</p>
          </div>
          <div>
            <p>Diterima oleh,</p>
            <div className="signature-space" />
            <p>({data.operator_nama})</p>
          </div>
        </div>
      </div>
    </div>
  );
}
