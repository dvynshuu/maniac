import { useState, useRef } from 'react';
import { X, Upload, Sparkles, Image as ImageIcon } from 'lucide-react';
import { storeBlob } from '../../utils/blobService';

const COVER_PRESETS = [
  {
    category: 'Monochrome Gradients',
    items: [
      { id: 'grad-obsidian', name: 'Obsidian Noir', value: 'linear-gradient(135deg, #1f1f1f 0%, #000000 100%)' },
      { id: 'grad-carbon', name: 'Carbon Graphite', value: 'linear-gradient(135deg, #2a2a2a 0%, #0d0d0d 100%)' },
      { id: 'grad-slate', name: 'Neutral Slate', value: 'linear-gradient(135deg, #3d3d3d 0%, #171717 100%)' },
      { id: 'grad-silver', name: 'Silver Tone', value: 'linear-gradient(135deg, #5a5a5a 0%, #222222 100%)' },
      { id: 'grad-platinum', name: 'Platinum Mist', value: 'linear-gradient(135deg, #71717a 0%, #27272a 100%)' },
      { id: 'grad-contrast', name: 'High Contrast', value: 'linear-gradient(180deg, #171717 0%, #050505 100%)' },
      { id: 'grad-monolith', name: 'Monolith', value: 'linear-gradient(135deg, #141414 0%, #080808 100%)' },
      { id: 'grad-radial', name: 'Center Spotlight', value: 'radial-gradient(circle at 50% 30%, #262626 0%, #050505 100%)' },
    ]
  },
  {
    category: 'Minimalist Patterns',
    items: [
      { id: 'pat-grid', name: 'Subtle Matrix', value: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0) 0 0/24px 24px, #000000' },
      { id: 'pat-mesh', name: 'Precision Mesh', value: 'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px) 0 0/32px 32px, linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px) 0 0/32px 32px, #080808' },
      { id: 'pat-hairline', name: 'Hairline Rule', value: 'repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(255,255,255,0.06) 24px), #000000' },
      { id: 'pat-dots', name: 'Technical Dot', value: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px) 0 0/16px 16px, #050505' },
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
