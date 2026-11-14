import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageStore } from '../../../stores/pageStore';
import EmojiIcon from '../../Common/EmojiIcon';
import { ChevronRight, Home } from 'lucide-react';
import { useBlockStore } from '../../../stores/blockStore';

export default function BreadcrumbBlock({ block }: { block: any }) {
  const pages = usePageStore(s => s.pages);
  const navigate = useNavigate();
  const focusBlockId = useBlockStore(s => s.focusBlockId);

  const delimiter = block.properties?.delimiter || '/';
  const showRoot = block.properties?.showRoot ?? true;

  const targetPageId = block.pageId;

  const trail = useMemo(() => {
    if (!targetPageId) return [];
    const path: any[] = [];
    let current = pages.find(p => p.id === targetPageId);
    while (current) {
      path.unshift(current);
      current = current.parentId ? pages.find(p => p.id === current.parentId) : null;
    }
    return path;
  }, [targetPageId, pages]);

  if (trail.length === 0) {
    return (
      <div className="block-breadcrumb-empty">
        <span className="text-xs text-tertiary">Breadcrumb navigation trail</span>
      </div>
    );
  }

  return (
    <div 
      className="block-breadcrumb-wrapper"
      tabIndex={0}
      style={{
        outline: focusBlockId === block.id ? '2px solid var(--accent-primary, #6366f1)' : 'none'
      }}
    >
      <nav className="block-breadcrumb-nav" aria-label="Breadcrumb">
        {showRoot && (
          <span className="block-breadcrumb-segment">
            <button
              type="button"
              className="block-breadcrumb-crumb root-crumb"
              onClick={() => navigate('/app')}
              title="Workspace Home"
            >
              <Home size={13} />
            </button>
            <span className="block-breadcrumb-separator">{delimiter}</span>
          </span>
        )}

        {trail.map((page, idx) => {
          const isLast = idx === trail.length - 1;
          return (
            <span key={page.id} className="block-breadcrumb-segment">
              {idx > 0 && <span className="block-breadcrumb-separator">{delimiter}</span>}
              <button
                type="button"
                className={`block-breadcrumb-crumb ${isLast ? 'is-current' : ''}`}
                onClick={() => {
                  if (!isLast) {
                    navigate(`/app/page/${page.id}`);
                  }
                }}
                title={page.title || 'Untitled'}
              >
                <span className="crumb-icon">
                  <EmojiIcon emoji={page.icon || '📝'} size="13px" />
                </span>
                <span className="crumb-title">
                  {page.title || 'Untitled'}
                </span>
              </button>
            </span>
          );
        })}
      </nav>
    </div>
  );
}
