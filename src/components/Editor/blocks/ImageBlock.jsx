import { useState, useRef, useEffect } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { Image as ImageIcon } from 'lucide-react';

export default function ImageBlock({ block }) {
  const [src, setSrc] = useState(block.properties?.src);
  const fileInputRef = useRef(null);
  
  const updateBlock = useBlockStore((s) => s.updateBlock);
  const deleteBlock = useBlockStore((s) => s.deleteBlock);
  const focusBlockId = useBlockStore((s) => s.focusBlockId);

  useEffect(() => {
    if (focusBlockId === block.id && fileInputRef.current && !src) {
      fileInputRef.current.focus();
    }
  }, [focusBlockId, block.id, src]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setSrc(base64);
      updateBlock(block.id, { properties: { ...block.properties, src: base64 } });
    };
    reader.readAsDataURL(file);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      deleteBlock(block.id);
    }
  };

  if (src) {
    return (
      <div 
        className="block-image-wrapper" 
        tabIndex={0} 
        onKeyDown={handleKeyDown}
        style={{ outline: focusBlockId === block.id ? '2px solid var(--accent-primary)' : 'none' }}
      >
        <img src={src} alt="User uploaded" />
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
