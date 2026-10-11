import React from 'react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useChildBlockIds } from '../../../hooks/useChildBlockIds';
import BlockRenderer from '../BlockRenderer';

export default function ColumnListBlock({ block }) {
  const childBlockIds = useChildBlockIds(block.id);

  return (
    <div className="block-column-list">
      <SortableContext items={childBlockIds.filter(Boolean)} strategy={horizontalListSortingStrategy}>
        {childBlockIds.filter(Boolean).map((childId, index) => (
          <BlockRenderer key={childId} blockId={childId} index={index} />
        ))}
      </SortableContext>
    </div>
  );
}
