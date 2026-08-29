import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, Italic, Strikethrough, Code, Link as LinkIcon, 
  Palette, ExternalLink, Heading3, Sparkles, List, Quote
} from 'lucide-react';
import { useBlockStore } from '../../stores/blockStore';
import { useUIStore } from '../../stores/uiStore';
import { sanitizeUrl } from '../../utils/sanitizer';

const COLORS = [
  { label: 'Default', class: '', color: 'transparent' },
  { label: 'Gray', class: 'hl-gray', color: 'var(--block-color-gray, #9b9a97)' },
  { label: 'Brown', class: 'hl-brown', color: 'var(--block-color-brown, #ba856f)' },
  { label: 'Orange', class: 'hl-orange', color: 'var(--block-color-orange, #c77d48)' },
  { label: 'Yellow', class: 'hl-yellow', color: 'var(--block-color-yellow, #ca9849)' },
  { label: 'Green', class: 'hl-green', color: 'var(--block-color-green, #529e72)' },
  { label: 'Blue', class: 'hl-blue', color: 'var(--block-color-blue, #5e87c9)' },
  { label: 'Purple', class: 'hl-purple', color: 'var(--block-color-purple, #9065b0)' },
  { label: 'Pink', class: 'hl-pink', color: 'var(--block-color-pink, #c14c8a)' },
  { label: 'Red', class: 'hl-red', color: 'var(--block-color-red, #d44c47)' },
];

