import React, { useState, useEffect, useRef } from 'react';
import { SUMMARY_OPTIONS } from './tableConstants';

// Selector for Column calculations in Summary row
export const SummaryCellSelector = ({ colIndex, config, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const currentLabel = SUMMARY_OPTIONS.find(o => o.value === config)?.label || 'Calculate';

  return (
    <div ref={containerRef} className="summary-cell-selector-container" style={{ position: 'relative', display: 'block', width: '100%', height: '100%' }}>
      <div 
        onClick={() => setOpen(!open)}
        className="summary-cell-trigger"
        style={{
          cursor: 'pointer',
          padding: '8px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '4px',
          color: config === 'none' ? 'var(--text-tertiary)' : 'var(--text-secondary)',
          minHeight: '32px',
          width: '100%',
          boxSizing: 'border-box',
          userSelect: 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {config === 'none' ? 'Calculate' : `${currentLabel}: ${value}`}
        </span>
        <span style={{ fontSize: '9px', opacity: 0.5, flexShrink: 0 }}>▼</span>
      </div>

      {open && (
        <div 
          className="summary-dropdown-menu"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            boxShadow: 'var(--shadow-md)',
            padding: '4px',
            zIndex: 100,
            minWidth: '110px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            marginBottom: '4px'
          }}
        >
          {SUMMARY_OPTIONS.map(opt => (
            <div
              key={opt.value}
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                padding: '6px 8px',
                fontSize: '12px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: config === opt.value ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: config === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = config === opt.value ? 'rgba(255, 255, 255, 0.08)' : 'transparent'}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SummaryCellSelector;
