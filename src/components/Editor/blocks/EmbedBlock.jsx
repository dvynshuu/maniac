import { useState } from 'react';
import { ExternalLink, Play, Globe } from 'lucide-react';
import { useEditorEngine } from '../../../hooks/useEditorEngine';

export default function EmbedBlock({ block }) {
  const url = block.properties?.url || '';
  const caption = block.properties?.caption || '';
  const embedType = block.properties?.embedType || 'generic';
  
  const engine = useEditorEngine();

  const [inputUrl, setInputUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleKeyDown = (e) => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && !inputUrl && !url) {
      e.preventDefault();
      engine.deleteBlock(block.id);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!inputUrl) return;

    setIsSubmitting(true);
    
    let type = 'generic';
    if (inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')) {
      type = 'youtube';
    }

    await engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        url: inputUrl,
        embedType: type
      }
    });
    setIsSubmitting(false);
  };

  // YouTube embed
  if (embedType === 'youtube' && url) {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      return (
        <div className="block-embed-wrapper" tabIndex={0} onKeyDown={handleKeyDown}>
          <iframe
            className="block-embed-iframe"
            src={`https://www.youtube.com/embed/${videoId}`}
            title={caption || 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ aspectRatio: '16/9' }}
          />
        </div>
      );
    }
  }

  // Generic link bookmark
  if (url) {
    let displayUrl = url;
    try { displayUrl = new URL(url).hostname; } catch { /* keep full url */ }

    return (
      <div className="block-embed-wrapper" tabIndex={0} onKeyDown={handleKeyDown}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block-embed-link"
        >
          <div className="block-embed-link-icon">
            <Globe size={18} />
          </div>
          <div className="block-embed-link-text">
            <div className="block-embed-link-title">{caption || url}</div>
            <div className="block-embed-link-url">{displayUrl}</div>
          </div>
          <ExternalLink size={14} style={{ opacity: 0.5, marginLeft: '8px' }} />
        </a>
      </div>
    );
  }

  return (
    <div className="block-embed-wrapper" tabIndex={0} onKeyDown={handleKeyDown}>
      <form className="block-embed-input-container" onSubmit={handleSubmit}>
        <div className="block-embed-input-group">
          <input
            autoFocus
            type="text"
            className="block-embed-input"
            placeholder="Paste a link to embed..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
          />
          <button 
            type="submit" 
            className="block-embed-submit-btn"
            disabled={!inputUrl || isSubmitting}
          >
            {isSubmitting ? 'Embedding...' : 'Embed'}
          </button>
        </div>
        <div className="block-embed-type-hint">
          <Play size={14} /> YouTube
          <span style={{ margin: '0 4px', opacity: 0.3 }}>•</span>
          <Globe size={14} /> Web Link
        </div>
      </form>
    </div>
  );
}

function extractYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}
