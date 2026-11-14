import React, { useState, useRef, useEffect } from 'react';
import { 
  Paperclip, Download, Trash2, ExternalLink, FileText, 
  Archive, FileSpreadsheet, Music, Video, Code, File as FileIcon 
} from 'lucide-react';
import { useBlockStore } from '../../../stores/blockStore';
import { storeBlob, loadBlobUrl, isBlobRef } from '../../../utils/blobService';
import { useEditorEngine } from '../../../hooks/useEditorEngine';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(name = '', mime = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf' || mime.includes('pdf')) return <FileText size={20} className="text-red-400" />;
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext) || mime.includes('zip')) return <Archive size={20} className="text-amber-400" />;
  if (['csv', 'xlsx', 'xls'].includes(ext) || mime.includes('spreadsheet')) return <FileSpreadsheet size={20} className="text-emerald-400" />;
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext) || mime.includes('audio')) return <Music size={20} className="text-purple-400" />;
  if (['mp4', 'webm', 'mov'].includes(ext) || mime.includes('video')) return <Video size={20} className="text-rose-400" />;
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'py'].includes(ext)) return <Code size={20} className="text-blue-400" />;
  return <FileIcon size={20} className="text-fg-secondary" />;
}

export default function FileBlock({ block }: { block: any }) {
  const engine = useEditorEngine(block.pageId);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState(block.properties?.caption || '');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const focusBlockId = useBlockStore((s) => s.focusBlockId);

  const src = block.properties?.src;
  const hash = block.properties?.hash;
  const name = block.properties?.name || block.properties?.title || 'Attachment';
  const size = block.properties?.size;
  const mimeType = block.properties?.mimeType || '';

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
        mimeType: file.type,
      }
    });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const filename = urlInput.split('/').pop()?.split('?')[0] || 'Remote File';
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        src: urlInput.trim(),
        name: filename,
      }
    });
    setShowUrlInput(false);
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCaption = e.target.value;
    setCaption(newCaption);
    engine.updateBlock(block.id, { properties: { ...block.properties, caption: newCaption } });
  };

  const handleDownload = () => {
    if (!renderUrl) return;
    const a = document.createElement('a');
    a.href = renderUrl;
    a.download = name || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClear = () => {
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        src: '',
        hash: '',
        name: '',
        size: 0,
        mimeType: '',
      }
    });
    setRenderUrl(null);
  };

  if (renderUrl || src || hash) {
    return (
      <div 
        className="block-file-container"
        tabIndex={0}
        style={{
          outline: focusBlockId === block.id ? '2px solid var(--accent-primary, #6366f1)' : 'none'
        }}
      >
        <div className="block-file-card">
          <div className="block-file-icon-badge">
            {getFileIcon(name, mimeType)}
          </div>
          
          <div className="block-file-details">
            <span className="block-file-name" title={name}>{name}</span>
            <div className="block-file-meta">
              {size ? <span>{formatBytes(size)}</span> : null}
              {mimeType && <span className="block-file-mime">{mimeType.split('/').pop()?.toUpperCase()}</span>}
            </div>
          </div>

          <div className="block-file-actions">
            <button 
              type="button"
              className="block-file-btn" 
              onClick={handleDownload} 
              title="Download file"
            >
              <Download size={14} />
              <span>Download</span>
            </button>
            <button 
              type="button"
              className="block-file-btn danger" 
              onClick={handleClear} 
              title="Remove file"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <textarea
          className="block-media-caption"
          placeholder="Add a caption…"
          value={caption}
          onChange={handleCaptionChange}
          rows={1}
        />
      </div>
    );
  }

  return (
    <div className="block-file-empty-wrapper">
      {!showUrlInput ? (
        <div className="block-file-dropzone" onClick={() => fileInputRef.current?.click()}>
          <Paperclip size={24} className="text-tertiary" />
          <div className="block-file-dropzone-text">
            <span className="title">Upload a file</span>
            <span className="subtitle">Click to browse or drag and drop attachments</span>
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
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
          />
        </div>
      ) : (
        <form onSubmit={handleUrlSubmit} className="block-file-url-form">
          <input
            type="url"
            placeholder="Paste file URL (https://...)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="block-file-url-input"
            autoFocus
          />
          <button type="submit" className="block-file-url-btn primary">Attach</button>
          <button type="button" className="block-file-url-btn" onClick={() => setShowUrlInput(false)}>Cancel</button>
        </form>
      )}
    </div>
  );
}
