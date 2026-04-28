import { ExternalLink } from 'lucide-react';
import { useBlockStore } from '../../../stores/blockStore';

export default function EmbedBlock({ block }) {
  const url = block.properties?.url || block.content || '';
  const caption = block.properties?.caption || '';
  const embedType = block.properties?.embedType || 'generic';
  const deleteBlock = useBlockStore(s => s.deleteBlock);

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      deleteBlock(block.id);
    }
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
            <ExternalLink size={16} />
          </div>
          <div className="block-embed-link-text">
            <div className="block-embed-link-title">{caption || url}</div>
            <div className="block-embed-link-url">{displayUrl}</div>
          </div>
        </a>
      </div>
    );
  }

  // Fallback: empty embed
  return (
    <div className="block-embed-wrapper" tabIndex={0} onKeyDown={handleKeyDown} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
      No URL provided
    </div>
  );
}

function extractYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}
