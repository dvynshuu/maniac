import { useState, useRef, useEffect } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function MathBlock({ block }) {
  const [isEditing, setIsEditing] = useState(!block.content);
  const [formula, setFormula] = useState(block.content || '');
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const engine = useEditorEngine();
  const focusBlockId = useBlockStore(s => s.focusBlockId);

  // Sync with block content changes
  useEffect(() => {
    if (block.content !== formula) {
      setFormula(block.content || '');
    }
  }, [block.content]);

  // Focus management
  useEffect(() => {
    if (focusBlockId === block.id) {
      setIsEditing(true);
    }
  }, [focusBlockId, block.id]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle render
  useEffect(() => {
    if (!isEditing && containerRef.current) {
      try {
        katex.render(formula || '\\text{Click to add LaTeX}', containerRef.current, {
          displayMode: true,
          throwOnError: false,
        });
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    }
  }, [formula, isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (formula !== block.content) {
      engine.updateBlock(block.id, { content: formula });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setFormula(block.content || '');
      setIsEditing(false);
    } else if (e.key === 'Backspace' && formula === '') {
      e.preventDefault();
      engine.convertType(block.id, 'text');
    }
  };

  return (
    <div className="block-math-wrapper" style={{ margin: '8px 0', width: '100%' }}>
      {isEditing ? (
        <div 
          className="block-math-edit" 
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>LaTeX</span>
            <input
              ref={inputRef}
              type="text"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              placeholder="e.g. E = mc^2"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
              }}
            />
          </div>
          {formula && (
            <div 
              style={{ 
                fontSize: '11px', 
                color: 'var(--text-tertiary)', 
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '6px'
              }}
            >
              Press <kbd style={{ background: 'var(--bg-tertiary)', padding: '2px 4px', borderRadius: '4px' }}>Enter</kbd> to render
            </div>
          )}
        </div>
      ) : (
        <div
          ref={containerRef}
          onClick={() => setIsEditing(true)}
          className="block-math-preview"
          style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            textAlign: 'center',
            minHeight: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
            background: 'rgba(255,255,255,0.01)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}
        />
      )}
      {error && (
        <div style={{ color: 'var(--text-danger)', fontSize: '12px', marginTop: '4px' }}>
          {error}
        </div>
      )}
    </div>
  );
}
