import React, { useMemo } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { useShallow } from 'zustand/react/shallow';
import { getPlainText } from '../../../utils/helpers';
import { ListTree, Hash } from 'lucide-react';

interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export default function TableOfContentsBlock({ block }: { block: any }) {
  const blocks = useBlockStore(
    useShallow((s) => s.blockOrder.map((id) => s.blockMap[id]).filter(Boolean))
  );

  const headings = useMemo<TocHeading[]>(() => {
    const list: TocHeading[] = [];
    for (const b of blocks) {
      let level = 0;
      if (b.type === 'heading1' || b.type === 'toggle_heading1') level = 1;
      else if (b.type === 'heading2' || b.type === 'toggle_heading2') level = 2;
      else if (b.type === 'heading3' || b.type === 'toggle_heading3') level = 3;

      if (level > 0) {
        const text = getPlainText(b.content || '').trim();
        list.push({
          id: b.id,
          text: text || `Untitled Heading ${level}`,
          level,
        });
      }
    }
    return list;
  }, [blocks]);

  const handleJump = (headingId: string) => {
    const targetEl = document.querySelector<HTMLElement>(`[data-block-id="${headingId}"]`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add subtle flash animation to highlighted heading
      targetEl.classList.add('toc-target-pulse');
      setTimeout(() => targetEl.classList.remove('toc-target-pulse'), 1500);
    }
  };

  return (
    <div className="block-table-of-contents" contentEditable={false} suppressContentEditableWarning>
      <div className="toc-header">
        <ListTree size={14} className="toc-header-icon" />
        <span className="toc-header-title">Table of Contents</span>
      </div>
      {headings.length === 0 ? (
        <div className="toc-empty-hint">
          Headings added to this page will automatically appear here.
        </div>
      ) : (
        <nav className="toc-list" aria-label="Table of Contents">
          {headings.map((h) => {
            const indentPx = (h.level - 1) * 16;
            return (
              <button
                key={h.id}
                type="button"
                className={`toc-item toc-level-${h.level}`}
                style={{ paddingLeft: `${indentPx}px` }}
                onClick={() => handleJump(h.id)}
                title={`Jump to ${h.text}`}
              >
                <span className="toc-item-marker">
                  <Hash size={11} strokeWidth={2.5} />
                </span>
                <span className="toc-item-text">{h.text}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
