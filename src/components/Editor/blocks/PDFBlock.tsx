import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, ExternalLink, Download, Trash2, 
  Maximize2, ArrowUpDown 
} from 'lucide-react';
import { useBlockStore } from '../../../stores/blockStore';
import { storeBlob, loadBlobUrl, isBlobRef } from '../../../utils/blobService';
import { useEditorEngine } from '../../../hooks/useEditorEngine';

export default function PDFBlock({ block }: { block: any }) {
  const engine = useEditorEngine(block.pageId);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState(block.properties?.caption || '');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [height, setHeight] = useState<number>(block.properties?.height || 550);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const focusBlockId = useBlockStore((s) => s.focusBlockId);

  const src = block.properties?.src;
  const hash = block.properties?.hash;
  const name = block.properties?.name || 'Document.pdf';

  // Resolve blob reference
  useEffect(() => {
    let cancelled = false;
    if (!src && !hash) {
      setRenderUrl(null);
      return;
    }
    const ref = src || (hash ? `blob://${hash}` : null);
    if (!ref) {
      setRenderUrl(null);
      return;
    }

    if (isBlobRef(ref)) {
      loadBlobUrl(ref).then(url => {
        if (!cancelled) setRenderUrl(url);
      });
    } else {
      setRenderUrl(ref);
    }

    return () => { cancelled = true; };
  }, [src, hash]);

  useEffect(() => {
    if (block.properties?.caption !== undefined) {
      setCaption(block.properties.caption);
    }
  }, [block.properties?.caption]);

  useEffect(() => {
    if (block.properties?.height) {
      setHeight(block.properties.height);
    }
  }, [block.properties?.height]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ref = await storeBlob(file);
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        src: ref,
        name: file.name,
        size: file.size,
        mimeType: 'application/pdf',
      }
    });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const filename = urlInput.split('/').pop()?.split('?')[0] || 'Document.pdf';
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        src: urlInput.trim(),
        name: filename,
        mimeType: 'application/pdf',
      }
    });
    setShowUrlInput(false);
  };

  const handleClear = () => {
    setRenderUrl(null);
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        src: '',
        hash: '',
        name: '',
      }
    });
  };

  const cycleHeight = () => {
    const heights = [380, 550, 750, 950];
    const nextIdx = (heights.indexOf(height) + 1) % heights.length;
    const nextHeight = heights[nextIdx];
    setHeight(nextHeight);
    engine.updateBlock(block.id, {
      properties: { ...block.properties, height: nextHeight }
    });
  };

  const handleDownload = () => {
    if (!renderUrl) return;
    const a = document.createElement('a');
    a.href = renderUrl;
    a.download = name || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = () => {
    if (renderUrl) {
      window.open(renderUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (renderUrl || src || hash) {
    return (
      <div 
        className="block-pdf-container"
        tabIndex={0}
        style={{
          outline: focusBlockId === block.id ? '2px solid var(--accent-primary, #6366f1)' : 'none'
        }}
      >
        {/* PDF Top Bar */}
        <div className="block-pdf-topbar">
          <div className="block-pdf-title-info">
            <span className="block-pdf-tag">PDF</span>
            <span className="block-pdf-name" title={name}>{name}</span>
          </div>

          <div className="block-pdf-actions">
            <button
              type="button"
              className="block-pdf-tool-btn"
              onClick={cycleHeight}
              title={`Viewer height: ${height}px (click to toggle)`}
            >
              <ArrowUpDown size={13} />
              <span>{height}px</span>
            </button>

            <button
              type="button"
              className="block-pdf-tool-btn"
              onClick={handleOpenNewTab}
              title="Open PDF in new tab"
            >
              <ExternalLink size={13} />
              <span>Open</span>
            </button>

            <button
              type="button"
              className="block-pdf-tool-btn"
              onClick={handleDownload}
              title="Download PDF"
            >
              <Download size={13} />
              <span>Save</span>
            </button>

            <button
              type="button"
              className="block-pdf-tool-btn danger"
              onClick={handleClear}
              title="Remove PDF"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Embedded Viewer */}
        <div className="block-pdf-viewer-frame" style={{ height: `${height}px` }}>
          <object
            data={renderUrl || undefined}
            type="application/pdf"
            className="block-pdf-object"
          >
            <iframe
              src={renderUrl ? `${renderUrl}#toolbar=1` : undefined}
              title={name}
              className="block-pdf-iframe"
            >
              <div className="block-pdf-fallback">
                <p>Unable to display PDF directly.</p>
                <button type="button" onClick={handleDownload} className="block-file-btn">
                  Download {name}
                </button>
              </div>
            </iframe>
          </object>
        </div>

        <textarea
          className="block-media-caption"
          placeholder="Add a document caption…"
          value={caption}
          onChange={(e) => {
            setCaption(e.target.value);
            engine.updateBlock(block.id, { properties: { ...block.properties, caption: e.target.value } });
          }}
          rows={1}
        />
      </div>
    );
  }

  return (
    <div className="block-pdf-empty-wrapper">
      {!showUrlInput ? (
        <div className="block-pdf-dropzone" onClick={() => fileInputRef.current?.click()}>
          <FileText size={26} className="text-tertiary" />
          <div className="block-pdf-dropzone-text">
            <span className="title">Upload a PDF document</span>
            <span className="subtitle">Embed scrollable, readable PDF documents</span>
          </div>
          <button 
            type="button" 
            className="block-file-link-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setShowUrlInput(true);
            }}
          >
            <ExternalLink size={12} />
            <span>Link URL</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="application/pdf"
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
          />
        </div>
      ) : (
        <form onSubmit={handleUrlSubmit} className="block-file-url-form">
          <input
            type="url"
            placeholder="Paste direct PDF URL (https://.../doc.pdf)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="block-file-url-input"
            autoFocus
          />
          <button type="submit" className="block-file-url-btn primary">Embed PDF</button>
          <button type="button" className="block-file-url-btn" onClick={() => setShowUrlInput(false)}>Cancel</button>
        </form>
      )}
    </div>
  );
}
