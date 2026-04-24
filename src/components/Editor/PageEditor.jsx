import { useState, useEffect, useRef, useCallback } from 'react';
import VirtualList from '../Common/VirtualList';

import { useParams } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { useBlockStore } from '../../stores/blockStore';
import { useShallow } from 'zustand/react/shallow';
import { useUndoStore } from '../../stores/undoStore';
import { useUIStore } from '../../stores/uiStore';
import BlockRenderer from './BlockRenderer';
import SelectionToolbar from './SelectionToolbar';
import Breadcrumb from '../Layout/Breadcrumb';
import IconPicker from '../Common/IconPicker';
import { debounce } from '../../utils/helpers';
import { ImageIcon, X, Cloud, CloudCheck } from 'lucide-react';
import { storeBlob, loadBlobUrl, isBlobRef } from '../../utils/blobService';

function PageEditor() {
  const { pageId } = useParams();
  const pages = usePageStore((s) => s.pages);
  const updatePage = usePageStore((s) => s.updatePage);
  const rootBlockIds = useBlockStore(useShallow((s) => s.blockOrder.filter(id => !s.blockMap[id]?.parentId)));
  const loadBlocks = useBlockStore((s) => s.loadBlocks);
  const addBlock = useBlockStore((s) => s.addBlock);
  const updateBlock = useBlockStore((s) => s.updateBlock);
  const setLastVisitedPageId = useUIStore((s) => s.setLastVisitedPageId);
  const isSaving = useUIStore((s) => s.isSaving);

  const [title, setTitle] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverHover, setShowCoverHover] = useState(false);
  const [coverUrl, setCoverUrl] = useState(null);
  const titleInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const scrollRef = useRef(null);

  const debouncedUpdatePage = useRef(
    debounce((id, updates) => {
      updatePage(id, updates);
    }, 500)
  ).current;
  
  const page = pages.find((p) => p.id === pageId);

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
      setTitle(page.title);
      // Auto-resize title textarea
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

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        const snapshot = useUndoStore.getState().undo();
        if (snapshot) {
          e.preventDefault();
          updateBlock(snapshot.blockId, { content: snapshot.oldContent });
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        const snapshot = useUndoStore.getState().redo();
        if (snapshot) {
          e.preventDefault();
          updateBlock(snapshot.blockId, { content: snapshot.newContent });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [updateBlock]);

  if (!page) {
    return <div className="editor-container">Page not found.</div>;
  }

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';

    debouncedUpdatePage(pageId, { title: newTitle });
  };

  const handleTitleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (rootBlockIds.length === 0) {
        await addBlock(pageId, 'text');
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

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ref = await storeBlob(file);
    updatePage(pageId, { coverImage: ref });
  };

  const removeCover = () => {
    updatePage(pageId, { coverImage: null });
  };

  return (
    <div className="editor-scroll" ref={scrollRef}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
        <Breadcrumb />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
          {isSaving ? (
            <>
              <Cloud size={14} className="animate-pulse" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Cloud size={14} style={{ color: 'var(--success)' }} />
              <span>Saved</span>
            </>
          )}
        </div>
      </div>

      {/* Cover Image */}
      {page.coverImage ? (
        <div 
          className="page-cover"
          onMouseEnter={() => setShowCoverHover(true)}
          onMouseLeave={() => setShowCoverHover(false)}
        >
          {coverUrl && <img src={coverUrl} alt="Page cover" className="page-cover-img" />}
          {showCoverHover && (
            <div className="page-cover-actions">
              <button className="page-cover-btn" onClick={() => coverInputRef.current?.click()}>
                Change cover
              </button>
              <button className="page-cover-btn page-cover-btn-danger" onClick={removeCover}>
                <X size={14} /> Remove
              </button>
            </div>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverUpload} />
        </div>
      ) : (
        <div className="page-cover-add-area">
          <button className="page-cover-add-btn" onClick={() => coverInputRef.current?.click()}>
            <ImageIcon size={14} /> Add cover
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverUpload} />
        </div>
      )}

      <div className="editor-container">
        <div style={{ position: 'relative' }}>
          <button 
            className="page-icon-btn"
            onClick={() => setShowIconPicker(!showIconPicker)}
          >
            {page.icon || '📝'}
          </button>
          
          {showIconPicker && (
            <IconPicker 
              onSelect={handleIconSelect} 
              onClose={() => setShowIconPicker(false)} 
            />
          )}
        </div>

        <textarea
          ref={titleInputRef}
          className="page-title-input"
          placeholder="Untitled"
          value={title}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          rows={1}
        />

        <div className="page-blocks">
          {rootBlockIds.length === 0 ? (
            <div 
              className="block-text text-placeholder" 
              style={{ padding: '4px 0', cursor: 'text', color: 'var(--text-placeholder)' }}
              onClick={() => addBlock(pageId, 'text')}
            >
              Click here or press Enter to add a block...
            </div>
          ) : (
            <VirtualList 
              items={rootBlockIds}
              dynamic={true}
              itemHeight={32}
              scrollContainerRef={scrollRef}
              renderItem={(id, index) => (
                <BlockRenderer 
                  key={id} 
                  blockId={id} 
                  index={index}
                />
              )}
            />
          )}
        </div>
        
        {/* Extra padding at bottom for easier clicking to add new block */}
        <div 
          style={{ height: '20vh', cursor: 'text' }} 
          onClick={(e) => {
             if (e.target === e.currentTarget && rootBlockIds.length > 0) {
                 const lastId = rootBlockIds[rootBlockIds.length - 1];
                 addBlock(pageId, 'text', lastId);
             }
          }}
        />
        <SelectionToolbar />
      </div>
    </div>
  );
}

export default PageEditor;
