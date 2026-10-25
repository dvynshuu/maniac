import React, { useEffect } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useChildBlockIds } from '../../../hooks/useChildBlockIds';
import { useBlockStore } from '../../../stores/blockStore';
import BlockRenderer from '../BlockRenderer';

export default function ColumnBlock({ block }: { block: any }) {
  const childBlockIds = useChildBlockIds(block.id);
  const parent = useBlockStore((s) => (block.parentId ? s.blockMap[block.parentId] : null));
  const siblings = useChildBlockIds(block.parentId || '');
  const myIndex = siblings.indexOf(block.id);

  const columnRatios = parent?.properties?.columnRatios;
  const ratio =
    columnRatios && columnRatios[myIndex] !== undefined
      ? columnRatios[myIndex]
      : 1 / (siblings.length || 1);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`);
    if (el) {
      el.style.flex = `${(ratio * 100).toFixed(2)}% 1 0%`;
    }
  }, [ratio, block.id]);

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
