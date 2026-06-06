import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ContextMenu({ items, position, onClose }) {
    const menuRef = useRef(null);
    const [adjustedPos, setAdjustedPos] = useState({ x: -1000, y: -1000 });
    const [isPositioned, setIsPositioned] = useState(false);

    useLayoutEffect(() => {
        if (!menuRef.current) return;

        const rect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let x = position.x;
        let y = position.y;

        // Prevent overflow on the right
        if (x + rect.width > viewportWidth) {
            x = Math.max(8, viewportWidth - rect.width - 8);
        }

        // Prevent overflow on the bottom
        if (y + rect.height > viewportHeight) {
            y = Math.max(8, viewportHeight - rect.height - 8);
        }

        setAdjustedPos({ x, y });
        setIsPositioned(true);
    }, [position]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        const timer = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 10);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [onClose]);

    return createPortal(
        <div 
            className="context-menu" 
            ref={menuRef}
            style={{ 
                position: 'fixed', 
                top: adjustedPos.y, 
                left: adjustedPos.x,
                zIndex: 10000,
                opacity: isPositioned ? 1 : 0,
                pointerEvents: isPositioned ? 'auto' : 'none'
            }}
        >
            {items.map((item, idx) => {
                if (item === 'divider') return <div key={idx} className="context-menu-divider" />;
                return (
                    <button 
                        key={idx} 
                        className={`context-menu-item ${item.danger ? 'danger' : ''}`}
                        onClick={(e) => { 
                            e.stopPropagation();
                            item.action(e); 
                            onClose(); 
                        }}
                    >
                        {item.icon && <item.icon size={14} style={item.iconStyle} />}
                        {item.label}
                    </button>
                );
            })}
        </div>,
        document.body
    );
}


