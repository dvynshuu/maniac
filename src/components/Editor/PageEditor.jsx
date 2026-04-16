import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { useBlockStore } from '../../stores/blockStore';
import { useUndoStore } from '../../stores/undoStore';
import BlockRenderer from './BlockRenderer';
import SelectionToolbar from './SelectionToolbar';
import Breadcrumb from '../Layout/Breadcrumb';
import IconPicker from '../Common/IconPicker';
import { debounce } from '../../utils/helpers';
import { ImageIcon, X } from 'lucide-react';

function PageEditor() {
  const { pageId } = useParams();
  const pages = usePageStore((s) => s.pages);
  const updatePage = usePageStore((s) => s.updatePage);
  const blocks = useBlockStore((s) => s.blocks);
  const loadBlocks = useBlockStore((s) => s.loadBlocks);
  const addBlock = useBlockStore((s) => s.addBlock);
  const updateBlock = useBlockStore((s) => s.updateBlock);

  const [title, setTitle] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverHover, setShowCoverHover] = useState(false);
  const titleInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const debouncedUpdatePage = useRef(
    debounce((id, updates) => {
      updatePage(id, updates);
    }, 500)
  ).current;
  
  const page = pages.find((p) => p.id === pageId);

  useEffect(() => {
    if (pageId) {
      loadBlocks(pageId);
    }
  }, [pageId, loadBlocks]);

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
      if (blocks.length === 0) {
        await addBlock(pageId, 'text');
      } else {
        const firstBlockEl = document.querySelector(`[data-block-id="${blocks[0].id}"] .block-content [contenteditable="true"]`);
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

  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      updatePage(pageId, { coverImage: event.target.result });
    };
    reader.readAsDataURL(file);
  };

  const removeCover = () => {
    updatePage(pageId, { coverImage: null });
  };

  return (
    <div className="editor-scroll">
      <Breadcrumb />

      {/* Cover Image */}
      {page.coverImage ? (
        <div 
          className="page-cover"
          onMouseEnter={() => setShowCoverHover(true)}
          onMouseLeave={() => setShowCoverHover(false)}
        >
          <img src={page.coverImage} alt="Page cover" className="page-cover-img" />
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
          {blocks.length === 0 ? (
            <div 
              className="block-text text-placeholder" 
              style={{ padding: '4px 0', cursor: 'text', color: 'var(--text-placeholder)' }}
              onClick={() => addBlock(pageId, 'text')}
            >
              Click here or press Enter to add a block...
            </div>
          ) : (
            blocks.map((block, index) => (
              <BlockRenderer 
                key={block.id} 
                block={block} 
                index={index}
              />
            ))
          )}
        </div>
        
        {/* Extra padding at bottom for easier clicking to add new block */}
        <div 
          style={{ height: '20vh', cursor: 'text' }} 
          onClick={(e) => {
             if (e.target === e.currentTarget && blocks.length > 0) {
                 const lastBlock = blocks[blocks.length - 1];
                 addBlock(pageId, 'text', lastBlock.id);
             }
          }}
        />
        <SelectionToolbar />
      </div>
    </div>
  );
}

export default PageEditor;
