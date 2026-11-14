import React, { useState, useRef, useEffect } from 'react';
import { Video as VideoIcon, ExternalLink, Trash2 } from 'lucide-react';
import { useBlockStore } from '../../../stores/blockStore';
import { storeBlob, loadBlobUrl, isBlobRef } from '../../../utils/blobService';
import { useEditorEngine } from '../../../hooks/useEditorEngine';

export default function VideoBlock({ block }: { block: any }) {
  const engine = useEditorEngine(block.pageId);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState(block.properties?.caption || '');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isResizing, setIsResizing] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resizeStartRef = useRef<{ x: number; width: number; direction: string } | null>(null);

  const focusBlockId = useBlockStore((s) => s.focusBlockId);

  const src = block.properties?.src;
  const hash = block.properties?.hash;
  const width = block.properties?.width || '100%';
  const alignment = block.properties?.alignment || 'center';

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
        mimeType: file.type || 'video/mp4',
      }
    });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        src: urlInput.trim(),
        name: 'Video',
        mimeType: 'video/mp4',
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

  // Resizing logic
  const startResizing = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      width: wrapperRef.current?.offsetWidth || 0,
      direction
    };
    window.addEventListener('mousemove', handleResizing);
    window.addEventListener('mouseup', stopResizing);
  };

  const handleResizing = (e: MouseEvent) => {
    if (!resizeStartRef.current || !wrapperRef.current) return;
    const delta = e.clientX - resizeStartRef.current.x;
    const newWidth = resizeStartRef.current.direction === 'right' 
      ? resizeStartRef.current.width + delta 
      : resizeStartRef.current.width - delta;

    const parentWidth = wrapperRef.current.parentElement?.offsetWidth || 800;
    const widthPercent = Math.min(Math.max((newWidth / parentWidth) * 100, 20), 100);
    wrapperRef.current.style.width = `${widthPercent}%`;
  };

  const stopResizing = () => {
    setIsResizing(false);
    window.removeEventListener('mousemove', handleResizing);
    window.removeEventListener('mouseup', stopResizing);

    if (wrapperRef.current) {
      const parentWidth = wrapperRef.current.parentElement?.offsetWidth || 800;
      const widthPercent = Math.round((wrapperRef.current.offsetWidth / parentWidth) * 100);
      engine.updateBlock(block.id, {
        properties: { ...block.properties, width: `${widthPercent}%` }
      });
    }
    resizeStartRef.current = null;
  };

  if (renderUrl || src || hash) {
    return (
      <div 
        ref={wrapperRef}
        className={`block-video-wrapper ${isResizing ? 'resizing' : ''}`}
        data-align={alignment}
        tabIndex={0}
        style={{
          width: width || '100%',
          outline: focusBlockId === block.id && !isResizing ? '2px solid var(--accent-primary, #6366f1)' : 'none',
        }}
      >
        <div className="block-video-media-card">
          <video
            src={renderUrl || undefined}
            controls
            className="block-video-element"
            preload="metadata"
          />
          <div className="image-resizer-handle right" onMouseDown={(e) => startResizing(e, 'right')} />
        </div>

        <div className="block-video-meta-bar">
          <textarea
            className="block-media-caption"
            placeholder="Add a video caption…"
            value={caption}
            onChange={(e) => {
              setCaption(e.target.value);
              engine.updateBlock(block.id, { properties: { ...block.properties, caption: e.target.value } });
            }}
            rows={1}
          />
          <button 
            type="button" 
            className="block-file-btn danger" 
            onClick={handleClear} 
            title="Remove video"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="block-video-empty-wrapper">
      {!showUrlInput ? (
        <div className="block-video-dropzone" onClick={() => fileInputRef.current?.click()}>
          <VideoIcon size={26} className="text-tertiary" />
          <div className="block-video-dropzone-text">
            <span className="title">Upload a video</span>
            <span className="subtitle">MP4, WebM, MOV video files</span>
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
            accept="video/*"
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
          />
        </div>
      ) : (
        <form onSubmit={handleUrlSubmit} className="block-file-url-form">
          <input
            type="url"
            placeholder="Paste direct video URL (https://...)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="block-file-url-input"
            autoFocus
          />
          <button type="submit" className="block-file-url-btn primary">Embed Video</button>
          <button type="button" className="block-file-url-btn" onClick={() => setShowUrlInput(false)}>Cancel</button>
        </form>
      )}
    </div>
  );
}
