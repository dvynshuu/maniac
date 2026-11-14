import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useBlockStore } from '../../stores/blockStore';
import { usePageStore } from '../../stores/pageStore';
import { cleanText } from '../../utils/activeRecallParser';
import { Layers, FileText, ChevronRight, Hash, CheckSquare, Quote, AlertCircle, List } from 'lucide-react';

interface BlockTransclusionMenuProps {
  editor: any;
  query: string;
  currentBlockId?: string;
  onSelect: (block: any, snippet: string) => void;
  onClose: () => void;
}

export default function BlockTransclusionMenu({
  editor,
  query,
  currentBlockId,
  onSelect,
  onClose
}: BlockTransclusionMenuProps) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const blockMap = useBlockStore(s => s.blockMap);
  const pages = usePageStore(s => s.pages);

  // Position relative to cursor
  useEffect(() => {
    if (!editor) return;
    try {
      const { selection } = editor.state;
      const r = editor.view.coordsAtPos(selection.from);
      if (r) {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

        let top = r.bottom + scrollTop;
        let left = r.left + scrollLeft;

        const menuHeight = 320;
        const menuWidth = 360;

        if (r.bottom + menuHeight > window.innerHeight) {
          top = r.top + scrollTop - menuHeight - 8;
        }

        if (r.left + menuWidth > window.innerWidth) {
          left = window.innerWidth + scrollLeft - menuWidth - 16;
        }

        left = Math.max(16, left);
        setCoords({ top, left });
      }
    } catch (e) {
      console.warn('[BlockTransclusionMenu] Positioning failed:', e);
    }
  }, [editor]);

  // Search across blocks
  const items = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();
    const allBlocks = Object.values(blockMap);
    const pageMap = new Map(pages.map(p => [p.id, p.title || 'Untitled Page']));

    const candidates = [];
    for (const b of allBlocks) {
      if (!b || b.id === currentBlockId) continue;
      // Skip non-textual container-only blocks
      if (['divider', 'column_list', 'column'].includes(b.type)) continue;

      const plain = cleanText(b.content || '');
      if (!plain || plain.length < 2) continue;

      if (!lowerQuery || plain.toLowerCase().includes(lowerQuery)) {
        const pageTitle = pageMap.get(b.pageId) || 'Workspace Page';
        candidates.push({
          block: b,
          snippet: plain,
          pageTitle,
          type: b.type
        });
      }

      if (candidates.length >= 15) break;
    }

    return candidates;
  }, [blockMap, pages, query, currentBlockId]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, items.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + items.length) % Math.max(1, items.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items.length > 0 && items[selectedIndex]) {
          const item = items[selectedIndex];
          onSelect(item.block, item.snippet);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [items, selectedIndex, onSelect, onClose]);

  // Scroll into view
  useEffect(() => {
    if (menuRef.current) {
      const selectedEl = menuRef.current.children[selectedIndex + 1] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const renderBlockTypeIcon = (type: string) => {
    switch (type) {
      case 'heading1':
      case 'heading2':
      case 'heading3':
      case 'toggle_heading1':
      case 'toggle_heading2':
      case 'toggle_heading3':
        return <Hash size={12} className="text-blue-400" />;
      case 'todo':
        return <CheckSquare size={12} className="text-emerald-400" />;
      case 'quote':
        return <Quote size={12} className="text-amber-400" />;
      case 'callout':
        return <AlertCircle size={12} className="text-yellow-400" />;
      case 'bullet':
      case 'numbered':
        return <List size={12} className="text-purple-400" />;
      default:
        return <FileText size={12} className="text-tertiary" />;
    }
  };

  return createPortal(
    <div
      className="slash-menu transclusion-menu"
      ref={menuRef}
      contentEditable={false}
      style={{
        position: 'absolute',
        top: coords.top,
        left: coords.left,
        width: '360px',
        maxHeight: '340px',
        zIndex: 1200,
        background: 'var(--color-surface-popover)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
        overflowY: 'auto',
        padding: '6px'
      }}
      onClick={e => e.stopPropagation()}
    >
      <div 
        className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[var(--color-border-subtle)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-fg-tertiary)]"
      >
        <Layers size={11} />
        <span>Embed Live Block Reference (((block)))</span>
      </div>

      {items.length === 0 ? (
        <div className="p-4 text-center text-xs text-[var(--color-fg-muted)]">
          No matching blocks found for "{query}"
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 mt-1">
          {items.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const shortSnippet = item.snippet.length > 55 ? `${item.snippet.substring(0, 52)}...` : item.snippet;

            return (
              <div
                key={item.block.id}
                className={`flex flex-col gap-0.5 px-3 py-1.5 rounded cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-[var(--color-surface-3)] text-[var(--color-fg)]' 
                    : 'hover:bg-[var(--color-surface-2)] text-[var(--color-fg-secondary)]'
                }`}
                onClick={() => onSelect(item.block, item.snippet)}
              >
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  {renderBlockTypeIcon(item.type)}
                  <span className="truncate">{shortSnippet}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--color-fg-tertiary)] pl-4">
                  <span>in</span>
                  <span className="truncate font-medium text-[var(--color-fg-muted)]">{item.pageTitle}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>,
    document.body
  );
}
