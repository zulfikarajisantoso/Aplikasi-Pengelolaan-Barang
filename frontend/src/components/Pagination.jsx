export default function Pagination({ page, pageSize, total, onChange }) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  const pages = [];
  for (let i = 1; i <= totalPages; i += 1) {
    pages.push(i);
  }

  return (
    <div className="pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        &laquo; Sebelumnya
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={p === page ? 'page-btn active' : 'page-btn'}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Selanjutnya &raquo;
      </button>
    </div>
  );
}
