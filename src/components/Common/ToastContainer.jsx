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
          className={`toast-pill ${toast.type}`}
        >
          <div style={{ color: getToastColor(toast.type), display: 'flex', alignItems: 'center' }}>
            {getToastIcon(toast.type)}
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{toast.message}</span>
          
          {toast.action && (
            <button 
              onClick={() => { toast.action.onClick(); removeToast(toast.id); }}
              style={{ 
                background: 'rgba(255, 255, 255, 0.06)', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                borderRadius: '12px', 
                padding: '3px 10px', 
                fontSize: '11px', 
                fontWeight: 'bold', 
                color: 'var(--accent-ember)',
                cursor: 'pointer',
                marginLeft: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-scar)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; e.currentTarget.style.color = 'var(--accent-ember)'; }}
            >
              {toast.action.label}
            </button>
          )}

          <button 
            onClick={() => removeToast(toast.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', display: 'flex', marginLeft: 'auto', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
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
