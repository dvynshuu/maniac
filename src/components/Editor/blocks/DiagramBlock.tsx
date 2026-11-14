import React, { useState, useEffect, useRef, useId } from 'react';
import mermaid from 'mermaid';
import { 
  GitFork, Eye, Code as CodeIcon, Columns, 
  Copy, Check, AlertCircle, RefreshCw, Download 
} from 'lucide-react';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { useBlockStore } from '../../../stores/blockStore';
import { debounce } from '../../../utils/helpers';

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'var(--font-sans, sans-serif)',
});

const PRESETS = [
  {
    name: 'Flowchart',
    code: `graph TD
    A[Start] --> B{Is valid?}
    B -->|Yes| C[Process Data]
    B -->|No| D[Log Error]
    C --> E[Done]
    D --> E`
  },
  {
    name: 'Sequence Diagram',
    code: `sequenceDiagram
    autonumber
    Client->>API: POST /login
    API->>Database: Query user
    Database-->>API: User record
    API-->>Client: 200 OK + JWT`
  },
  {
    name: 'Class Diagram',
    code: `classDiagram
    class Block {
      +String id
      +String type
      +render()
    }
    class DiagramBlock {
      +String code
      +renderSvg()
    }
    Block <|-- DiagramBlock`
  },
  {
    name: 'State Diagram',
    code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: Task Triggered
    Processing --> Success: Done
    Processing --> Failed: Error
    Success --> [*]
    Failed --> Idle: Retry`
  },
  {
    name: 'Entity Relationship',
    code: `erDiagram
    WORKSPACE ||--o{ PAGE : contains
    PAGE ||--o{ BLOCK : owns
    BLOCK ||--o{ ATTACHMENT : references`
  }
];

export default function DiagramBlock({ block }: { block: any }) {
  const engine = useEditorEngine(block.pageId);
  const focusBlockId = useBlockStore(s => s.focusBlockId);

  const initialCode = block.content || block.properties?.code || PRESETS[0].code;
  const caption = block.properties?.caption || '';

  const [code, setCode] = useState(initialCode);
  const [viewMode, setViewMode] = useState<'split' | 'preview' | 'code'>('split');
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  const renderId = useId().replace(/[:]/g, '_');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (block.content && block.content !== code) {
      setCode(block.content);
    }
  }, [block.content]);

  const debouncedSave = useRef(
    debounce((text: string) => {
      engine.updateBlock(block.id, {
        content: text,
        properties: { ...block.properties, code: text }
      });
    }, 600)
  ).current;

  // Render mermaid diagram
  useEffect(() => {
    let cancelled = false;
    const trimmed = code.trim();
    if (!trimmed) {
      setSvgHtml('');
      setErrorMsg(null);
      return;
    }

    setIsRendering(true);
    const containerId = `mermaid_${renderId}_${Date.now()}`;

    mermaid.render(containerId, trimmed)
      .then(({ svg }) => {
        if (!cancelled) {
          setSvgHtml(svg);
          setErrorMsg(null);
          setIsRendering(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(err?.message || 'Syntax error in Mermaid diagram');
          setIsRendering(false);
        }
      });

    return () => { cancelled = true; };
  }, [code, renderId]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCode(val);
    debouncedSave(val);
  };

  const applyPreset = (presetCode: string) => {
    setCode(presetCode);
    engine.updateBlock(block.id, {
      content: presetCode,
      properties: { ...block.properties, code: presetCode }
    });
  };

  const handleCopySvg = async () => {
    if (!svgHtml) return;
    try {
      await navigator.clipboard.writeText(svgHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleDownloadSvg = () => {
    if (!svgHtml) return;
    const blob = new Blob([svgHtml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagram-${block.id.slice(0, 6)}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="block-diagram-container"
      tabIndex={0}
      style={{
        outline: focusBlockId === block.id ? '2px solid var(--accent-primary, #6366f1)' : 'none'
      }}
    >
      {/* Top bar */}
      <div className="block-diagram-topbar">
        <div className="block-diagram-left">
          <div className="block-diagram-badge">
            <GitFork size={13} />
            <span>MERMAID</span>
          </div>

          <div className="block-diagram-mode-tabs">
            <button
              type="button"
              className={`mode-tab ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
              title="Split view (Code & Preview)"
            >
              <Columns size={12} />
              <span>Split</span>
            </button>
            <button
              type="button"
              className={`mode-tab ${viewMode === 'preview' ? 'active' : ''}`}
              onClick={() => setViewMode('preview')}
              title="Preview only"
            >
              <Eye size={12} />
              <span>Diagram</span>
            </button>
            <button
              type="button"
              className={`mode-tab ${viewMode === 'code' ? 'active' : ''}`}
              onClick={() => setViewMode('code')}
              title="Code only"
            >
              <CodeIcon size={12} />
              <span>Code</span>
            </button>
          </div>
        </div>

        <div className="block-diagram-actions">
          {/* Preset templates selector */}
          <select 
            className="block-diagram-preset-select"
            onChange={(e) => {
              const selected = PRESETS.find(p => p.name === e.target.value);
              if (selected) applyPreset(selected.code);
            }}
            value=""
          >
            <option value="" disabled>Templates...</option>
            {PRESETS.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>

          <button
            type="button"
            className="block-diagram-tool-btn"
            onClick={handleCopySvg}
            title="Copy SVG XML"
            disabled={!svgHtml}
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'SVG'}</span>
          </button>

          <button
            type="button"
            className="block-diagram-tool-btn"
            onClick={handleDownloadSvg}
            title="Download SVG file"
            disabled={!svgHtml}
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className={`block-diagram-workspace mode-${viewMode}`}>
        {/* Editor Pane */}
        {(viewMode === 'split' || viewMode === 'code') && (
          <div className="block-diagram-editor-pane">
            <textarea
              ref={textareaRef}
              value={code}
              onChange={handleCodeChange}
              placeholder="Enter Mermaid diagram syntax (graph TD, sequenceDiagram, etc.)..."
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="block-diagram-textarea"
            />
          </div>
        )}

        {/* Preview Pane */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className="block-diagram-preview-pane">
            {errorMsg ? (
              <div className="block-diagram-error-banner">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            ) : svgHtml ? (
              <div 
                className="block-diagram-svg-wrapper"
                dangerouslySetInnerHTML={{ __html: svgHtml }}
              />
            ) : (
              <div className="block-diagram-empty-hint">
                <GitFork size={28} className="opacity-40" />
                <span>Write diagram syntax on the left to render</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Caption footer */}
      <div className="block-diagram-footer">
        <input
          type="text"
          className="block-media-caption"
          placeholder="Add diagram title or caption..."
          value={caption}
          onChange={(e) => {
            engine.updateBlock(block.id, {
              properties: { ...block.properties, caption: e.target.value }
            });
          }}
        />
      </div>
    </div>
  );
}
