import { useState, useRef, useEffect, useCallback } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { useUndoStore } from '../../../stores/undoStore';
import { BLOCK_TYPES } from '../../../utils/constants';
import SlashMenu from '../SlashMenu';
import MentionMenu from '../MentionMenu';
import { debounce } from '../../../utils/helpers';
import { sanitize } from '../../../utils/sanitizer';

export default function TextBlock({ block, index }) {
  const [content, setContent] = useState(block.content);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  
  const contentRef = useRef(null);
  const lastPushedContent = useRef(block.content);
  
  const updateBlock = useBlockStore((s) => s.updateBlock);
  const addBlock = useBlockStore((s) => s.addBlock);
  const deleteBlock = useBlockStore((s) => s.deleteBlock);
  const focusBlockId = useBlockStore((s) => s.focusBlockId);
  const pushUndo = useUndoStore((s) => s.pushUndo);

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== block.content) {
      contentRef.current.innerHTML = sanitize(block.content);
    }
  }, [block.id]);

  useEffect(() => {
    if (focusBlockId === block.id && contentRef.current) {
      contentRef.current.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [focusBlockId, block.id]);

  // Debounced save to store
  const debouncedSave = useCallback(
    debounce((html) => {
      if (html !== block.content) {
        updateBlock(block.id, { content: html });
      }
    }, 1000),
    [block.id, block.content, updateBlock]
  );

  const handleInput = (e) => {
    const html = e.currentTarget.innerHTML;
    const sanitizedHtml = sanitize(html);
    const text = e.currentTarget.textContent;
    setContent(sanitizedHtml);
    
    // Undo tracking: push snapshot if this is the first stroke or after a pause
    if (html !== lastPushedContent.current) {
        // Simple logic: push if it's been a while or length change is significant
        // For now, let's just push when it starts changing from the initial load
        if (lastPushedContent.current === block.content) {
            pushUndo({ blockId: block.id, oldContent: block.content, newContent: html });
        }
        lastPushedContent.current = html;
    }

    // Check for slash menu
    if (text.includes('/')) {
        const lastSlashIndex = text.lastIndexOf('/');
        const query = text.substring(lastSlashIndex + 1);
        if (!query.includes(' ')) {
             setSlashQuery(query);
             setShowSlashMenu(true);
             setShowMentionMenu(false);
        } else {
             setShowSlashMenu(false);
        }
    } else if (text.includes('@') || text.includes('[[')) {
        const trigger = text.includes('@') ? '@' : '[[';
        const lastTriggerIndex = text.lastIndexOf(trigger);
        const query = text.substring(lastTriggerIndex + trigger.length);
        if (!query.includes(' ')) {
            setMentionQuery(query);
            setShowMentionMenu(true);
            setShowSlashMenu(false);
        } else {
            setShowMentionMenu(false);
        }
    } else {
        setShowSlashMenu(false);
        setShowMentionMenu(false);
    }

    debouncedSave(sanitizedHtml);
  };

  const handleBlur = () => {
    const currentHTML = contentRef.current?.innerHTML || "";
    if (currentHTML !== block.content) {
      updateBlock(block.id, { content: currentHTML });
    }
    setTimeout(() => {
        setShowSlashMenu(false);
        setShowMentionMenu(false);
    }, 200);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (showSlashMenu || showMentionMenu) return; // let the menu handle it
      e.preventDefault();
      updateBlock(block.id, { content: contentRef.current.innerHTML });
      addBlock(block.pageId, 'text', block.id);
    } else if (e.key === 'Backspace' && contentRef.current.textContent === '') {
      e.preventDefault();
      deleteBlock(block.id);
    }
  };

  const handleSelectSlashItem = (type) => {
      const currentHTML = contentRef.current.innerHTML;
      const lastSlashIndex = currentHTML.lastIndexOf('/');
      const htmlWithoutTrigger = currentHTML.substring(0, lastSlashIndex);
      
      contentRef.current.innerHTML = htmlWithoutTrigger;
      updateBlock(block.id, { content: htmlWithoutTrigger });
      useBlockStore.getState().changeBlockType(block.id, type);
      setShowSlashMenu(false);
  };

  const handleSelectMention = (page) => {
      const currentHTML = contentRef.current.innerHTML;
      const trigger = currentHTML.includes('@') ? '@' : '[[';
      const lastTriggerIndex = currentHTML.lastIndexOf(trigger);
      const htmlBefore = currentHTML.substring(0, lastTriggerIndex);
      
      const mentionHtml = `<a class="page-mention" href="/page/${page.id}" data-page-id="${page.id}" contenteditable="false">
        <span class="mention-icon">${page.icon || '📄'}</span>
        <span class="mention-label">${page.title || 'Untitled'}</span>
      </a> `;
      
      const newHtml = htmlBefore + mentionHtml;
      contentRef.current.innerHTML = newHtml;
      updateBlock(block.id, { content: newHtml });
      setShowMentionMenu(false);
      
      // Focus back and move to end
      contentRef.current.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
  };

  const renderFormatting = () => {
     let cls = "block-text";
     let prefix = null;

     switch(block.type) {
         case BLOCK_TYPES.QUOTE: cls += " block-quote"; break;
         case BLOCK_TYPES.CALLOUT: 
            cls += " block-callout-content"; 
            prefix = <span className="block-callout-emoji">{block.properties.emoji || '💡'}</span>;
            break;
         case BLOCK_TYPES.BULLET:
            prefix = <div className="block-bullet-marker"></div>;
            break;
         case BLOCK_TYPES.NUMBERED:
            prefix = <div className="block-numbered-marker">{index + 1}.</div>;
            break;
         case BLOCK_TYPES.CODE:
            return (
                <div className="block-code-wrapper">
                   <div className="block-code-header">
                       <span>{block.properties.language || 'javascript'}</span>
                   </div>
                   <div 
                      ref={contentRef}
                      className="block-code"
                      contentEditable
                      suppressContentEditableWarning
                      onInput={handleInput}
                      onBlur={handleBlur}
                      onKeyDown={(e) => {
                         if (e.key === 'Backspace' && contentRef.current.textContent === '') {
                             e.preventDefault();
                             useBlockStore.getState().changeBlockType(block.id, 'text');
                         }
                      }}
                      data-placeholder="Write code here..."
                   ></div>
                </div>
            );
         default: break;
     }

     const mainContent = (
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <div
                ref={contentRef}
                className={block.type === BLOCK_TYPES.CALLOUT ? "" : cls}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                data-placeholder="Type '/' for commands or '@' to mention"
            ></div>
            {showSlashMenu && (
                <SlashMenu 
                   query={slashQuery} 
                   onSelect={handleSelectSlashItem} 
                   onClose={() => setShowSlashMenu(false)} 
                />
            )}
            {showMentionMenu && (
                <MentionMenu
                   query={mentionQuery}
                   onSelect={handleSelectMention}
                   onClose={() => setShowMentionMenu(false)}
                />
            )}
        </div>
     );

     if (block.type === BLOCK_TYPES.CALLOUT) {
         return (
             <div className="block-callout">
                 {prefix}
                 {mainContent}
             </div>
         );
     } else if (prefix) {
         return (
             <div className={`block-${block.type}`}>
                 {prefix}
                 {mainContent}
             </div>
         );
     }

     return mainContent;
  }

  return renderFormatting();
}
