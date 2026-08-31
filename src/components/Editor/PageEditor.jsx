import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { useBlockStore } from '../../stores/blockStore';
import { useShallow } from 'zustand/react/shallow';
import { useUIStore } from '../../stores/uiStore';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import BlockRenderer from './BlockRenderer';
import SelectionToolbar from './SelectionToolbar';
import Breadcrumb from '../Layout/Breadcrumb';
import IconPicker from '../Common/IconPicker';
import EmojiIcon from '../Common/EmojiIcon';
import CoverPickerModal from './CoverPickerModal';
import PageOptionsMenu from './PageOptionsMenu';
import { debounce } from '../../utils/helpers';
import { 
  ImageIcon, 
  X, 
  Cloud, 
  Brain, 
  Focus, 
  AlignCenter, 
  Star, 
  MoreHorizontal, 
  Sparkles, 
  Smile, 
  FileText, 
  Lock,
  Maximize2
} from 'lucide-react';
import { storeBlob, loadBlobUrl, isBlobRef } from '../../utils/blobService';
import BacklinksPanel from './BacklinksPanel';
import { useRootBlockIds } from '../../hooks/useChildBlockIds';
import { useEditorEngine } from '../../hooks/useEditorEngine';
import { useSelectionStore } from '../../core/editor/selectionStore';
import { useBlockVirtualizer, VirtualizerProvider } from '../../hooks/useBlockVirtualizer';
import { DragDropContext } from './DragDropContext';
import ActiveRecallPanel from './ActiveRecallPanel';

