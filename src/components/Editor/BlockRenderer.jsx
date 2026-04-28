import React, { useState, memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import EmbedBlock from './blocks/EmbedBlock';
import DatabaseBlock from '../Database/DatabaseBlock';
import TrackerBlock from '../Tracker/TrackerBlock';
import ContextMenu from '../Common/ContextMenu';
import { useBlockStore } from '../../stores/blockStore';

const BlockRenderer = memo(({ blockId, index }) => {
  const block = useBlockStore(s => s.blockMap[blockId]);
  const childBlockIds = useBlockStore(useShallow(s =>
    s.blockOrder.filter(id => s.blockMap[id]?.parentId === blockId)
  ));

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: blockId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

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

      case BLOCK_TYPES.EMBED:
        return <EmbedBlock block={block} index={index} />;
        
      default:
        return <TextBlock block={block} index={index} />;
    }
  };

  const moveBlockUp = useBlockStore(s => s.moveBlockUp);
  const moveBlockDown = useBlockStore(s => s.moveBlockDown);
  const deleteBlock = useBlockStore(s => s.deleteBlock);
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`block-wrapper ${isDragging ? 'dragging' : ''}`}
      data-block-id={block.id}
      {...attributes}
    >
      <div
        className="block-handle"
        contentEditable={false}
        suppressContentEditableWarning
        {...listeners}
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
      {childBlockIds.length > 0 && (
        <div className="block-children" style={{ paddingLeft: '24px' }}>
          {childBlockIds.map((childId, i) => (
            <BlockRenderer key={childId} blockId={childId} index={i} />
          ))}
        </div>
      )}
    </div>
  );
});

export default BlockRenderer;
