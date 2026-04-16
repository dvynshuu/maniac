import { useState, useRef, useEffect } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { useUndoStore } from '../../../stores/undoStore';
import { BLOCK_TYPES } from '../../../utils/constants';

export default function HeadingBlock({ block }) {
  const [content, setContent] = useState(block.content);
  const contentRef = useRef(null);
  const lastPushedContent = useRef(block.content);
  
  const updateBlock = useBlockStore((s) => s.updateBlock);
  const addBlock = useBlockStore((s) => s.addBlock);
  const deleteBlock = useBlockStore((s) => s.deleteBlock);
  const focusBlockId = useBlockStore((s) => s.focusBlockId);
  const pushUndo = useUndoStore((s) => s.pushUndo);

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

  const handleInput = (e) => {
    const html = e.currentTarget.innerHTML;
    setContent(html);
    
    if (html !== lastPushedContent.current) {
        if (lastPushedContent.current === block.content) {
            pushUndo({ blockId: block.id, oldContent: block.content, newContent: html });
        }
        lastPushedContent.current = html;
    }
  };

  const handleBlur = () => {
    const currentHTML = contentRef.current?.innerHTML || "";
    if (currentHTML !== block.content) {
      updateBlock(block.id, { content: currentHTML });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      updateBlock(block.id, { content: contentRef.current.innerHTML });
      addBlock(block.pageId, 'text', block.id);
    } else if (e.key === 'Backspace' && contentRef.current.textContent === '') {
      e.preventDefault();
      deleteBlock(block.id);
    }
  };

  const getClassName = () => {
      if (block.type === BLOCK_TYPES.HEADING1) return "block-heading1";
      if (block.type === BLOCK_TYPES.HEADING2) return "block-heading2";
      if (block.type === BLOCK_TYPES.HEADING3) return "block-heading3";
      return "block-heading1";
  }

  return (
    <div
      ref={contentRef}
      className={`block-text ${getClassName()}`}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      data-placeholder={`Heading ${block.type.replace('heading', '')}`}
    ></div>
  );
}
