export default function Modal({ title, onClose, children, width }) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-box"
        style={width ? { maxWidth: width } : undefined}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
