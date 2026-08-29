import { useState, useRef } from 'react';
import { X, Upload, Sparkles, Image as ImageIcon } from 'lucide-react';
import { storeBlob } from '../../utils/blobService';

const COVER_PRESETS = [
  {
    category: 'Gradients',
    items: [
      { id: 'grad-ember', name: 'Scarlet Ember', value: 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #f43f5e 100%)' },
      { id: 'grad-cosmic', name: 'Cosmic Indigo', value: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #d946ef 100%)' },
      { id: 'grad-emerald', name: 'Emerald Aurora', value: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' },
      { id: 'grad-sunset', name: 'Golden Sunset', value: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)' },
      { id: 'grad-ocean', name: 'Deep Ocean', value: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 50%, #1e40af 100%)' },
      { id: 'grad-midnight', name: 'Midnight Void', value: 'linear-gradient(135deg, #1e1e2f 0%, #11111b 50%, #0a0a0f 100%)' },
      { id: 'grad-rose', name: 'Pastel Dusk', value: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #fda4af 100%)' },
      { id: 'grad-cyber', name: 'Cyber Neon', value: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 50%, #06b6d4 100%)' },
    ]
  },
  {
    category: 'Minimalist Patterns',
    items: [
      { id: 'pat-grid', name: 'Subtle Matrix', value: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0) 0 0/24px 24px, linear-gradient(135deg, #181824 0%, #0d0d12 100%)' },
      { id: 'pat-mesh', name: 'Dark Mesh', value: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px) 0 0/32px 32px, linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px) 0 0/32px 32px, #0f0f15' },
      { id: 'pat-warm-grid', name: 'Warm Grid', value: 'radial-gradient(circle at 1px 1px, rgba(249,115,22,0.2) 1px, transparent 0) 0 0/20px 20px, linear-gradient(135deg, #1a120c 0%, #0a0806 100%)' },
      { id: 'pat-blueprint', name: 'Blueprint', value: 'linear-gradient(rgba(59,130,246,0.15) 1px, transparent 1px) 0 0/20px 20px, linear-gradient(90deg, rgba(59,130,246,0.15) 1px, transparent 1px) 0 0/20px 20px, #0b1329' },
    ]
  }
];

export default function CoverPickerModal({ onSelectCover, onClose }) {
  const [activeTab, setActiveTab] = useState('presets');
  const [customUrl, setCustomUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const ref = await storeBlob(file);
      onSelectCover(ref);
      onClose();
    } catch (err) {
      console.error('Failed to upload cover:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyUrl = () => {
    if (customUrl.trim()) {
      onSelectCover(customUrl.trim());
      onClose();
    }
  };

  return (
    <div className="cover-picker-overlay" onClick={onClose}>
      <div className="cover-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cover-picker-header">
          <div className="cover-picker-tabs">
            <button
              className={`cover-picker-tab ${activeTab === 'presets' ? 'active' : ''}`}
              onClick={() => setActiveTab('presets')}
            >
              <Sparkles size={14} /> Presets & Gradients
            </button>
            <button
              className={`cover-picker-tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={14} /> Upload Image
            </button>
            <button
              className={`cover-picker-tab ${activeTab === 'link' ? 'active' : ''}`}
              onClick={() => setActiveTab('link')}
            >
              <ImageIcon size={14} /> Image Link
            </button>
          </div>
          <button className="cover-picker-close-btn" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="cover-picker-body">
          {activeTab === 'presets' && (
            <div className="cover-presets-container">
              {COVER_PRESETS.map((group) => (
                <div key={group.category} className="cover-preset-group">
                  <div className="cover-preset-group-title">{group.category}</div>
                  <div className="cover-preset-grid">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        className="cover-preset-card"
                        style={{ background: item.value }}
                        onClick={() => {
                          onSelectCover(item.value);
                          onClose();
                        }}
                        title={item.name}
                      >
                        <span className="cover-preset-label">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="cover-upload-area" onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <Upload size={28} className="cover-upload-icon" />
              <span className="cover-upload-title">
                {isUploading ? 'Uploading cover...' : 'Click to select or drag and drop an image'}
              </span>
              <span className="cover-upload-sub">Supports PNG, JPG, GIF, WebP</span>
            </div>
          )}

          {activeTab === 'link' && (
            <div className="cover-link-container">
              <input
                type="url"
                className="cover-link-input"
                placeholder="Paste an image web URL..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyUrl()}
                autoFocus
              />
              <button
                className="cover-link-submit-btn"
                onClick={handleApplyUrl}
                disabled={!customUrl.trim()}
              >
                Apply Cover
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
