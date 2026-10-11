import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ title, onClose, onConfirm, confirmText = 'Save', confirmDisabled = false, children }) {
    
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return createPortal(
        <div className="modal-overlay" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                {onConfirm && (
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={onClose}>
                            Cancel
                        </button>
                        <button 
                            className="btn btn-primary" 
                            onClick={onConfirm}
                            disabled={confirmDisabled}
                        >
                            {confirmText}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
