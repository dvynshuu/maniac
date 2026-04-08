import { useEffect, useRef, useState } from 'react';
import { BLOCK_TYPES, BLOCK_TYPE_META } from '../../utils/constants';
import * as Icons from 'lucide-react';

export default function SlashMenu({ query, onSelect, onClose }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef(null);

  // Filter items based on query
  const items = Object.entries(BLOCK_TYPE_META)
    .filter(([type, meta]) => 
       meta.label.toLowerCase().includes(query.toLowerCase()) || 
       type.toLowerCase().includes(query.toLowerCase())
    )
    .map(([type, meta]) => ({ type, ...meta }));

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items.length > 0) {
          onSelect(items[selectedIndex].type);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [items, selectedIndex, onSelect, onClose]);

  useEffect(() => {
      // Scroll selected item into view safely
      if (menuRef.current) {
         const selectedEl = menuRef.current.children[selectedIndex];
         if (selectedEl) {
             selectedEl.scrollIntoView({ block: 'nearest' });
         }
      }
  }, [selectedIndex]);

  if (items.length === 0) return null;

  return (
    <div className="slash-menu" ref={menuRef} contentEditable={false}>
      {items.map((item, index) => {
        const IconComponent = Icons[item.icon];
        return (
          <div
            key={item.type}
            className={`slash-menu-item ${index === selectedIndex ? 'active' : ''}`}
            onClick={() => onSelect(item.type)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="slash-menu-item-icon">
              {IconComponent && <IconComponent size={18} strokeWidth={1.5} />}
            </div>
            <div className="slash-menu-item-text">
              <span className="slash-menu-item-label">{item.label}</span>
              <span className="slash-menu-item-desc">{item.description}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
