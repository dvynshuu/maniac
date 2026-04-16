import { useState, useRef, useEffect } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { ChevronRight } from 'lucide-react';

export default function ToggleBlock({ block }) {
  const contentRef = useRef(null);
  const childRef = useRef(null);
  const expanded = block.properties?.expanded ?? true;
  
  const updateBlock = useBlockStore(s => s.updateBlock);
  const addBlock = useBlockStore(s => s.addBlock);
  const deleteBlock = useBlockStore(s => s.deleteBlock);
  const focusBlockId = useBlockStore(s => s.focusBlockId);

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== block.content) {
      contentRef.current.innerHTML = block.content;
    }
  }, [block.id]);

  useEffect(() => {
    if (childRef.current && childRef.current.innerHTML !== (block.properties?.childContent || '')) {
      childRef.current.innerHTML = block.properties?.childContent || '';
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
      // Focus the child content area
      if (expanded && childRef.current) {
        childRef.current.focus();
      } else {
        addBlock(block.pageId, 'text', block.id);
      }
    } else if (e.key === 'Backspace' && contentRef.current.textContent === '') {
      e.preventDefault();
      useBlockStore.getState().changeBlockType(block.id, 'text');
    }
  };

  const handleChildBlur = () => {
    const html = childRef.current?.innerHTML || '';
    if (html !== (block.properties?.childContent || '')) {
      updateBlock(block.id, {
        properties: { ...block.properties, childContent: html }
      });
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
        <div className="block-toggle-body">
          <div
            ref={childRef}
            className="block-text block-toggle-content"
            contentEditable
            suppressContentEditableWarning
            onBlur={handleChildBlur}
            data-placeholder="Empty toggle. Click to add content..."
          />
        </div>
      )}
    </div>
  );
}
