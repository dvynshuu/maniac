import { useRef, useEffect } from 'react';

export default function ContextMenu({ items, position, onClose }) {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        setTimeout(() => document.addEventListener('click', handleClickOutside), 10);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [onClose]);

    return (
        <div 
            className="context-menu" 
            ref={menuRef}
            style={{ 
                position: 'fixed', 
                top: position.y, 
                left: position.x,
                zIndex: 1000 
            }}
        >
            {items.map((item, idx) => {
                if (item === 'divider') return <div key={idx} className="context-menu-divider" />;
                return (
                    <button 
                        key={idx} 
                        className={`context-menu-item ${item.danger ? 'danger' : ''}`}
                        onClick={() => { item.action(); onClose(); }}
                    >
                        {item.icon && <item.icon size={14} />}
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}
