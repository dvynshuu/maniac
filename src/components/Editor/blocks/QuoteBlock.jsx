import { useState, useRef, useEffect } from 'react';
import { useBlockStore } from '../../../stores/blockStore';

export default function QuoteBlock({ block }) {
  const [content, setContent] = useState(block.content);
  const contentRef = useRef(null);
  
  const updateBlock = useBlockStore(s => s.updateBlock);
  const addBlock = useBlockStore(s => s.addBlock);
  const deleteBlock = useBlockStore(s => s.deleteBlock);
  const changeBlockType = useBlockStore(s => s.changeBlockType);
  const focusBlockId = useBlockStore(s => s.focusBlockId);

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

  const handleInput = (e) => setContent(e.currentTarget.innerHTML);

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
    } else if (e.key === 'Backspace' && contentRef.current.innerHTML === '') {
      e.preventDefault();
      useBlockStore.getState().changeBlockType(block.id, 'text');
    }
  };

  return (
    <div className="block-quote">
      <div
        ref={contentRef}
        className="block-text"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-placeholder="Empty quote"
      ></div>
    </div>
  );
}
