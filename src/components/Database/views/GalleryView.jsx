import React, { useState } from 'react';
import { Plus, LayoutGrid, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { PROPERTY_TYPES } from '../../../utils/constants';

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

  const cardWidths = {
    small: '180px',
    medium: '230px',
    large: '300px'
  };

  const coverHeights = {
    small: '90px',
    medium: '120px',
    large: '160px'
  };

  return (
    <div className="gallery-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', paddingBottom: '16px' }}>
      {/* Gallery Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span>Card size:</span>
          {(['small', 'medium', 'large']).map(size => (
            <button
              key={size}
              onClick={() => setCardSize(size)}
              style={{
                background: cardSize === size ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: cardSize === size ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                textTransform: 'capitalize',
                cursor: 'pointer',
                fontWeight: cardSize === size ? 600 : 400
              }}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Card Grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidths[cardSize]}, 1fr))`, 
          gap: '16px' 
        }}
      >
        {rows.map(row => {
          const title = row.values[titleProp.id] || 'Untitled';
          const coverImage = row.values.coverImage || null;

          return (
            <div
              key={row.id}
              onClick={() => onOpenRow(row)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)';
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              {/* Cover Preview Header */}
              <div
                style={{
                  height: coverHeights[cardSize],
                  background: coverImage ? `url(${coverImage}) center/cover no-repeat` : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {!coverImage && (
                  <ImageIcon size={24} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
                )}
              </div>

              {/* Card Body */}
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title}
                  </span>
                  <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                </div>

                {/* Visible Property Badges */}
                {visibleProps.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto' }}>
                    {visibleProps.map(p => {
                      const val = row.values[p.id];
                      if (val === undefined || val === null || val === '') return null;

                      return (
                        <div
                          key={p.id}
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--bg-primary)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span style={{ color: 'var(--text-tertiary)', marginRight: '3px' }}>{p.name}:</span>
                          <span>{String(val)}</span>
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
          style={{
            minHeight: '160px',
            border: '1px dashed var(--border-subtle)',
            borderRadius: '10px',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          <Plus size={20} />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>Add Card</span>
        </div>
      </div>
    </div>
  );
}
