import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { useBlockStore } from '../../stores/blockStore';
import BlockRenderer from './BlockRenderer';
import SelectionToolbar from './SelectionToolbar';
import IconPicker from '../Common/IconPicker';
import { debounce } from '../../utils/helpers';

function PageEditor() {
  const { pageId } = useParams();
  const pages = usePageStore((s) => s.pages);
  const updatePage = usePageStore((s) => s.updatePage);
  const blocks = useBlockStore((s) => s.blocks);
  const loadBlocks = useBlockStore((s) => s.loadBlocks);
  const addBlock = useBlockStore((s) => s.addBlock);

  const [title, setTitle] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const titleInputRef = useRef(null);

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
    if (page) {
      setTitle(page.title);
      // Auto-resize title textarea
      if (titleInputRef.current) {
        titleInputRef.current.style.height = 'auto';
        titleInputRef.current.style.height = titleInputRef.current.scrollHeight + 'px';
      }
    }
  }, [page]);

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
        // Focus the first block's editable area
        const firstBlockEl = document.querySelector(`[data-block-id="${blocks[0].id}"] .block-content [contenteditable="true"]`);
        if (firstBlockEl) {
           firstBlockEl.focus();
           // set cursor to start
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

  return (
    <div className="editor-scroll">
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
