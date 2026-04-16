import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';

export default function Breadcrumb() {
  const pages = usePageStore(s => s.pages);
  const location = useLocation();
  const navigate = useNavigate();

  const pageId = location.pathname.startsWith('/page/') 
    ? location.pathname.replace('/page/', '') 
    : null;

  const trail = useMemo(() => {
    if (!pageId) return [];
    const path = [];
    let current = pages.find(p => p.id === pageId);
    while (current) {
      path.unshift(current);
      current = current.parentId ? pages.find(p => p.id === current.parentId) : null;
    }
    return path;
  }, [pageId, pages]);

  if (trail.length === 0) return null;

  return (
    <div className="breadcrumb-bar">
      {trail.map((page, idx) => (
        <span key={page.id} className="breadcrumb-segment">
          {idx > 0 && <span className="breadcrumb-sep">/</span>}
          <button
            className={`breadcrumb-item ${idx === trail.length - 1 ? 'current' : ''}`}
            onClick={() => navigate(`/page/${page.id}`)}
          >
            <span className="breadcrumb-icon">{page.icon || '📝'}</span>
            <span className="breadcrumb-label">{page.title || 'Untitled'}</span>
          </button>
        </span>
      ))}
    </div>
  );
}