function PageEditor({ pageId: pageIdProp } = {}) {
  const { pageId: paramPageId } = useParams();
  const pageId = pageIdProp || paramPageId;
  const page = usePageStore(useShallow((s) => s.pages.find((p) => p.id === pageId)));
  const updatePage = usePageStore((s) => s.updatePage);
  const toggleFavorite = usePageStore((s) => s.toggleFavorite);
  const rootBlockIds = useRootBlockIds();
  const loadBlocks = useBlockStore((s) => s.loadBlocks);
  const setLastVisitedPageId = useUIStore((s) => s.setLastVisitedPageId);
  const isSaving = useUIStore((s) => s.isSaving);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTypewriterMode, setIsTypewriterMode] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showPageOptions, setShowPageOptions] = useState(false);
  const [pageOptionsPos, setPageOptionsPos] = useState({ top: 48, right: 32 });
  const [showCoverHover, setShowCoverHover] = useState(false);
  const [coverUrl, setCoverUrl] = useState(null);
  const [showSrsPopover, setShowSrsPopover] = useState(false);
  const titleInputRef = useRef(null);
  const descInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const moreBtnRef = useRef(null);
  const [scrollElement, setScrollElement] = useState(null);

  const engine = useEditorEngine();
  const setSelection = useSelectionStore(s => s.setSelection);
  const selection = useSelectionStore(useShallow(s => ({
    anchorBlockId: s.anchorBlockId,
    focusBlockId: s.focusBlockId
  })));

  // Block virtualization — only renders blocks within viewport + overscan
  const virtualizer = useBlockVirtualizer(scrollElement, rootBlockIds, pageId);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const dragPositionRef = useRef(null);
  const [dragState, setDragState] = useState({
    activeId: null,
    overId: null,
    dropPosition: null,
  });

  const handleDragStart = useCallback((event) => {
    setDragState({
      activeId: event.active.id,
      overId: null,
      dropPosition: null,
    });
    dragPositionRef.current = null;
  }, []);

  const handleDragMove = useCallback((event) => {
    const { active, over } = event;
    if (!active || !over) {
      setDragState((prev) => ({
        ...prev,
        overId: null,
        dropPosition: null,
      }));
      dragPositionRef.current = null;
      return;
    }

    let pos = 'bottom';
    if (active.rect.current.translated && over.rect) {
      const activeCenterY = active.rect.current.translated.top + active.rect.current.translated.height / 2;
      const overCenterY = over.rect.top + over.rect.height / 2;
      pos = activeCenterY < overCenterY ? 'top' : 'bottom';
    }

    dragPositionRef.current = pos;
    setDragState({
      activeId: active.id,
      overId: over.id,
      dropPosition: pos,
    });
  }, []);

  const handleDragCancel = useCallback(() => {
    setDragState({
      activeId: null,
      overId: null,
      dropPosition: null,
    });
    dragPositionRef.current = null;
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    // Clear states immediately
    setDragState({
      activeId: null,
      overId: null,
      dropPosition: null,
    });
    const dropPosition = dragPositionRef.current || 'bottom';
    dragPositionRef.current = null;

    if (!active || !over || active.id === over.id) return;

    const store = useBlockStore.getState();
    const { blockMap, blockOrder } = store;

    const activeBlock = blockMap[active.id];
    const overBlock = blockMap[over.id];
    if (!activeBlock || !overBlock) return;

    let targetParentId = null;
    let targetAfterBlockId = null;

    if (overBlock.type === 'column') {
      // Dragging directly onto a column container (e.g. empty column or header)
      targetParentId = overBlock.id;
      // Put at the end of the column
      const columnChildren = blockOrder.filter(id => blockMap[id]?.parentId === overBlock.id);
      targetAfterBlockId = columnChildren.length > 0 ? columnChildren[columnChildren.length - 1] : null;
    } else {
      // Dragging onto a normal block
      targetParentId = overBlock.parentId || null;
      const siblings = blockOrder.filter(id => 
        (blockMap[id]?.parentId || null) === targetParentId && id !== active.id
      );
      const overIndexInSiblings = siblings.indexOf(over.id);
      
      if (dropPosition === 'top') {
        // Place it before the overBlock
        targetAfterBlockId = overIndexInSiblings > 0 ? siblings[overIndexInSiblings - 1] : null;
      } else {
        // Place it after the overBlock
        targetAfterBlockId = over.id;
      }
    }

    // Normalizer/safety check to avoid cycles
    if (targetParentId === active.id) return;

    engine.move(active.id, targetParentId, targetAfterBlockId);
  }, [engine]);

  const debouncedUpdatePage = useRef(
    debounce((id, updates) => {
      updatePage(id, updates);
    }, 500)
  ).current;

  useEffect(() => {
    if (pageId) {
      loadBlocks(pageId);
      setLastVisitedPageId(pageId);
    }
  }, [pageId, loadBlocks, setLastVisitedPageId]);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      const link = e.target.closest('a');
      if (link && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      }
    };
    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, []);

  useEffect(() => {
    if (page) {
      setTitle(page.title || '');
      setDescription(page.description || '');
      setShowDescriptionInput(!!page.description);
      if (titleInputRef.current) {
        titleInputRef.current.style.height = 'auto';
        titleInputRef.current.style.height = titleInputRef.current.scrollHeight + 'px';
      }
    }
  }, [page]);

  useEffect(() => {
    let cancelled = false;
    const src = page?.coverImage;
    if (!src) {
      setCoverUrl(null);
      return;
    }
    if (isBlobRef(src)) {
      loadBlobUrl(src).then(url => {
        if (!cancelled) setCoverUrl(url);
      });
    } else {
      setCoverUrl(src);
    }
    return () => { cancelled = true; };
  }, [page?.coverImage]);

  if (!page) {
    return <div className="editor-container">Page not found.</div>;
  }

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
    debouncedUpdatePage(pageId, { title: newTitle });
  };

  const handleDescriptionChange = (e) => {
    const newDesc = e.target.value;
    setDescription(newDesc);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
    debouncedUpdatePage(pageId, { description: newDesc });
  };

  const handleTitleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showDescriptionInput && descInputRef.current) {
        descInputRef.current.focus();
        return;
      }
      if (rootBlockIds.length === 0) {
        await engine.insertAfter(null, 'text');
      } else {
        const firstBlockEl = document.querySelector(`[data-block-id="${rootBlockIds[0]}"] .block-content [contenteditable="true"]`);
        if (firstBlockEl) {
           firstBlockEl.focus();
           const selection = window.getSelection();
           const range = document.createRange();
           range.selectNodeContents(firstBlockEl);
           range.collapse(true);
           selection.removeAllRanges();
           selection.addRange(range);
        }
      }
    }
  };

  const handleIconSelect = (icon) => {
    updatePage(pageId, { icon });
    setShowIconPicker(false);
  };

  const handleAddIcon = () => {
    const DEFAULT_EMOJIS = ['📝', '✨', '💡', '🚀', '🎯', '🌿', '⚡', '🔥', '📚', '🎨'];
    const randomEmoji = DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)];
    updatePage(pageId, { icon: randomEmoji });
  };

  const handleAddCover = () => {
    setShowCoverPicker(true);
  };

  const handleAddDescription = () => {
    setShowDescriptionInput(true);
    setTimeout(() => {
      descInputRef.current?.focus();
    }, 50);
  };

  const removeCover = () => {
    updatePage(pageId, { coverImage: null });
  };

  const handleOpenPageOptions = () => {
    const rect = moreBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setPageOptionsPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setShowPageOptions(true);
  };

  useEffect(() => {
    const handleShortcuts = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFocusMode((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setIsTypewriterMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, []);

  const isModal = !!pageIdProp;
  const isLocked = !!page?.isLocked;
  const fontStyle = page?.fontStyle || 'sans';
  const isFullWidth = page?.fullWidth !== false;
  const isSmallText = !!page?.smallText;
  const isFav = !!page?.isFavorite;

  return (
    <div 
      className={`editor-scroll page-transition-enter ${isModal ? 'is-modal-editor' : ''} ${isFocusMode ? 'is-focus-mode' : ''} ${isTypewriterMode ? 'is-typewriter-mode' : ''}`} 
      ref={setScrollElement}
    >
      {!isModal && (
        <div 
          className="editor-topbar-wrapper"
          style={{ paddingLeft: sidebarOpen ? '32px' : '56px', paddingRight: '32px' }}
        >
          <Breadcrumb />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-tertiary)', fontSize: '12px', position: 'relative' }}>
            {/* Favorite Star Button */}
            <button
              onClick={() => toggleFavorite(pageId)}
              className={`editor-toolbar-btn ${isFav ? 'active' : ''}`}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star size={13} style={isFav ? { color: 'var(--warning)', fill: 'var(--warning)' } : {}} />
            </button>

            {/* Lock Indicator */}
            {isLocked && (
              <div className="editor-lock-badge" title="Page is locked (editing disabled)">
                <Lock size={12} />
                <span>Locked</span>
              </div>
            )}

            {/* Focus / Zen Mode Button */}
            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`editor-toolbar-btn ${isFocusMode ? 'active' : ''}`}
              title="Focus Mode: Dim non-active blocks (Ctrl+Shift+F)"
            >
              <Focus size={13} />
              <span>{isFocusMode ? 'Focus On' : 'Focus'}</span>
            </button>

            {/* Typewriter Mode Button */}
            <button
              onClick={() => setIsTypewriterMode(!isTypewriterMode)}
              className={`editor-toolbar-btn ${isTypewriterMode ? 'active' : ''}`}
              title="Typewriter Mode: Keep cursor centered (Ctrl+Shift+T)"
            >
              <AlignCenter size={13} />
              <span>{isTypewriterMode ? 'Typewriter On' : 'Typewriter'}</span>
            </button>

            {/* Active Recall / SRS Button */}
            <button
              onClick={() => setShowSrsPopover(!showSrsPopover)}
              className={`editor-toolbar-btn ${page.srsEnabled ? 'active active-recall' : ''}`}
            >
              <Brain size={13} />
              <span>Active Recall</span>
              {page.srsEnabled && page.srsNextReview && page.srsNextReview <= Date.now() && (
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />
              )}
            </button>

            {showSrsPopover && (
              <ActiveRecallPanel 
                page={page} 
                updatePage={updatePage} 
                onClose={() => setShowSrsPopover(false)} 
              />
            )}

            {/* Full Width / Standard Width Toggle */}
            <button
              onClick={() => updatePage(pageId, { fullWidth: !isFullWidth })}
              className={`editor-toolbar-btn ${isFullWidth ? 'active' : ''}`}
              title={isFullWidth ? 'Switch to centered width' : 'Switch to full width (expand across screen)'}
            >
              <Maximize2 size={13} />
              <span>{isFullWidth ? 'Full width' : 'Centered'}</span>
            </button>

            {/* More Options Menu Trigger */}
            <button
              ref={moreBtnRef}
              onClick={handleOpenPageOptions}
              className="editor-toolbar-btn"
              title="Page style & options"
            >
              <MoreHorizontal size={14} />
            </button>

            {/* Save Status Indicator */}
            <div className="editor-save-indicator">
              {isSaving ? (
                <>
                  <Cloud size={13} className="animate-pulse" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Cloud size={13} style={{ color: 'var(--success)' }} />
                  <span>Saved</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Page Cover Banner */}
      {page.coverImage ? (
        <div 
          className="page-cover-enhanced"
          onMouseEnter={() => setShowCoverHover(true)}
          onMouseLeave={() => setShowCoverHover(false)}
        >
          {coverUrl && !coverUrl.startsWith('linear-gradient') && !coverUrl.startsWith('radial-gradient') ? (
            <img src={coverUrl} alt="Page cover" className="page-cover-img" />
          ) : (
            <div className="page-cover-gradient-bg" style={{ background: coverUrl || page.coverImage }} />
          )}
          <div className="page-cover-gradient" />
          {showCoverHover && (
            <div className="page-cover-actions">
              <button className="page-cover-btn" onClick={() => setShowCoverPicker(true)}>
                <Sparkles size={13} /> Change cover
              </button>
              <button className="page-cover-btn page-cover-btn-danger" onClick={removeCover}>
                <X size={13} /> Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="page-cover-add-area">
          <button className="page-cover-add-btn" onClick={() => setShowCoverPicker(true)}>
            <ImageIcon size={13} /> Add cover
          </button>
        </div>
      )}

      {/* Main Document Content Canvas */}
      <div className={`editor-container font-${fontStyle} ${isFullWidth ? 'is-full-width' : ''} ${isSmallText ? 'is-small-text' : ''} ${isLocked ? 'is-locked-view' : ''}`}>
        
        {/* Top Action Bar (Add Icon / Add Cover / Add Description) */}
        {(!page.icon || !page.coverImage || !showDescriptionInput) && (
          <div className="page-header-action-bar">
            {!page.icon && (
              <button className="page-header-action-btn" onClick={handleAddIcon}>
                <Smile size={13} /> Add icon
              </button>
            )}
            {!page.coverImage && (
              <button className="page-header-action-btn" onClick={handleAddCover}>
                <ImageIcon size={13} /> Add cover
              </button>
            )}
            {!showDescriptionInput && (
              <button className="page-header-action-btn" onClick={handleAddDescription}>
                <FileText size={13} /> Add description
              </button>
            )}
          </div>
        )}

        {/* Page Icon Picker Trigger */}
        {page.icon && (
          <div style={{ position: 'relative' }}>
            <button 
              className={`page-icon-btn ${page.coverImage ? 'has-cover' : ''}`}
              onClick={() => setShowIconPicker(!showIconPicker)}
              title="Click to change icon"
            >
              <EmojiIcon emoji={page.icon} size="36px" />
            </button>
            
            {showIconPicker && (
              <IconPicker 
                onSelect={handleIconSelect} 
                onClose={() => setShowIconPicker(false)} 
              />
            )}
          </div>
        )}

        {/* Document Title Input */}
        <textarea
          ref={titleInputRef}
          className="page-title-input"
          placeholder="Untitled"
          value={title}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          disabled={isLocked}
          rows={1}
        />

        {/* Optional Page Description */}
        {showDescriptionInput && (
          <textarea
            ref={descInputRef}
            className="page-description-input"
            placeholder="Add a page description..."
            value={description}
            onChange={handleDescriptionChange}
            disabled={isLocked}
            rows={1}
          />
        )}

        {/* Modular Page Blocks */}
        <div className="page-blocks">
          {rootBlockIds.length === 0 ? (
            <div 
              className="block-text text-placeholder" 
              style={{ padding: '6px 0', cursor: 'text', color: 'var(--text-placeholder)' }}
              onClick={() => !isLocked && engine.insertAfter(null, 'text')}
            >
              {isLocked ? 'Page is locked.' : 'Click here or press Enter to add a block...'}
            </div>
          ) : (
            <DragDropContext.Provider value={dragState}>
              <VirtualizerProvider value={virtualizer}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragMove={handleDragMove}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <SortableContext items={rootBlockIds.filter(Boolean)} strategy={verticalListSortingStrategy}>
                    {rootBlockIds.filter(Boolean).map((id, index) => (
                      <BlockRenderer
                        key={id}
                        blockId={id}
                        index={index}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </VirtualizerProvider>
            </DragDropContext.Provider>
          )}
        </div>
        
        <div 
          style={{ height: '20vh', cursor: isLocked ? 'default' : 'text' }} 
          onClick={(e) => {
             if (!isLocked && e.target === e.currentTarget && rootBlockIds.length > 0) {
                 const lastId = rootBlockIds[rootBlockIds.length - 1];
                 engine.insertAfter(lastId, 'text');
             }
          }}
        />
        <BacklinksPanel pageId={pageId} />
        {!isLocked && <SelectionToolbar />}
      </div>

      {/* Cover Picker Modal */}
      {showCoverPicker && (
        <CoverPickerModal 
          onSelectCover={(cover) => updatePage(pageId, { coverImage: cover })} 
          onClose={() => setShowCoverPicker(false)} 
        />
      )}

      {/* Page Options / More Menu Popover */}
      {showPageOptions && (
        <PageOptionsMenu 
          page={page} 
          updatePage={updatePage} 
          onClose={() => setShowPageOptions(false)} 
          position={pageOptionsPos} 
        />
      )}
    </div>
  );
}

export default PageEditor;
