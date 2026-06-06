import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { useUIStore } from '../../stores/uiStore';
import { ChevronRight, Plus, MoreHorizontal, Trash2, Copy, Archive, Star } from 'lucide-react';
import EmojiIcon from '../Common/EmojiIcon';
import ContextMenu from '../Common/ContextMenu';

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
  const [menuPos, setMenuPos] = useState(null);

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
    if (e) e.stopPropagation();
    setMenuPos(null);
    
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
    if (e) e.stopPropagation();
    setMenuPos(null);
    if (isActive) {
      navigate('/');
    }
    await archivePage(page.id);
  };

  const handleDuplicate = async (e) => {
    if (e) e.stopPropagation();
    setMenuPos(null);
    const newPage = await duplicatePage(page.id);
    if (newPage) {
      setCurrentPage(newPage.id);
      navigate(`/page/${newPage.id}`);
    }
  };

  const handleToggleFavorite = (e) => {
    if (e) e.stopPropagation();
    setMenuPos(null);
    toggleFavorite(page.id);
  };

  const menuItems = [
    {
      label: isFav ? 'Remove from Favorites' : 'Add to Favorites',
      icon: Star,
      iconStyle: isFav ? { color: 'var(--warning)', fill: 'var(--warning)' } : {},
      action: handleToggleFavorite
    },
    {
      label: 'Duplicate',
      icon: Copy,
      action: handleDuplicate
    },
    {
      label: 'Archive',
      icon: Archive,
      action: handleArchive
    },
    'divider',
    {
      label: 'Delete',
      icon: Trash2,
      action: handleDelete,
      danger: true
    }
  ];

  return (
    <div>
      <div
        className={`page-item page-item-wrapper ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuPos({ x: e.clientX, y: e.clientY });
        }}
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

        <span className="page-item-icon"><EmojiIcon emoji={page.icon || '📝'} size="16px" /></span>

        <span className="page-item-title">
          {page.title || 'Untitled'}
        </span>

        <div className="page-item-actions">
          <button className="page-item-action" onClick={handleAddChild} title="Add sub-page">
            <Plus size={14} />
          </button>
          <button
            className="page-item-action"
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setMenuPos({
                x: rect.right - 200,
                y: rect.bottom + 4
              });
            }}
            title="More options"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>

        {menuPos && (
          <ContextMenu
            items={menuItems}
            position={menuPos}
            onClose={() => setMenuPos(null)}
          />
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

