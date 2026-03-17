export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger }) {
  if (!open) return null;
  return (
    <div className="confirm-overlay open">
      <div className="confirm-box">
        <div className="confirm-title">{title}</div>
        <div className="confirm-sub">{message}</div>
        <div className="confirm-actions">
          <button onClick={onCancel}>Annuler</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
