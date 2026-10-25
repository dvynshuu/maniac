import React, { useState } from 'react';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { ExternalLink, Bookmark, Globe, Edit2, Check, X } from 'lucide-react';

export default function BookmarkBlock({ block }: { block: any }) {
  const url = block.properties?.url || block.content || '';
  const title = block.properties?.title || '';
  const description = block.properties?.description || '';
  const thumbnail = block.properties?.thumbnail || '';

  const [inputUrl, setInputUrl] = useState(url);
  const [isEditing, setIsEditing] = useState(!url);
  const engine = useEditorEngine();

  const getHostname = (rawUrl: string) => {
    try {
      const u = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return rawUrl;
    }
  };

  const hostname = url ? getHostname(url) : '';
  const displayTitle = title || hostname || 'Web Bookmark';
  const displayDesc = description || (url ? `Visit ${hostname}` : '');
  const faviconUrl = hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=64` : '';

  const handleSubmitUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let normalized = inputUrl.trim();
    if (!normalized) return;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }

    const host = getHostname(normalized);
    engine.updateBlock(block.id, {
      content: normalized,
      properties: {
        ...block.properties,
        url: normalized,
        title: title || host,
        description: description || `Link to ${host}`,
      },
    });
    setIsEditing(false);
  };

  return (
    <div className="block-bookmark-wrapper" contentEditable={false} suppressContentEditableWarning>
      {isEditing ? (
        <form className="bookmark-input-form" onSubmit={handleSubmitUrl}>
          <div className="bookmark-input-icon">
            <Bookmark size={15} />
          </div>
          <input
            type="text"
            className="bookmark-url-input"
            placeholder="Paste web link (e.g. https://github.com)..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            autoFocus
          />
          <button type="submit" className="bookmark-submit-btn">
            <Check size={14} />
            <span>Set</span>
          </button>
          {url && (
            <button
              type="button"
              className="bookmark-cancel-btn"
              onClick={() => setIsEditing(false)}
            >
              <X size={14} />
            </button>
          )}
        </form>
      ) : (
        <div className="bookmark-card group/bookmark">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="bookmark-link"
          >
            <div className="bookmark-info">
              <div className="bookmark-title">{displayTitle}</div>
              {displayDesc && <div className="bookmark-desc">{displayDesc}</div>}
              <div className="bookmark-footer">
                {faviconUrl ? (
                  <img
                    src={faviconUrl}
                    alt=""
                    className="bookmark-favicon"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Globe size={13} className="bookmark-favicon-fallback" />
                )}
                <span className="bookmark-hostname">{hostname}</span>
                <ExternalLink size={11} className="bookmark-external-icon" />
              </div>
            </div>
            {thumbnail ? (
              <div
                className="bookmark-thumbnail"
                style={{ backgroundImage: `url(${thumbnail})` }}
              />
            ) : (
              <div className="bookmark-thumbnail-placeholder">
                <Globe size={28} strokeWidth={1.2} />
              </div>
            )}
          </a>
          <button
            type="button"
            className="bookmark-edit-btn"
            onClick={() => setIsEditing(true)}
            title="Edit bookmark URL"
          >
            <Edit2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
