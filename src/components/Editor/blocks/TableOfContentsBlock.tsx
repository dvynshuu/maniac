import React, { useState, useEffect } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { selectHeadings, TocHeading } from '../../../core/derivedCache';
import { ListTree, ArrowUpRight } from 'lucide-react';

export default function TableOfContentsBlock({ block }: { block: any }) {
  // Scoped derivedCache selector: returns cached array instance unless headings actually changed,
  // preventing re-render thrashing and IntersectionObserver resets during typing in paragraphs.
  const headings = useBlockStore(selectHeadings);

  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

  // Track active section in viewport
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-block-id');
            if (id) setActiveHeadingId(id);
          }
        }
      },
      { rootMargin: '-10% 0px -70% 0px' }
    );

    headings.forEach((h) => {
      const el = document.querySelector(`[data-block-id="${h.id}"]`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  const handleJump = (headingId: string) => {
    const targetEl = document.querySelector<HTMLElement>(`[data-block-id="${headingId}"]`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeadingId(headingId);
      targetEl.classList.add('toc-target-pulse');
      setTimeout(() => targetEl.classList.remove('toc-target-pulse'), 1500);
    }
  };

  return (
    <div className="block-table-of-contents" contentEditable={false} suppressContentEditableWarning>
      <div className="toc-header">
        <div className="toc-header-left">
          <ListTree size={14} className="toc-header-icon" />
          <span className="toc-header-title">Table of Contents</span>
        </div>
        <span className="toc-count-badge">
          {headings.length} {headings.length === 1 ? 'SECTION' : 'SECTIONS'}
        </span>
      </div>

      {headings.length === 0 ? (
        <div className="toc-empty-hint">
          Headings (H1, H2, H3) added to this page will automatically populate here.
        </div>
      ) : (
        <nav className="toc-list" aria-label="Table of Contents">
          {headings.map((h) => {
            const indentPx = (h.level - 1) * 14;
            const isActive = activeHeadingId === h.id;

            return (
              <button
                key={h.id}
                type="button"
                className={`toc-item toc-level-${h.level} ${isActive ? 'is-active' : ''}`}
                style={{ paddingLeft: `${indentPx + 8}px` }}
                onClick={() => handleJump(h.id)}
                title={`Jump to section: ${h.text}`}
              >
                <span className="toc-item-badge">H{h.level}</span>
                <span className="toc-item-text">{h.text}</span>
                <ArrowUpRight size={11} className="toc-jump-icon" />
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
