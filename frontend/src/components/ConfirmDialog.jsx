import React from 'react';
import './MapEditor.css'; // Uses existing modal styles

/**
 * ConfirmDialog - переиспользуемое модальное окно подтверждения
 */
function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmText = '✓ Удалить', cancelText = '✕ Отмена' }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-buttons">
          <button 
            onClick={onConfirm}
            className="btn-primary"
            style={{ flex: 1 }}
          >
            {confirmText}
          </button>
          <button 
            onClick={onCancel}
            className="btn-secondary"
            style={{ flex: 1 }}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
