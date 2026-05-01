import { useState, useRef, useEffect } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { Image as ImageIcon } from 'lucide-react';
import { storeBlob, loadBlobUrl, isBlobRef } from '../../../utils/blobService';
import { EditorEngine } from '../../../core/editor/Engine';

export default function ImageBlock({ block }) {
  const engine = new EditorEngine(block.pageId);
  const [renderUrl, setRenderUrl] = useState(null);
  const [caption, setCaption] = useState(block.properties?.caption || '');
  const fileInputRef = useRef(null);
  const blobRefRef = useRef(block.properties?.src);
  
  const focusBlockId = useBlockStore((s) => s.focusBlockId);

  const src = block.properties?.src;
  const hash = block.properties?.hash;
  const width = block.properties?.width;
  const alignment = block.properties?.alignment || 'left';

  // Resolve blob references or hash-based references
  useEffect(() => {
    let cancelled = false;
    blobRefRef.current = src;

    if (!src && !hash) {
      setRenderUrl(null);
      return;
    }

    const ref = src || (hash ? `blob://${hash}` : null);
    if (!ref) { setRenderUrl(null); return; }

    if (isBlobRef(ref)) {
      loadBlobUrl(ref).then(url => {
        if (!cancelled) setRenderUrl(url);
      });
    } else {
      setRenderUrl(ref);
    }

    return () => { cancelled = true; };
  }, [src, hash]);

  // Sync caption from props
  useEffect(() => {
    if (block.properties?.caption !== undefined) {
      setCaption(block.properties.caption);
    }
  }, [block.properties?.caption]);

  useEffect(() => {
    if (focusBlockId === block.id && fileInputRef.current && !src && !hash) {
      fileInputRef.current.focus();
    }
  }, [focusBlockId, block.id, src, hash]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ref = await storeBlob(file);
    setRenderUrl(null);
    engine.updateBlock(block.id, { properties: { ...block.properties, src: ref } });
  };

  const handleCaptionChange = (e) => {
    const newCaption = e.target.value;
    setCaption(newCaption);
    engine.updateBlock(block.id, { properties: { ...block.properties, caption: newCaption } });
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      engine.deleteBlock(block.id);
    }
  };

  // Resizing logic
  const wrapperRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef(null);

  const startResizing = (e, direction) => {
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

  const handleResizing = (e) => {
    if (!resizeStartRef.current || !wrapperRef.current) return;
    
    const delta = e.clientX - resizeStartRef.current.x;
    const newWidth = resizeStartRef.current.direction === 'right' 
      ? resizeStartRef.current.width + delta 
      : resizeStartRef.current.width - delta;

    const parentWidth = wrapperRef.current.parentElement?.offsetWidth || 800;
    const widthPercent = Math.min(Math.max((newWidth / parentWidth) * 100, 10), 100);
    
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

  if (renderUrl) {
    return (
      <div 
        ref={wrapperRef}
        className={`block-image-wrapper ${isResizing ? 'resizing' : ''}`}
        data-align={alignment}
        tabIndex={0} 
        onKeyDown={handleKeyDown}
        style={{ 
          outline: focusBlockId === block.id && !isResizing ? '2px solid var(--accent-primary)' : 'none',
          width: width || '100%',
          marginLeft: '0',
          marginRight: 'auto',
        }}
      >
        <img src={renderUrl} alt={caption || 'Image'} draggable={false} />
        
        {/* Resize Handle (Right only for left-anchored images) */}
        <div className="image-resizer-handle right" onMouseDown={(e) => startResizing(e, 'right')} />

        <textarea
          className="block-image-caption"
          placeholder="Add a caption…"
          value={caption}
          onChange={handleCaptionChange}
          rows={1}
          onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
        />
      </div>
    );
  }

  return (
    <div 
      className="block-image-upload"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => fileInputRef.current?.click()}
    >
      <ImageIcon size={32} className="text-tertiary" />
      <span className="text-sm">Click to upload an image</span>
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept="image/*"
        onChange={handleFileChange} 
      />
    </div>
  );
}
