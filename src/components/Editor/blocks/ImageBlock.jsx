import { useState, useRef, useEffect } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { Image as ImageIcon } from 'lucide-react';
import { storeBlob, loadBlobUrl, isBlobRef } from '../../../utils/blobService';

export default function ImageBlock({ block }) {
  const [renderUrl, setRenderUrl] = useState(null);
  const fileInputRef = useRef(null);
  const blobRefRef = useRef(block.properties?.src); // track current blob ref for cleanup
  
  const updateBlock = useBlockStore((s) => s.updateBlock);
  const deleteBlock = useBlockStore((s) => s.deleteBlock);
  const focusBlockId = useBlockStore((s) => s.focusBlockId);

  const src = block.properties?.src;

  // Resolve blob references (or pass through legacy data: URLs) to a renderable URL
  useEffect(() => {
    let cancelled = false;
    blobRefRef.current = src;

    if (!src) {
      setRenderUrl(null);
      return;
    }

    if (isBlobRef(src)) {
      loadBlobUrl(src).then(url => {
        if (!cancelled) setRenderUrl(url);
      });
    } else {
      // Legacy data: URL or external URL — render directly
      setRenderUrl(src);
    }

    return () => { cancelled = true; };
  }, [src]);

  useEffect(() => {
    if (focusBlockId === block.id && fileInputRef.current && !src) {
      fileInputRef.current.focus();
    }
  }, [focusBlockId, block.id, src]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Store as blob, get a lightweight reference
    const ref = await storeBlob(file);
    setRenderUrl(null); // will be resolved by the useEffect

    updateBlock(block.id, { properties: { ...block.properties, src: ref } });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      deleteBlock(block.id);
    }
  };

  if (renderUrl) {
    return (
      <div 
        className="block-image-wrapper" 
        tabIndex={0} 
        onKeyDown={handleKeyDown}
        style={{ outline: focusBlockId === block.id ? '2px solid var(--accent-primary)' : 'none' }}
      >
        <img src={renderUrl} alt="User uploaded" />
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
