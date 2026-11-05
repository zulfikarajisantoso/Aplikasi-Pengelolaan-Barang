export function formatRupiah(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('id-ID');
}

export function parseRupiah(str) {
  if (str === undefined || str === null) return '';
  const digits = String(str).replace(/[^0-9]/g, '');
  return digits === '' ? '' : digits;
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