function SelectionToolbar() {
  const activeEditor = useUIStore(s => s.activeEditor);
  const activeEditorBlockId = useUIStore(s => s.activeEditorBlockId);
  const changeBlockType = useBlockStore(s => s.changeBlockType);

  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    strikethrough: false,
    code: false,
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [currentLinkHref, setCurrentLinkHref] = useState('');

  const toolbarRef = useRef(null);

  useEffect(() => {
    if (!activeEditor) {
      if (!showLinkInput) setShow(false);
      return;
    }

    const updateToolbar = () => {
      if (activeEditor.isDestroyed) return;
      
      const { selection } = activeEditor.state;
      if (selection.empty) {
        if (!showLinkInput) setShow(false);
        return;
      }

      // Calculate position
      try {
        const view = activeEditor.view;
        const { from, to } = selection;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);

        const top = Math.min(start.top, end.top);
        const left = (start.left + end.left) / 2;

        // Clamp coordinates within viewport boundaries
        const toolbarHalfWidth = 180;
        const clampedTop = Math.max(12, top + window.scrollY - 48);
        const clampedLeft = Math.max(toolbarHalfWidth + 16, Math.min(left, window.innerWidth - toolbarHalfWidth - 16));

        setPos({
          top: clampedTop,
          left: clampedLeft
        });

        setShow(true);

        // Active formats
        setActiveFormats({
          bold: activeEditor.isActive('bold'),
          italic: activeEditor.isActive('italic'),
          strikethrough: activeEditor.isActive('strike'),
          code: activeEditor.isActive('code'),
        });

        const linkIsActive = activeEditor.isActive('link');
        setIsLink(linkIsActive);
        if (linkIsActive) {
          setCurrentLinkHref(activeEditor.getAttributes('link').href || '');
        } else {
          setCurrentLinkHref('');
        }
      } catch (e) {
        // Fallback if coords tracking fails during rapid changes
        if (!showLinkInput) setShow(false);
      }
    };

    activeEditor.on('selectionUpdate', updateToolbar);
    activeEditor.on('transaction', updateToolbar);

    // Initial check
    updateToolbar();

    return () => {
      activeEditor.off('selectionUpdate', updateToolbar);
      activeEditor.off('transaction', updateToolbar);
    };
  }, [activeEditor, showLinkInput]);

  const applyHighlight = (colorClass) => {
    if (!activeEditor) return;
    if (!colorClass) {
      activeEditor.chain().focus().unsetMark('customHighlight').run();
    } else {
      activeEditor.chain().focus().setMark('customHighlight', { class: colorClass }).run();
    }
    setShowColorPicker(false);
  };

  const handleLinkClick = () => {
    setShowLinkInput(!showLinkInput);
  };

  const addLink = () => {
    if (!activeEditor) return;
    let url = linkUrl.trim();
    if (!url) {
      activeEditor.chain().focus().unsetLink().run();
      setShowLinkInput(false);
      setLinkUrl('');
      return;
    }

    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url) && !/^tel:/i.test(url) && !url.startsWith('/') && !url.startsWith('#')) {
      url = 'https://' + url;
    }
    
    url = sanitizeUrl(url);
    if (url === '#') return;

    activeEditor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();

    setShowLinkInput(false);
    setLinkUrl('');
  };

  const handleBlockFormat = (type) => {
    if (activeEditorBlockId) {
      changeBlockType(activeEditorBlockId, type);
      setShow(false);
    }
  };

  if (!show || !activeEditor) return null;

  return (
    <div 
      className="selection-toolbar-container"
      style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
    >
      <div className="selection-toolbar" ref={toolbarRef}>
        <button 
          className={`st-btn ${activeFormats.bold ? 'active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); activeEditor.chain().focus().toggleBold().run(); }}
        >
          <Bold size={16} />
        </button>
        <button 
          className={`st-btn ${activeFormats.italic ? 'active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); activeEditor.chain().focus().toggleItalic().run(); }}
        >
          <Italic size={16} />
        </button>
        <button 
          className={`st-btn ${activeFormats.strikethrough ? 'active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); activeEditor.chain().focus().toggleStrike().run(); }}
        >
          <Strikethrough size={16} />
        </button>
        <button 
          className={`st-btn ${activeFormats.code ? 'active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); activeEditor.chain().focus().toggleCode().run(); }}
        >
          <Code size={16} />
        </button>

        <div className="st-divider" />

        <button 
          className={`st-btn ${showLinkInput ? 'active' : ''}`}
          onClick={handleLinkClick}
        >
          <LinkIcon size={16} />
        </button>

        {isLink && (
          <>
            <div className="st-divider" />
            <button 
              className="st-btn"
              onClick={() => {
                const safeUrl = sanitizeUrl(currentLinkHref);
                if (safeUrl !== '#') {
                  window.open(safeUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              title="Open link"
            >
              <ExternalLink size={16} />
            </button>
          </>
        )}

        <div className="st-divider" />

        <button 
          className="st-btn"
          onMouseDown={(e) => { e.preventDefault(); handleBlockFormat('heading3'); }}
          title="Heading 3"
        >
          <Heading3 size={16} />
        </button>

        <div className="st-divider" />

        <div style={{ position: 'relative' }}>
          <button 
            className="st-btn"
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Highlight"
          >
            <Palette size={16} />
          </button>
          
          {showColorPicker && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '8px', padding: '8px', display: 'flex', gap: '4px', zIndex: 1000 }}>
              {COLORS.map(c => (
                <button 
                  key={c.label}
                  className="st-btn"
                  style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: '4px', 
                    background: c.color,
                    border: c.class === '' ? '1px solid var(--border-strong)' : 'none'
                  }}
                  onMouseDown={(e) => { e.preventDefault(); applyHighlight(c.class); }}
                  title={c.label}
                />
              ))}
            </div>
          )}
        </div>

        <div className="st-divider" />

        <button 
          className="st-btn"
          onMouseDown={(e) => { e.preventDefault(); handleBlockFormat('bullet'); }}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button 
          className="st-btn"
          onMouseDown={(e) => { e.preventDefault(); handleBlockFormat('callout'); }}
          title="Callout"
        >
          <Quote size={16} />
        </button>

        <div className="st-divider" />

        <button 
          className="st-btn"
          onClick={() => {
            useUIStore.getState().addToast('AI Magic is coming soon!', 'info');
          }}
          title="AI Magic"
          style={{ color: 'var(--accent-secondary)' }}
        >
          <Sparkles size={16} />
        </button>

        {showLinkInput && (
          <div className="st-link-popover" onMouseDown={e => e.stopPropagation()}>
            <input 
              autoFocus
              className="st-link-input"
              placeholder="Paste or type a link..."
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLink();
                }
              }}
            />
            <button className="btn btn-primary btn-sm" onClick={(e) => { e.preventDefault(); addLink(); }}>Link</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SelectionToolbar;
