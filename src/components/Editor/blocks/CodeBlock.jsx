import { useRef, useEffect } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { debounce } from '../../../utils/helpers';

export default function CodeBlock({ block }) {
  const language = block.properties?.language || 'javascript';
  const contentRef = useRef(null);
  const localValue = useRef(block.content);
  
  const updateBlock = useBlockStore(s => s.updateBlock);
  const changeBlockType = useBlockStore(s => s.changeBlockType);
  const focusBlockId = useBlockStore(s => s.focusBlockId);

  const debouncedSave = useRef(
    debounce((id, content) => {
      updateBlock(id, { content });
    }, 800)
  ).current;

  useEffect(() => {
    if (contentRef.current && block.content !== localValue.current && contentRef.current.textContent !== block.content) {
      contentRef.current.textContent = block.content;
      localValue.current = block.content;
    }
  }, [block.id, block.content]);

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
    localValue.current = e.currentTarget.textContent;
    debouncedSave(block.id, e.currentTarget.textContent);
  };

  const handleBlur = () => {
    const currentText = contentRef.current?.textContent || "";
    if (currentText !== block.content) {
      localValue.current = currentText;
      updateBlock(block.id, { content: currentText });
    }
  };

  const handleKeyDown = (e) => {
    // Tab for indentation inside code
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
    }
    if (e.key === 'Backspace' && contentRef.current.textContent === '') {
      e.preventDefault();
      changeBlockType(block.id, 'text');
    }
  };

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
        spellCheck={false}
      ></div>
    </div>
  );
}
