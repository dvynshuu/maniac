import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { X, CheckCircle, AlertCircle, Info, RotateCcw } from 'lucide-react';

function ToastContainer() {
  const toasts = useUIStore(s => s.toasts);
  const removeToast = useUIStore(s => s.removeToast);

  return (
    <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10000, pointerEvents: 'none' }}>
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className="toast-pill animate-slide-up"
          style={{ 
            pointerEvents: 'auto',
            background: 'var(--bg-elevated)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '24px', 
            padding: '8px 16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
            minWidth: '200px'
          }}
        >
          <div style={{ color: getToastColor(toast.type) }}>
            {getToastIcon(toast.type)}
          </div>
          <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{toast.message}</span>
          
          {toast.action && (
            <button 
              onClick={() => { toast.action.onClick(); removeToast(toast.id); }}
              style={{ 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: '12px', 
                padding: '2px 8px', 
                fontSize: '12px', 
                fontWeight: 'bold', 
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                marginLeft: '8px'
              }}
            >
              {toast.action.label}
            </button>
          )}

          <button 
            onClick={() => removeToast(toast.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', display: 'flex' }}
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
    case 'success': return <CheckCircle size={16} />;
    case 'error': return <AlertCircle size={16} />;
    case 'info': return <Info size={16} />;
    default: return <Info size={16} />;
  }
}

function getToastColor(type) {
  switch (type) {
    case 'success': return 'var(--success)';
    case 'error': return 'var(--error)';
    case 'info': return 'var(--accent-primary)';
    default: return 'var(--text-secondary)';
  }
}

export default ToastContainer;
