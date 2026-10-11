import { useState } from 'react';
import { Plus, ChevronRight, Image as ImageIcon } from 'lucide-react';

export default function GalleryView({ 
  schema, 
  rows, 
  blockId, 
  onUpdateCell, 
  onUpdateCellImmediate, 
  onAddRow, 
  onOpenRow 
}) {
  const [cardSize, setCardSize] = useState('medium'); // 'small' | 'medium' | 'large'
  const titleProp = schema[0] || { id: 'title', name: 'Name' };
  const visibleProps = schema.filter(p => p.id !== titleProp.id).slice(0, 4);

  return (
    <div className="gallery-view-container">
      {/* Gallery Subtoolbar */}
      <div className="gallery-subtoolbar">
        <div className="gallery-card-size-group">
          <span className="gallery-size-label">Card size:</span>
          {(['small', 'medium', 'large']).map(size => (
            <button
              key={size}
              onClick={() => setCardSize(size)}
              className={`gallery-size-pill ${cardSize === size ? 'active' : ''}`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Card Grid */}
      <div className={`gallery-grid size-${cardSize}`}>
        {rows.map(row => {
          const title = row.values[titleProp.id] || 'Untitled';
          const coverImage = row.values.coverImage || null;

          return (
            <div
              key={row.id}
              onClick={() => onOpenRow(row)}
              className="gallery-card"
            >
              {/* Cover Preview Header */}
              <div
                className="gallery-card-cover"
                style={{
                  backgroundImage: coverImage ? `url(${coverImage})` : undefined,
                  background: !coverImage ? 'linear-gradient(135deg, var(--accent-primary-subtle) 0%, rgba(99, 102, 241, 0.04) 100%)' : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {!coverImage && (
                  <ImageIcon size={22} className="gallery-cover-placeholder-icon" />
                )}
              </div>

              {/* Card Body */}
              <div className="gallery-card-body">
                <div className="gallery-card-title-row">
                  <span className="gallery-card-title">
                    {title}
                  </span>
                  <ChevronRight size={13} className="gallery-card-arrow" />
                </div>

                {/* Visible Property Badges */}
                {visibleProps.length > 0 && (
                  <div className="gallery-card-props">
                    {visibleProps.map(p => {
                      const val = row.values[p.id];
                      if (val === undefined || val === null || val === '') return null;

                      return (
                        <div key={p.id} className="gallery-card-chip">
                          <span className="gallery-chip-name">{p.name}:</span>
                          <span className="gallery-chip-val">{String(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Quick Add Card */}
        <div
          onClick={() => onAddRow()}
          className="gallery-card-add"
        >
          <Plus size={18} />
          <span>Add Card</span>
        </div>
      </div>
    </div>
  );
}
