import { useState, useRef, useEffect } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { Check } from 'lucide-react';

export default function TodoBlock({ block }) {
  const [content, setContent] = useState(block.content);
  const checked = block.properties?.checked || false;
  
  const contentRef = useRef(null);
  
  const updateBlock = useBlockStore((s) => s.updateBlock);
  const addBlock = useBlockStore((s) => s.addBlock);
  const deleteBlock = useBlockStore((s) => s.deleteBlock);
  const focusBlockId = useBlockStore((s) => s.focusBlockId);

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

  const handleInput = (e) => setContent(e.currentTarget.textContent);

  const handleBlur = () => {
    const currentText = contentRef.current?.textContent || "";
    if (currentText !== block.content) {
      updateBlock(block.id, { content: currentText });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      updateBlock(block.id, { content: contentRef.current.textContent });
      addBlock(block.pageId, 'todo', block.id);
    } else if (e.key === 'Backspace' && contentRef.current.textContent === '') {
      e.preventDefault();
      useBlockStore.getState().changeBlockType(block.id, 'text');
    }
  };

  const toggleChecked = () => {
      updateBlock(block.id, { 
          properties: { ...block.properties, checked: !checked } 
      });
  };

  return (
    <div className="block-todo">
      <button 
        className={`block-todo-checkbox ${checked ? 'checked animate-ping' : ''}`}
        onClick={toggleChecked}
        contentEditable={false}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </button>
      <div
        ref={contentRef}
        className={`block-text block-todo-content ${checked ? 'checked' : ''}`}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-placeholder="To-do"
      >
        {content}
      </div>
    </div>
  );
}
