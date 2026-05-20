import { useRef, useEffect, useState } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { debounce } from '../../../utils/helpers';
import { Copy, Check } from 'lucide-react';
import Prism from 'prismjs';

import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';

const COMMON_LANGUAGES = [
  'javascript', 'typescript', 'python', 'css', 'html', 'sql', 'bash', 'json', 'plain'
];

const highlightCode = (code, lang) => {
  const grammar = Prism.languages[lang];
  if (grammar) {
    return Prism.highlight(code, grammar, lang);
  }
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

export default function CodeBlock({ block }) {
  const language = block.properties?.language || 'javascript';
  const caption = block.properties?.caption || '';
  const [content, setContent] = useState(block.content || '');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  
  const engine = useEditorEngine();
  const focusBlockId = useBlockStore(s => s.focusBlockId);

  useEffect(() => {
    if (block.content !== content) {
      setContent(block.content || '');
    }
  }, [block.content]);

  const debouncedSave = useRef(
    debounce((id, text) => {
      engine.updateBlock(id, { content: text });
    }, 800)
  ).current;

  const handleChange = (e) => {
    const text = e.target.value;
    setContent(text);
    debouncedSave(block.id, text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const nextText = content.substring(0, start) + '  ' + content.substring(end);
      setContent(nextText);
      debouncedSave(block.id, nextText);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
    if (e.key === 'Backspace' && content === '') {
      e.preventDefault();
      engine.convertType(block.id, 'text');
    }
  };

  useEffect(() => {
    if (focusBlockId === block.id && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [focusBlockId, block.id]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignored */ }
  };

  const handleLanguageChange = (e) => {
    engine.updateBlock(block.id, { properties: { ...block.properties, language: e.target.value } });
  };

  const handleCaptionChange = (e) => {
    engine.updateBlock(block.id, { properties: { ...block.properties, caption: e.target.value } });
  };

  const highlightedHtml = highlightCode(content, language);

  return (
    <div className="block-code-wrapper" style={{ position: 'relative' }}>
      <div className="block-code-header" style={{ position: 'relative', zIndex: 10 }}>
        <select
          className="block-code-lang-select"
          value={language}
          onChange={handleLanguageChange}
        >
          {COMMON_LANGUAGES.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
          {!COMMON_LANGUAGES.includes(language) && (
            <option value={language}>{language}</option>
          )}
        </select>
        <button
          className={`block-code-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>

      <div style={{ position: 'relative', minHeight: '100px' }}>
        {/* Highlighted code rendering */}
        <pre
          className={`language-${language}`}
          style={{
            margin: 0,
            padding: '16px',
            background: 'transparent',
            pointerEvents: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading-relaxed)',
            minHeight: '100px',
            boxSizing: 'border-box'
          }}
          dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
        />

        {/* Textarea overlay */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (content !== block.content) {
              engine.updateBlock(block.id, { content });
            }
          }}
          placeholder="Write code here..."
          spellCheck={false}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            padding: '16px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: 'transparent',
            caretColor: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading-relaxed)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            overflow: 'hidden',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Caption input */}
      <input
        className="block-code-caption"
        type="text"
        placeholder="Add a caption…"
        value={caption}
        onChange={handleCaptionChange}
      />
    </div>
  );
}
