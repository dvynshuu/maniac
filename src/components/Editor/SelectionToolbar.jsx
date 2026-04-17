import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, Italic, Strikethrough, Code, Link as LinkIcon, 
  ChevronDown, Type, Palette, ExternalLink 
} from 'lucide-react';
import { useBlockStore } from '../../stores/blockStore';
import { sanitizeUrl } from '../../utils/sanitizer';

const COLORS = [
  { label: 'Default', class: '' },
  { label: 'Purple', class: 'hl-purple' },
  { label: 'Cyan', class: 'hl-cyan' },
  { label: 'Amber', class: 'hl-amber' },
  { label: 'Rose', class: 'hl-rose' },
];

function SelectionToolbar() {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [savedRange, setSavedRange] = useState(null);
  const [isLink, setIsLink] = useState(false);
  const [currentLinkHref, setCurrentLinkHref] = useState('');

  const toolbarRef = useRef(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      if (!selection || selection.rangeCount === 0) {
        if (!showLinkInput) setShow(false);
        return;
      }

      const isCollapsed = selection.isCollapsed;
      const range = selection.getRangeAt(0);
      
      // If user makes a new non-collapsed selection while link input is open, update savedRange
      if (!isCollapsed && showLinkInput) {
        setSavedRange(range.cloneRange());
      }

      // Detect if cursor/selection is inside a link
      let link = null;
      if (selection.anchorNode) {
        link = selection.anchorNode.nodeType === 3 
          ? selection.anchorNode.parentElement?.closest('a')
          : selection.anchorNode.closest?.('a');
      }
      
      const container = range.commonAncestorContainer;
      
      if (!link && container) {
        link = container.nodeType === 3 
          ? container.parentElement?.closest('a')
          : container.closest?.('a');
      }

      if (isCollapsed && !link) {
        if (!showLinkInput) setShow(false);
        return;
      }

      const rect = range.getBoundingClientRect();
      setPos({
        top: rect.top + window.scrollY - 48,
        left: rect.left + rect.width / 2
      });
      setShow(true);
      
      if (link) {
        setIsLink(true);
        setCurrentLinkHref(link.getAttribute('href') || '');
      } else {
        setIsLink(false);
      }

      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        strikethrough: document.queryCommandState('strikethrough'),
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [showLinkInput]);

  const exec = (command, value = null) => {
    document.execCommand(command, false, value);
    syncChanges();
  };

  const syncChanges = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const anchorNode = selection.anchorNode;
      const editableParent = anchorNode.nodeType === 3 
        ? anchorNode.parentElement?.closest('[contenteditable="true"]')
        : anchorNode.closest?.('[contenteditable="true"]');

      if (!editableParent) return;

      const blockEl = editableParent.closest('[data-block-id]');
      if (!blockEl) return;

      const blockId = blockEl.getAttribute('data-block-id');
      const store = useBlockStore.getState();
      const targetBlock = store.blocks.find(b => b.id === blockId);
      
      if (!targetBlock) return;

      const html = editableParent.innerHTML;

      // Check if it's a table cell
      const rowIndex = editableParent.getAttribute('data-row');
      const colIndex = editableParent.getAttribute('data-col');

      if (rowIndex !== null && colIndex !== null && targetBlock.properties?.cells) {
        // Table Sync
        const r = parseInt(rowIndex);
        const c = parseInt(colIndex);
        const newCells = [...targetBlock.properties.cells];
        newCells[r] = [...newCells[r]];
        newCells[r][c] = html;
        
        store.updateBlock(blockId, { 
          properties: { ...targetBlock.properties, cells: newCells } 
        });
      } else {
        // Standard Sync
        store.updateBlock(blockId, { content: html });
      }
    }
  };

  const applyHighlight = (colorClass) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = colorClass;
    range.surroundContents(span);
    setShow(false);
    
    syncChanges();
  };

  const handleLinkClick = () => {
    if (!showLinkInput) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        setSavedRange(selection.getRangeAt(0).cloneRange());
      }
    } else {
      setSavedRange(null);
    }
    setShowLinkInput(!showLinkInput);
  };

  const addLink = () => {
    let url = linkUrl.trim();
    if (!url) return;

    // Normalize URL
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url) && !/^tel:/i.test(url) && !url.startsWith('/') && !url.startsWith('#')) {
      url = 'https://' + url;
    }
    
    // Sanitize to prevent malicious protocols
    url = sanitizeUrl(url);
    if (url === '#') return;

    if (savedRange) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }

    exec('createLink', url);

    // After creation, ensure target="_blank"
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const linkEl = selection.anchorNode.parentElement?.closest('a') || selection.focusNode.parentElement?.closest('a');
      if (linkEl) {
        linkEl.setAttribute('target', '_blank');
        linkEl.setAttribute('rel', 'noopener noreferrer');
        syncChanges(); // Sync the manual attribute change
      }
    }

    setShowLinkInput(false);
    setLinkUrl('');
    setSavedRange(null);
  };

  if (!show) return null;

  return (
    <div 
      className="selection-toolbar-container"
      style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
    >
      <div className="selection-toolbar" ref={toolbarRef}>
        <button 
          className={`st-btn ${activeFormats.bold ? 'active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}
        >
          <Bold size={16} />
        </button>
        <button 
          className={`st-btn ${activeFormats.italic ? 'active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); exec('italic'); }}
        >
          <Italic size={16} />
        </button>
        <button 
          className={`st-btn ${activeFormats.strikethrough ? 'active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); exec('strikeThrough'); }}
        >
          <Strikethrough size={16} />
        </button>
        <button 
          className="st-btn"
          onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', '<code>'); }}
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

        {COLORS.map(c => (
          <button 
            key={c.label}
            className={`st-btn ${c.class}`}
            style={{ width: 20, height: 20, margin: '0 2px' }}
            onClick={() => applyHighlight(c.class)}
            title={c.label}
          />
        ))}

        {showLinkInput && (
          <div className="st-link-popover" onMouseDown={e => e.stopPropagation()}>
            <input 
              autoFocus
              className="st-link-input"
              placeholder="Paste or type a link..."
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLink()}
            />
            <button className="btn btn-primary btn-sm" onClick={addLink}>Link</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SelectionToolbar;
