import { useEffect, useRef, useState, useMemo } from 'react';
import { usePageStore } from '../../stores/pageStore';
import { FileText } from 'lucide-react';

export default function MentionMenu({ query, onSelect, onClose }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef(null);
  const pages = usePageStore(s => s.pages);

  const items = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    return pages
      .filter(p => !p.isArchived && (p.title || 'Untitled').toLowerCase().includes(lowerQuery))
      .slice(0, 10);
  }, [pages, query]);

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
          onSelect(items[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [items, selectedIndex, onSelect, onClose]);

  useEffect(() => {
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
      <div className="slash-menu-item-desc" style={{ padding: '8px 12px', fontSize: '10px', textTransform: 'uppercase' }}>
        Mention Page
      </div>
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`slash-menu-item ${index === selectedIndex ? 'active' : ''}`}
          onClick={() => onSelect(item)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="slash-menu-item-icon">
            {item.icon || <FileText size={16} />}
          </div>
          <div className="slash-menu-item-text">
            <span className="slash-menu-item-label">{item.title || 'Untitled'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
