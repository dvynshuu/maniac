/**
 * ─── Gallery View ───────────────────────────────────────────────
 * Card grid layout for databases. Each card shows a title,
 * optional cover image, and preview properties.
 */

import React, { useMemo, useState } from 'react';

const CARD_SIZES = {
  small: { width: 180, imageHeight: 100 },
  medium: { width: 240, imageHeight: 140 },
  large: { width: 320, imageHeight: 180 },
};

export default function GalleryView({ schema, rows, blockId }) {
  const [cardSize, setCardSize] = useState('medium');
  const config = CARD_SIZES[cardSize];

  const titleProp = useMemo(() =>
    schema.find(p => p.type === 'text') || schema[0],
  [schema]);

  const imageProp = useMemo(() =>
    schema.find(p => p.type === 'url' && p.name?.toLowerCase().includes('image')) ||
    schema.find(p => p.name?.toLowerCase().includes('cover')) ||
    null,
  [schema]);

  const previewProps = useMemo(() =>
    schema.filter(p => p.id !== titleProp?.id && p.id !== imageProp?.id).slice(0, 3),
  [schema, titleProp, imageProp]);

  return (
    <div className="gallery-view">
      <div className="gallery-controls">
        {Object.keys(CARD_SIZES).map(size => (
          <button
            key={size}
            className={`gallery-size-btn ${cardSize === size ? 'active' : ''}`}
            onClick={() => setCardSize(size)}
          >
            {size.charAt(0).toUpperCase() + size.slice(1)}
          </button>
        ))}
      </div>

      <div className="gallery-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${config.width}px, 1fr))` }}>
        {rows.map(row => {
          const title = titleProp ? (row.values[titleProp.id] || 'Untitled') : 'Untitled';
          const imageUrl = imageProp ? row.values[imageProp.id] : null;

          return (
            <div key={row.id} className="gallery-card">
              {imageUrl ? (
                <div
                  className="gallery-card-image"
                  style={{ height: config.imageHeight, backgroundImage: `url(${imageUrl})` }}
                />
              ) : (
                <div
                  className="gallery-card-placeholder"
                  style={{ height: config.imageHeight * 0.6 }}
                >
                  <span style={{ fontSize: '24px' }}>📄</span>
                </div>
              )}
              <div className="gallery-card-body">
                <div className="gallery-card-title">{title}</div>
                {previewProps.map(p => {
                  const val = row.values[p.id];
                  if (val === undefined || val === null || val === '') return null;
                  return (
                    <div key={p.id} className="gallery-card-prop">
                      <span className="gallery-card-prop-name">{p.name}</span>
                      <span className="gallery-card-prop-value">
                        {typeof val === 'boolean' ? (val ? '✓' : '✗') : String(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
