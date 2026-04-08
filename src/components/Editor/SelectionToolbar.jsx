import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, Italic, Strikethrough, Code, Link as LinkIcon, 
  ChevronDown, Type, Palette, ExternalLink 
} from 'lucide-react';
import { useBlockStore } from '../../stores/blockStore';

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

  const toolbarRef = useRef(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        if (!showLinkInput) setShow(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      
      // Ensure selection is within an editable block
      const editableParent = container.nodeType === 3 
        ? container.parentElement?.closest('[contenteditable="true"]')
        : container.closest?.('[contenteditable="true"]');

      if (!editableParent) {
        setShow(false);
        return;
      }

      const rect = range.getBoundingClientRect();
      setPos({
        top: rect.top + window.scrollY - 48, // 48px above the selection
        left: rect.left + rect.width / 2
      });
      setShow(true);
      
      // Update active states (simplified)
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

  const addLink = () => {
    if (!linkUrl) return;
    exec('createLink', linkUrl);
    setShowLinkInput(false);
    setLinkUrl('');
    setShow(false);
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
          onClick={() => exec('bold')}
        >
          <Bold size={16} />
        </button>
        <button 
          className={`st-btn ${activeFormats.italic ? 'active' : ''}`}
          onClick={() => exec('italic')}
        >
          <Italic size={16} />
        </button>
        <button 
          className={`st-btn ${activeFormats.strikethrough ? 'active' : ''}`}
          onClick={() => exec('strikeThrough')}
        >
          <Strikethrough size={16} />
        </button>
        <button 
          className="st-btn"
          onClick={() => exec('formatBlock', '<code>')}
        >
          <Code size={16} />
        </button>

        <div className="st-divider" />

        <button 
          className="st-btn"
          onClick={() => setShowLinkInput(!showLinkInput)}
        >
          <LinkIcon size={16} />
        </button>

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
