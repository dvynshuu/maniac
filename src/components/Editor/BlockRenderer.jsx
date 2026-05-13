import React, { useState, memo, useRef, useEffect, useCallback } from 'react';
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
import SyncedBlock from './blocks/SyncedBlock';
import DatabaseBlock from '../Database/DatabaseBlock';
import TrackerBlock from '../Tracker/TrackerBlock';
import ContextMenu from '../Common/ContextMenu';
import { useBlockStore } from '../../stores/blockStore';
import { useChildBlockIds } from '../../hooks/useChildBlockIds';
import { useEditorEngine } from '../../hooks/useEditorEngine';
import { useVirtualizerContext, useBlockVisible, getCachedHeight, setCachedHeight } from '../../hooks/useBlockVirtualizer';

const BlockRenderer = memo(({ blockId, index }) => {
  const block = useBlockStore(s => s.blockMap[blockId]);
  // Performance: incremental child map instead of O(n) filter
  const childBlockIds = useChildBlockIds(blockId);
  const engine = useEditorEngine();
  const virtualizer = useVirtualizerContext();

  // ── ALL hooks must be called unconditionally (Rules of Hooks) ──
  const wrapperRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);

  // Per-block visibility via useSyncExternalStore
  const isVisible = useBlockVisible(blockId);

  // Register with IntersectionObserver
  const setWrapperRef = useCallback((node) => {
    if (wrapperRef.current && virtualizer) {
      virtualizer.unobserve(wrapperRef.current);
    }
    wrapperRef.current = node;
    if (node && virtualizer) {
      virtualizer.observe(node, blockId);
    }
  }, [virtualizer, blockId]);

  // ResizeObserver: cache measured heights for placeholders
  useEffect(() => {
    if (!isVisible || !wrapperRef.current) return;

    const element = wrapperRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (height > 0) {
          setCachedHeight(blockId, height);
        }
      }
    });

    ro.observe(element);
    resizeObserverRef.current = ro;

    return () => {
      ro.disconnect();
      resizeObserverRef.current = null;
    };
  }, [isVisible, blockId]);


  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: blockId });

  // Combine sortable ref with our virtualizer ref
  const combinedRef = useCallback((node) => {
    setNodeRef(node);
    setWrapperRef(node);
  }, [setNodeRef, setWrapperRef]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  // ── Early returns AFTER all hooks ─────────────────────────────
  if (!block) return null;

  // Placeholder for offscreen blocks
  if (!isVisible) {
    const placeholderHeight = getCachedHeight(blockId);
    return (
      <div
        ref={combinedRef}
        style={{
          ...style,
          height: placeholderHeight,
          minHeight: 28,
        }}
        className="block-wrapper block-placeholder"
        data-block-id={block.id}
        {...attributes}
      />
    );
  }

  // ── Full render for visible blocks ────────────────────────────

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

      case BLOCK_TYPES.SYNCED_REFERENCE:
        return <SyncedBlock block={block} index={index} />;
        
      default:
        return <TextBlock block={block} index={index} />;
    }
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleMoveUp = () => {
    const { blockOrder, blockMap } = useBlockStore.getState();
    const idx = blockOrder.indexOf(block.id);
    if (idx <= 0) return;
    for (let i = idx - 1; i >= 0; i--) {
      const candidateId = blockOrder[i];
      const candidate = blockMap[candidateId];
      if ((candidate?.parentId || null) === (block.parentId || null)) {
        const prevIdx = i - 1;
        let afterId = null;
        for (let j = prevIdx; j >= 0; j--) {
          if ((blockMap[blockOrder[j]]?.parentId || null) === (block.parentId || null)) {
            afterId = blockOrder[j];
            break;
          }
        }
        engine.move(block.id, block.parentId || null, afterId);
        return;
      }
    }
  };

  const handleMoveDown = () => {
    const { blockOrder, blockMap } = useBlockStore.getState();
    const idx = blockOrder.indexOf(block.id);
    for (let i = idx + 1; i < blockOrder.length; i++) {
      const candidateId = blockOrder[i];
      const candidate = blockMap[candidateId];
      if ((candidate?.parentId || null) === (block.parentId || null)) {
        engine.move(block.id, block.parentId || null, candidateId);
        return;
      }
    }
  };

  const handleDuplicate = async () => {
    const { dispatch } = await import('../../core/commandBus');
    await dispatch({
      type: 'block/create',
      payload: {
        pageId: block.pageId,
        type: block.type,
        parentId: block.parentId,
        afterBlockId: block.id,
        content: block.content,
        properties: { ...block.properties }
      }
    });
  };

  const handleDelete = () => {
    engine.deleteBlock(block.id);
  };

  const menuItems = [
    { label: 'Move Up', icon: ArrowUp, action: handleMoveUp },
    { label: 'Move Down', icon: ArrowDown, action: handleMoveDown },
    'divider',
    { label: 'Duplicate', icon: Copy, action: handleDuplicate },
    'divider',
    { label: 'Delete', icon: Trash2, action: handleDelete, danger: true },
  ];

  return (
    <div
      ref={combinedRef}
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
      {/* Skip generic child rendering for blocks that manage their own children */}
      {childBlockIds.length > 0 && block.type !== BLOCK_TYPES.TOGGLE && block.type !== BLOCK_TYPES.DATABASE && (
        <div className="block-children">
          {childBlockIds.map((childId, i) => (
            <BlockRenderer key={childId} blockId={childId} index={i} />
          ))}
        </div>
      )}
    </div>
  );
});

export default BlockRenderer;
