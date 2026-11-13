import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

function ToastContainer() {
  const toasts = useUIStore(s => s.toasts);
  const removeToast = useUIStore(s => s.removeToast);

  return (
    <div className="toast-container-wrapper">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className={`toast-pill ${toast.type}`}
        >
          <div style={{ color: 'var(--color-fg, #FAFAFA)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {getToastIcon(toast.type)}
          </div>
          <span className="toast-pill-message">{toast.message}</span>
          
          {toast.action && (
            <button 
              onClick={() => { toast.action.onClick(); removeToast(toast.id); }}
              className="toast-action-btn"
            >
              {toast.action.label}
            </button>
          )}

          <button 
            onClick={() => removeToast(toast.id)}
            className="toast-close-btn"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function getToastIcon(type) {
  switch (type) {
    case 'success': return <CheckCircle size={15} />;
    case 'error': return <AlertCircle size={15} />;
    case 'info': return <Info size={15} />;
    default: return <Info size={15} />;
  }
}

export default ToastContainer;
