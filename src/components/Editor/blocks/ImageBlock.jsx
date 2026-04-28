import { useState, useRef, useEffect } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { Image as ImageIcon } from 'lucide-react';
import { storeBlob, loadBlobUrl, isBlobRef } from '../../../utils/blobService';

export default function ImageBlock({ block }) {
  const [renderUrl, setRenderUrl] = useState(null);
  const [caption, setCaption] = useState(block.properties?.caption || '');
  const fileInputRef = useRef(null);
  const blobRefRef = useRef(block.properties?.src);
  
  const updateBlock = useBlockStore((s) => s.updateBlock);
  const deleteBlock = useBlockStore((s) => s.deleteBlock);
  const focusBlockId = useBlockStore((s) => s.focusBlockId);

  const src = block.properties?.src;
  const hash = block.properties?.hash;
  const width = block.properties?.width;
  const alignment = block.properties?.alignment || 'center';

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
    updateBlock(block.id, { properties: { ...block.properties, src: ref } });
  };

  const handleCaptionChange = (e) => {
    const newCaption = e.target.value;
    setCaption(newCaption);
    updateBlock(block.id, { properties: { ...block.properties, caption: newCaption } });
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      deleteBlock(block.id);
    }
  };

  if (renderUrl) {
    const imgStyle = {};
    if (width) imgStyle.maxWidth = `${width}px`;

    return (
      <div 
        className="block-image-wrapper" 
        data-align={alignment}
        tabIndex={0} 
        onKeyDown={handleKeyDown}
        style={{ 
          outline: focusBlockId === block.id ? '2px solid var(--accent-primary)' : 'none',
          ...(width ? { maxWidth: `${width}px` } : {}),
          ...(alignment === 'center' ? { marginLeft: 'auto', marginRight: 'auto' } : {}),
        }}
      >
        <img src={renderUrl} alt={caption || 'Image'} style={imgStyle} />
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
