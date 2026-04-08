import { useState, useRef, useEffect } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { BLOCK_TYPES } from '../../../utils/constants';
import SlashMenu from '../SlashMenu';

export default function TextBlock({ block, index }) {
  const [content, setContent] = useState(block.content);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  
  const contentRef = useRef(null);
  
  const updateBlock = useBlockStore((s) => s.updateBlock);
  const addBlock = useBlockStore((s) => s.addBlock);
  const deleteBlock = useBlockStore((s) => s.deleteBlock);
  const focusBlockId = useBlockStore((s) => s.focusBlockId);

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== block.content) {
      contentRef.current.innerHTML = block.content;
    }
  }, [block.id]); // only re-sync if the block itself changes

  useEffect(() => {
    if (focusBlockId === block.id && contentRef.current) {
      contentRef.current.focus();
      // Move cursor to end
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [focusBlockId, block.id]);

  const handleInput = (e) => {
    const html = e.currentTarget.innerHTML;
    const text = e.currentTarget.textContent;
    // We update local content state for logic (like slash menu)
    setContent(html);
    
    // Check for slash menu using text content to avoid HTML tags interference
    if (text.includes('/')) {
        const lastSlashIndex = text.lastIndexOf('/');
        const query = text.substring(lastSlashIndex + 1);
        if (!query.includes(' ')) {
             setSlashQuery(query);
             setShowSlashMenu(true);
        } else {
             setShowSlashMenu(false);
        }
    } else {
        setShowSlashMenu(false);
    }
  };

  const handleBlur = () => {
    const currentHTML = contentRef.current?.innerHTML || "";
    if (currentHTML !== block.content) {
      updateBlock(block.id, { content: currentHTML });
    }
    setTimeout(() => {
        if (!document.activeElement.closest('.slash-menu')) {
            setShowSlashMenu(false);
        }
    }, 150);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showSlashMenu) return;

      // Sync before adding new block
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
      const htmlWithoutSlash = currentHTML.substring(0, lastSlashIndex);
      
      contentRef.current.innerHTML = htmlWithoutSlash;
      updateBlock(block.id, { content: htmlWithoutSlash });
      
      useBlockStore.getState().changeBlockType(block.id, type);
      setShowSlashMenu(false);
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
                data-placeholder="Type '/' for commands"
            ></div>
            {showSlashMenu && (
                <SlashMenu 
                   query={slashQuery} 
                   onSelect={handleSelectSlashItem} 
                   onClose={() => setShowSlashMenu(false)} 
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
