import React, { useState, memo } from 'react';
import { GripVertical, Trash2, ArrowUp, ArrowDown, Copy } from 'lucide-react';
import { BLOCK_TYPES } from '../../utils/constants';
import TextBlock from './blocks/TextBlock';
import HeadingBlock from './blocks/HeadingBlock';
import TodoBlock from './blocks/TodoBlock';
import DividerBlock from './blocks/DividerBlock';
import ImageBlock from './blocks/ImageBlock';
import QuoteBlock from './blocks/QuoteBlock';
import CalloutBlock from './blocks/CalloutBlock';
import CodeBlock from './blocks/CodeBlock';
import BulletBlock from './blocks/BulletBlock';
import NumberedBlock from './blocks/NumberedBlock';
import TableBlock from './blocks/TableBlock';
import ToggleBlock from './blocks/ToggleBlock';
import DatabaseBlock from '../Database/DatabaseBlock';
import TrackerBlock from '../Tracker/TrackerBlock';
import ContextMenu from '../Common/ContextMenu';
import { useBlockStore } from '../../stores/blockStore';

const BlockRenderer = memo(({ blockId, index }) => {
  const block = useBlockStore(s => s.blockMap[blockId]);

  if (!block) return null;

  const renderBlockContent = () => {
    switch (block.type) {
      case BLOCK_TYPES.TEXT:
        return <TextBlock block={block} index={index} />;
      case BLOCK_TYPES.QUOTE:
        return <QuoteBlock block={block} index={index} />;
      case BLOCK_TYPES.CALLOUT:
        return <CalloutBlock block={block} index={index} />;
      case BLOCK_TYPES.BULLET:
        return <BulletBlock block={block} index={index} />;
      case BLOCK_TYPES.NUMBERED:
        return <NumberedBlock block={block} index={index} />;
      case BLOCK_TYPES.CODE:
        return <CodeBlock block={block} index={index} />;
      
      case BLOCK_TYPES.HEADING1:
      case BLOCK_TYPES.HEADING2:
      case BLOCK_TYPES.HEADING3:
        return <HeadingBlock block={block} index={index} />;
        
      case BLOCK_TYPES.TODO:
        return <TodoBlock block={block} index={index} />;
        
      case BLOCK_TYPES.DIVIDER:
        return <DividerBlock block={block} index={index} />;

      case BLOCK_TYPES.IMAGE:
        return <ImageBlock block={block} index={index} />;

      case BLOCK_TYPES.TRACKER:
        return <TrackerBlock block={block} index={index} />;
        
      case BLOCK_TYPES.TABLE:
      case BLOCK_TYPES.DATABASE:
        return <DatabaseBlock block={block} index={index} />;

      case BLOCK_TYPES.TOGGLE:
        return <ToggleBlock block={block} index={index} />;
        
      default:
        return <TextBlock block={block} index={index} />;
    }
  };

  const moveBlockUp = useBlockStore(s => s.moveBlockUp);
  const moveBlockDown = useBlockStore(s => s.moveBlockDown);
  const deleteBlock = useBlockStore(s => s.deleteBlock);
  const addBlock = useBlockStore(s => s.addBlock);
  const [isDragOver, setIsDragOver] = useState(false);
  const [menuPos, setMenuPos] = useState(null);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleDuplicate = async () => {
    const { db } = await import('../../db/database');
    const { createId, generateLexicalOrder } = await import('../../utils/helpers');
    const newSortOrder = generateLexicalOrder(block.sortOrder, null);
    const newBlock = { ...block, id: createId(), sortOrder: newSortOrder, createdAt: Date.now(), updatedAt: Date.now() };
    await db.blocks.add(newBlock);
    useBlockStore.getState().loadBlocks(block.pageId);
  };

  const menuItems = [
    { label: 'Move Up', icon: ArrowUp, action: () => moveBlockUp(block.id) },
    { label: 'Move Down', icon: ArrowDown, action: () => moveBlockDown(block.id) },
    'divider',
    { label: 'Duplicate', icon: Copy, action: handleDuplicate },
    'divider',
    { label: 'Delete', icon: Trash2, action: () => deleteBlock(block.id), danger: true },
  ];

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', block.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const draggedBlockId = e.dataTransfer.getData('text/plain');
    if (draggedBlockId && draggedBlockId !== block.id) {
       const { db } = await import('../../db/database');
       const draggedBlock = await db.blocks.get(draggedBlockId);
       if (draggedBlock) {
           const targetSortOrder = block.sortOrder;
           await db.blocks.update(draggedBlockId, { sortOrder: targetSortOrder, updatedAt: Date.now() });
           await db.blocks.update(block.id, { sortOrder: draggedBlock.sortOrder, updatedAt: Date.now() });
           useBlockStore.getState().loadBlocks(block.pageId);
       }
    }
  };

  return (
    <div 
        className="block-wrapper" 
        data-block-id={block.id}
        style={{ borderTop: isDragOver ? '2px solid var(--accent-primary)' : '2px solid transparent' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      <div 
        className="block-handle" 
        contentEditable={false} 
        suppressContentEditableWarning
        draggable
        onDragStart={handleDragStart}
        onClick={handleMenuClick}
      >
        <GripVertical size={14} style={{ pointerEvents: 'none' }} />
      </div>
      
      {menuPos && (
        <ContextMenu 
          items={menuItems} 
          position={menuPos} 
          onClose={() => setMenuPos(null)} 
        />
      )}
      <div className="block-content">
        {renderBlockContent()}
      </div>
    </div>
  );
});

export default BlockRenderer;
