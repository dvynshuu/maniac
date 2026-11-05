import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export type ContextMenuItem = ContextMenuItemObject | string;

export interface ContextMenuItemObject {
  label: string;
  icon?: any;
  iconStyle?: React.CSSProperties;
  action?: (e?: any) => void;
  danger?: boolean;
  children?: ContextMenuItem[];
  tag?: string;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export default function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x: -1000, y: -1000 });
  const [isPositioned, setIsPositioned] = useState(false);
  const [menuStack, setMenuStack] = useState<{ title: string; items: ContextMenuItem[] }[]>([]);

  const currentItems = menuStack.length > 0 ? menuStack[menuStack.length - 1].items : items;
  const currentTitle = menuStack.length > 0 ? menuStack[menuStack.length - 1].title : null;

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
  }, [position, menuStack.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menuStack.length > 0) {
          setMenuStack(prev => prev.slice(0, -1));
        } else {
          onClose();
        }
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, menuStack.length]);

  const popMenu = () => {
    setMenuStack(prev => prev.slice(0, -1));
  };

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
      {/* Submenu Back Header */}
      {currentTitle && (
        <div className="context-menu-header">
          <button 
            type="button" 
            className="context-menu-back-btn" 
            onClick={(e) => {
              e.stopPropagation();
              popMenu();
            }}
          >
            <ChevronLeft size={14} />
            <span>{currentTitle}</span>
          </button>
        </div>
      )}

      {currentItems.map((item, idx) => {
        if (typeof item === 'string') {
          return <div key={`divider-${idx}`} className="context-menu-divider" />;
        }

        const hasSubmenu = Array.isArray(item.children) && item.children.length > 0;

        return (
          <button 
            key={idx} 
            type="button"
            className={`context-menu-item ${item.danger ? 'danger' : ''} ${hasSubmenu ? 'has-submenu' : ''}`}
            onClick={(e) => { 
              e.stopPropagation();
              if (hasSubmenu && item.children) {
                setMenuStack(prev => [...prev, { title: item.label, items: item.children! }]);
              } else if (item.action) {
                item.action(e); 
                onClose(); 
              }
            }}
          >
            <div className="context-menu-item-left">
              {item.icon && <item.icon size={14} style={item.iconStyle} className="context-menu-item-icon" />}
              <span className="context-menu-item-label">{item.label}</span>
            </div>

            {item.tag && (
              <span className="context-menu-item-tag">{item.tag}</span>
            )}

            {hasSubmenu && (
              <ChevronRight size={13} className="context-menu-submenu-chevron" />
            )}
          </button>
        );
      })}
    </div>,
    document.body
  );
}
