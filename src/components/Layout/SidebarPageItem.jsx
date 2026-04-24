import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { useUIStore } from '../../stores/uiStore';
import { ChevronRight, Plus, MoreHorizontal, Trash2, Copy, Archive, Star } from 'lucide-react';

function SidebarPageItem({ page, depth }) {
  const currentPageId = usePageStore((s) => s.currentPageId);
  const setCurrentPage = usePageStore((s) => s.setCurrentPage);
  const addPage = usePageStore((s) => s.addPage);
  const deletePage = usePageStore((s) => s.deletePage);
  const archivePage = usePageStore((s) => s.archivePage);
  const duplicatePage = usePageStore((s) => s.duplicatePage);
  const toggleFavorite = usePageStore((s) => s.toggleFavorite);
  const expandedPages = useUIStore((s) => s.expandedPages);
  const togglePageExpanded = useUIStore((s) => s.togglePageExpanded);
  const setPageExpanded = useUIStore((s) => s.setPageExpanded);
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const isActive = currentPageId === page.id;
  const isExpanded = expandedPages[page.id] || false;
  const hasChildren = page.children && page.children.length > 0;
  const isFav = page.isFavorite || false;
  const isSelected = useUIStore((s) => s.selectedPageIds.includes(page.id));
  const selectedCount = useUIStore((s) => s.selectedPageIds.length);

  const handleClick = (e) => {
    if (window.__isDraggingSelection) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    if (selectedCount > 0) {
      useUIStore.getState().togglePageSelection(page.id);
      return;
    }
    setCurrentPage(page.id);
    navigate(`/page/${page.id}`);
  };

  const handleExpand = (e) => {
    e.stopPropagation();
    togglePageExpanded(page.id);
  };

  const handleAddChild = async (e) => {
    e.stopPropagation();
    const child = await addPage(page.id);
    setPageExpanded(page.id, true);
    setCurrentPage(child.id);
    navigate(`/page/${child.id}`);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    setShowMenu(false);
    
    if (isActive) {
      navigate('/');
      setCurrentPage(null);
    }

    const { undo, commit } = await usePageStore.getState().bulkDeletePages([page.id]);
    
    let undone = false;
    useUIStore.getState().addToast(`Deleted "${page.title || 'Untitled'}"`, 'info', {
      label: 'Undo',
      onClick: () => {
        undone = true;
        undo();
        if (isActive) {
           setCurrentPage(page.id);
           navigate(`/page/${page.id}`);
        }
      }
    });

    setTimeout(() => {
      if (!undone) commit();
    }, 5000);
  };

  const handleArchive = async (e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (isActive) {
      navigate('/');
    }
    await archivePage(page.id);
  };

  const handleDuplicate = async (e) => {
    e.stopPropagation();
    setShowMenu(false);
    const newPage = await duplicatePage(page.id);
    if (newPage) {
      setCurrentPage(newPage.id);
      navigate(`/page/${newPage.id}`);
    }
  };

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    toggleFavorite(page.id);
  };

  return (
    <div>
      <div
        className={`page-item page-item-wrapper ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        data-page-id={page.id}
        style={{ 
          paddingLeft: `${depth * 16 + 8}px`,
          background: isSelected ? 'rgba(35, 131, 226, 0.15)' : undefined
        }}
      >
        <div
          className={`page-item-expand ${isExpanded ? 'expanded' : ''}`}
          onClick={handleExpand}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          <ChevronRight size={14} />
        </div>

        <span className="page-item-icon">{page.icon || '📝'}</span>

        <span className="page-item-title">
          {page.title || 'Untitled'}
        </span>

        <div className="page-item-actions">
          <button className="page-item-action" onClick={handleAddChild} title="Add sub-page">
            <Plus size={14} />
          </button>
          <button
            className="page-item-action"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            title="More options"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>

        {showMenu && (
          <div
            className="context-menu"
            style={{ position: 'absolute', right: 0, top: '100%', zIndex: 100 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="context-menu-item" onClick={handleToggleFavorite}>
              <Star size={14} style={isFav ? { color: 'var(--warning)', fill: 'var(--warning)' } : {}} />
              {isFav ? 'Remove from Favorites' : 'Add to Favorites'}
            </button>
            <button className="context-menu-item" onClick={handleDuplicate}>
              <Copy size={14} />
              Duplicate
            </button>
            <button className="context-menu-item" onClick={handleArchive}>
              <Archive size={14} />
              Archive
            </button>
            <div className="context-menu-divider" />
            <button className="context-menu-item danger" onClick={handleDelete}>
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div className="page-item-children">
          {page.children.map((child) => (
            <SidebarPageItem key={child.id} page={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default SidebarPageItem;
