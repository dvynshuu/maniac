import { useRef, useEffect, useState, useMemo, useId } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { debounce } from '../../../utils/helpers';
import { Copy, Check, WrapText, AlignLeft, Terminal, Eye, Code as CodeIcon, Columns, AlertCircle } from 'lucide-react';
import mermaid from 'mermaid';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'var(--font-sans, sans-serif)',
});

// Load key Prism languages safely
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';

const COMMON_LANGUAGES = [
  'javascript', 'typescript', 'python', 'rust', 'go', 'cpp', 'c', 'sql', 'bash', 'json', 'yaml', 'css', 'html', 'markdown', 'mermaid', 'plain'
];

const highlightCode = (code: string, lang: string) => {
  if (!code) return '';
  try {
    const grammar = Prism?.languages?.[lang] || Prism?.languages?.javascript;
    if (grammar && Prism?.highlight) {
      return Prism.highlight(code, grammar, lang);
    }
  } catch {
    // Fallback safely to escaped code
  }
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

export default function CodeBlock({ block }: { block: any }) {
  const language = block.properties?.language || 'typescript';
  const caption = block.properties?.caption || '';
  const initialWrap = block.properties?.wrap ?? false;

  const [content, setContent] = useState(block.content || '');
  const [wrapLines, setWrapLines] = useState<boolean>(initialWrap);
  const [copied, setCopied] = useState(false);
  const [mermaidMode, setMermaidMode] = useState<'code' | 'preview' | 'split'>('split');
  const [mermaidSvg, setMermaidSvg] = useState<string>('');
  const [mermaidError, setMermaidError] = useState<string | null>(null);
  const renderId = useId().replace(/[:]/g, '_');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  
  const engine = useEditorEngine(block.pageId);
  const focusBlockId = useBlockStore(s => s.focusBlockId);

  useEffect(() => {
    if (block.content !== content) {
      setContent(block.content || '');
    }
  }, [block.content]);

  const debouncedSave = useRef(
    debounce((id: string, text: string) => {
      engine.updateBlock(id, { content: text });
    }, 600)
  ).current;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);
    debouncedSave(block.id, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
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

  // Live Mermaid diagram rendering when language is 'mermaid'
  useEffect(() => {
    if (language !== 'mermaid') return;
    let cancelled = false;
    const trimmed = content.trim();
    if (!trimmed) {
      setMermaidSvg('');
      setMermaidError(null);
      return;
    }

    const containerId = `code_mermaid_${renderId}_${Date.now()}`;
    mermaid.render(containerId, trimmed)
      .then(({ svg }) => {
        if (!cancelled) {
          setMermaidSvg(svg);
          setMermaidError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setMermaidError(err?.message || 'Syntax error in Mermaid diagram');
        }
      });

    return () => { cancelled = true; };
  }, [content, language, renderId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignored */ }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    engine.updateBlock(block.id, { 
      properties: { ...block.properties, language: e.target.value } 
    });
  };

  const handleToggleWrap = () => {
    const nextWrap = !wrapLines;
    setWrapLines(nextWrap);
    engine.updateBlock(block.id, { 
      properties: { ...block.properties, wrap: nextWrap } 
    });
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    engine.updateBlock(block.id, { 
      properties: { ...block.properties, caption: e.target.value } 
    });
  };

  const lineCount = useMemo(() => {
    return Math.max(1, (content.split('\n') || []).length);
  }, [content]);

  const highlightedHtml = useMemo(() => {
    return highlightCode(content, language);
  }, [content, language]);

  return (
    <div className="block-code-terminal" contentEditable={false} suppressContentEditableWarning>
      {/* Machined Hardware Header */}
      <div className="block-code-topbar">
        <div className="block-code-left">
          <div className="block-code-badge">
            <Terminal size={12} />
            <select
              className="block-code-lang-selector"
              value={language}
              onChange={handleLanguageChange}
              title="Select code syntax"
            >
              {COMMON_LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang.toUpperCase()}</option>
              ))}
              {!COMMON_LANGUAGES.includes(language) && (
                <option value={language}>{language.toUpperCase()}</option>
              )}
            </select>
          </div>
          <span className="block-code-line-indicator">
            {lineCount} {lineCount === 1 ? 'LINE' : 'LINES'}
          </span>
        </div>

        <div className="block-code-actions">
          {language === 'mermaid' && (
            <div className="block-code-mermaid-tabs">
              <button
                type="button"
                className={`block-code-tool-btn ${mermaidMode === 'split' ? 'active' : ''}`}
                onClick={() => setMermaidMode('split')}
                title="Split view (Code & Preview)"
              >
                <Columns size={12} />
                <span>Split</span>
              </button>
              <button
                type="button"
                className={`block-code-tool-btn ${mermaidMode === 'preview' ? 'active' : ''}`}
                onClick={() => setMermaidMode('preview')}
                title="Preview diagram only"
              >
                <Eye size={12} />
                <span>Preview</span>
              </button>
              <button
                type="button"
                className={`block-code-tool-btn ${mermaidMode === 'code' ? 'active' : ''}`}
                onClick={() => setMermaidMode('code')}
                title="Code only"
              >
                <CodeIcon size={12} />
                <span>Code</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className={`block-code-tool-btn ${wrapLines ? 'active' : ''}`}
            onClick={handleToggleWrap}
            title={wrapLines ? 'Disable line wrap' : 'Enable line wrap'}
          >
            {wrapLines ? <WrapText size={12} /> : <AlignLeft size={12} />}
            <span>{wrapLines ? 'Wrap' : 'No Wrap'}</span>
          </button>

          <button
            type="button"
            className={`block-code-tool-btn copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Copy snippet"
          >
            {copied ? (
              <>
                <Check size={12} className="text-success" />
                <span className="text-success">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor & Highlighting Body with Line Gutter */}
      {!(language === 'mermaid' && mermaidMode === 'preview') && (
        <div className={`block-code-editor-area ${wrapLines ? 'is-wrapped' : 'is-scrolling'}`}>
          {/* Line Numbers Gutter */}
          <div className="code-line-gutter" aria-hidden="true">
            {Array.from({ length: lineCount }).map((_, idx) => (
              <span key={idx + 1} className="code-line-number">
                {idx + 1}
              </span>
            ))}
          </div>

          {/* Code Canvas Container */}
          <div className="code-canvas-container">
            {/* Highlighted code rendering */}
            <pre
              ref={preRef}
              className={`code-pre-layer language-${language}`}
              dangerouslySetInnerHTML={{ __html: (highlightedHtml || ' ') + '\n' }}
            />

            {/* Interactive Textarea overlay */}
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
              placeholder={language === 'mermaid' ? "// Enter Mermaid syntax (e.g. graph TD...)" : "// Paste or write code snippet..."}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="code-textarea-overlay"
            />
          </div>
        </div>
      )}

      {/* Mermaid Live Preview for language === 'mermaid' */}
      {language === 'mermaid' && (mermaidMode === 'split' || mermaidMode === 'preview') && (
        <div className="block-code-mermaid-preview">
          {mermaidError ? (
            <div className="block-diagram-error-banner">
              <AlertCircle size={14} />
              <span>{mermaidError}</span>
            </div>
          ) : mermaidSvg ? (
            <div 
              className="block-code-svg-render"
              dangerouslySetInnerHTML={{ __html: mermaidSvg }}
            />
          ) : (
            <div className="block-code-mermaid-hint">
              <span>Diagram will appear here as you type</span>
            </div>
          )}
        </div>
      )}

      {/* Caption footer */}
      <div className="block-code-caption-row">
        <input
          className="block-code-caption-input"
          type="text"
          placeholder="Add snippet caption or filename..."
          value={caption}
          onChange={handleCaptionChange}
        />
      </div>
    </div>
  );
}
