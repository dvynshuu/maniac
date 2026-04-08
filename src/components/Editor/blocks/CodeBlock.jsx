import { useState, useRef, useEffect } from 'react';
import { useBlockStore } from '../../../stores/blockStore';

export default function CodeBlock({ block }) {
  const [content, setContent] = useState(block.content);
  const language = block.properties?.language || 'javascript';
  const contentRef = useRef(null);
  
  const updateBlock = useBlockStore(s => s.updateBlock);
  const changeBlockType = useBlockStore(s => s.changeBlockType);
  const focusBlockId = useBlockStore(s => s.focusBlockId);

  useEffect(() => {
    if (contentRef.current && contentRef.current.textContent !== block.content) {
      contentRef.current.textContent = block.content;
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
    if (e.key === 'Backspace' && contentRef.current.textContent === '') {
      e.preventDefault();
      useBlockStore.getState().changeBlockType(block.id, 'text');
    }
  };

  // Allow enter to create new lines inside code block instead of unmounting
  return (
    <div className="block-code-wrapper">
      <div className="block-code-header">
        <span>{language}</span>
      </div>
      <div
        ref={contentRef}
        className="block-code"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-placeholder="Write code here..."
      >
        {content}
      </div>
    </div>
  );
}
