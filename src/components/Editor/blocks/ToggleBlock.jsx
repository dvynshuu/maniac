import { useState, useRef, useEffect } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { ChevronRight } from 'lucide-react';
import BlockRenderer from '../BlockRenderer';
import { useShallow } from 'zustand/react/shallow';

export default function ToggleBlock({ block }) {
  const contentRef = useRef(null);
  const expanded = block.properties?.expanded ?? true;
  
  const updateBlock = useBlockStore(s => s.updateBlock);
  const addBlock = useBlockStore(s => s.addBlock);
  const focusBlockId = useBlockStore(s => s.focusBlockId);

  const childBlockIds = useBlockStore(useShallow(s => 
    s.blockOrder.filter(id => s.blockMap[id]?.parentId === block.id)
  ));

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== block.content) {
      contentRef.current.innerHTML = block.content;
    }
  }, [block.id]);

  useEffect(() => {
    if (focusBlockId === block.id && contentRef.current) {
      contentRef.current.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [focusBlockId, block.id]);

  const toggleExpanded = () => {
    updateBlock(block.id, {
      properties: { ...block.properties, expanded: !expanded }
    });
  };

  const handleHeaderInput = () => {
    // no-op, save on blur
  };

  const handleHeaderBlur = () => {
    const html = contentRef.current?.innerHTML || '';
    if (html !== block.content) {
      updateBlock(block.id, { content: html });
    }
  };

  const handleHeaderKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      updateBlock(block.id, { content: contentRef.current.innerHTML });
      
      // If expanded, add a new block inside as the first child
      if (expanded) {
        addBlock(block.pageId, 'text', null, '', {}, block.id);
      } else {
        // If collapsed, add block below toggle at the same level
        addBlock(block.pageId, 'text', block.id, '', {}, block.parentId);
      }
    } else if (e.key === 'Backspace' && contentRef.current.textContent === '') {
      e.preventDefault();
      useBlockStore.getState().changeBlockType(block.id, 'text');
    }
  };

  return (
    <div className="block-toggle">
      <div className="block-toggle-header">
        <button
          className={`block-toggle-arrow ${expanded ? 'expanded' : ''}`}
          onClick={toggleExpanded}
          contentEditable={false}
        >
          <ChevronRight size={16} />
        </button>
        <div
          ref={contentRef}
          className="block-text block-toggle-title"
          contentEditable
          suppressContentEditableWarning
          onInput={handleHeaderInput}
          onBlur={handleHeaderBlur}
          onKeyDown={handleHeaderKeyDown}
          data-placeholder="Toggle heading"
        />
      </div>
      {expanded && (
        <div className="block-toggle-body" style={{ marginLeft: '24px', paddingLeft: '4px', borderLeft: '1px solid var(--border-subtle)' }}>
          {childBlockIds.length === 0 ? (
            <div 
              className="block-text text-placeholder" 
              style={{ padding: '4px 8px', cursor: 'text', color: 'var(--text-placeholder)', fontSize: '14px' }}
              onClick={() => addBlock(block.pageId, 'text', null, '', {}, block.id)}
            >
              Empty toggle. Click to add content...
            </div>
          ) : (
            <div className="page-blocks toggle-children-blocks">
              {childBlockIds.map((id, index) => (
                <BlockRenderer key={id} blockId={id} index={index} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
