import { useEffect, useRef, useState, useMemo } from 'react';
import { getCommandsByCategory } from '../../core/slashCommandRegistry';
import * as Icons from 'lucide-react';

export default function SlashMenu({ query, onSelect, onClose, onLinkPage }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [categories, setCategories] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  // Flatten categories to a single list for keyboard navigation
  const flatItems = useMemo(() => {
    const items = [];
    for (const [cat, cmds] of categories) {
      for (const cmd of cmds) {
        items.push({ ...cmd, _category: cat });
      }
    }
    return items;
  }, [categories]);

  // Fetch commands from registry
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const result = await getCommandsByCategory(query);
        if (!cancelled) {
          setCategories(result);
          setSelectedIndex(0);
        }
      } catch (e) {
        console.warn('[SlashMenu] Failed to fetch commands:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 50); // Small debounce for async providers

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(flatItems.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + Math.max(flatItems.length, 1)) % Math.max(flatItems.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems.length > 0) {
          handleSelect(flatItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [flatItems, selectedIndex, onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const items = menuRef.current.querySelectorAll('.slash-menu-item');
      const selectedEl = items[selectedIndex];
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (item) => {
    if (item.action === 'link_page' && onLinkPage) {
      onLinkPage({ id: item.pageId, title: item.label, icon: item.pageIcon });
    } else if (item.action === 'create_block') {
      onSelect(item.type);
    } else if (item.action === 'change_type') {
      onSelect(item.type, 'change_type');
    } else {
      onSelect(item.type);
    }
  };

  if (flatItems.length === 0 && !loading) return null;

  // Track global index for keyboard nav
  let globalIndex = 0;
  let lastCategory = null;

  return (
    <div className="slash-menu" ref={menuRef} contentEditable={false}>
      {loading && flatItems.length === 0 && (
        <div className="slash-menu-loading">
          <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', padding: '8px 12px' }}>Loading...</span>
        </div>
      )}
      {flatItems.map((item) => {
        const idx = globalIndex++;
        const showCategoryHeader = item._category !== lastCategory;
        lastCategory = item._category;
        
        const IconComponent = Icons[item.icon];
        
        return (
          <div key={item.id}>
            {showCategoryHeader && (
              <div className="slash-menu-category">
                {item._category}
              </div>
            )}
            <div
              className={`slash-menu-item ${idx === selectedIndex ? 'active' : ''}`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <div className="slash-menu-item-icon">
                {item.pageIcon ? (
                  <span style={{ fontSize: '16px' }}>{item.pageIcon}</span>
                ) : IconComponent ? (
                  <IconComponent size={18} strokeWidth={1.5} />
                ) : (
                  <Icons.Zap size={18} strokeWidth={1.5} />
                )}
              </div>
              <div className="slash-menu-item-text">
                <span className="slash-menu-item-label">{item.label}</span>
                <span className="slash-menu-item-desc">{item.description}</span>
              </div>
              {item.category === 'Pages' && (
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginLeft: 'auto', paddingLeft: '8px' }}>
                  page
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
