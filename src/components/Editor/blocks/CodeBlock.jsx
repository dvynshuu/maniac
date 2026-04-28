import { useRef, useEffect, useState } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { debounce } from '../../../utils/helpers';
import { Copy, Check } from 'lucide-react';

const COMMON_LANGUAGES = [
  'plain text', 'javascript', 'typescript', 'python', 'java', 'c', 'cpp',
  'csharp', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'html', 'css',
  'sql', 'bash', 'json', 'yaml', 'xml', 'markdown', 'dockerfile', 'graphql',
];

export default function CodeBlock({ block }) {
  const language = block.properties?.language || 'javascript';
  const caption = block.properties?.caption || '';
  const contentRef = useRef(null);
  const localValue = useRef(block.content);
  const [copied, setCopied] = useState(false);
  
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
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
    }
    if (e.key === 'Backspace' && contentRef.current.textContent === '') {
      e.preventDefault();
      changeBlockType(block.id, 'text');
    }
  };

  const handleCopy = async () => {
    const text = contentRef.current?.textContent || block.content || '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard access denied */ }
  };

  const handleLanguageChange = (e) => {
    updateBlock(block.id, { properties: { ...block.properties, language: e.target.value } });
  };

  const handleCaptionChange = (e) => {
    updateBlock(block.id, { properties: { ...block.properties, caption: e.target.value } });
  };

  return (
    <div className="block-code-wrapper">
      <div className="block-code-header">
        <select
          className="block-code-lang-select"
          value={language}
          onChange={handleLanguageChange}
          contentEditable={false}
        >
          {COMMON_LANGUAGES.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
          {/* Show current language if not in common list */}
          {!COMMON_LANGUAGES.includes(language) && (
            <option value={language}>{language}</option>
          )}
        </select>
        <button
          className={`block-code-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          contentEditable={false}
        >
          {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
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
      {/* Caption input */}
      <input
        className="block-code-caption"
        type="text"
        placeholder="Add a caption…"
        value={caption}
        onChange={handleCaptionChange}
        contentEditable={false}
      />
    </div>
  );
}
