import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useChildBlockIds } from '../../../hooks/useChildBlockIds';
import BlockRenderer from '../BlockRenderer';

export default function ColumnBlock({ block }) {
  const childBlockIds = useChildBlockIds(block.id);

  return (
    <div className="block-column-content">
      {childBlockIds.length === 0 ? (
        <div className="empty-column-placeholder">
          Empty column. Drag blocks here.
        </div>
      ) : (
        <SortableContext items={childBlockIds.filter(Boolean)} strategy={verticalListSortingStrategy}>
          {childBlockIds.filter(Boolean).map((childId, index) => (
            <BlockRenderer key={childId} blockId={childId} index={index} />
          ))}
        </SortableContext>
      )}
    </div>
  );
}
