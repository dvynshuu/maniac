import React, { useRef } from 'react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useChildBlockIds } from '../../../hooks/useChildBlockIds';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import BlockRenderer from '../BlockRenderer';

export default function ColumnListBlock({ block }: { block: any }) {
  const childBlockIds = useChildBlockIds(block.id);
  const engine = useEditorEngine();
  const containerRef = useRef<HTMLDivElement>(null);

  const count = childBlockIds.length;
  const ratios: number[] =
    block.properties?.columnRatios && block.properties.columnRatios.length === count
      ? block.properties.columnRatios
      : Array(count).fill(1 / (count || 1));

  const handleResizeStart = (colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    const startX = e.clientX;
    const rect = container.getBoundingClientRect();
    const totalWidth = rect.width;
    const initialRatios = [...ratios];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaRatio = deltaX / totalWidth;

      const newRatios = [...initialRatios];
      const minRatio = 0.15;
      const combined = initialRatios[colIndex] + initialRatios[colIndex + 1];

      let newLeft = Math.max(minRatio, Math.min(combined - minRatio, initialRatios[colIndex] + deltaRatio));
      let newRight = combined - newLeft;

      newRatios[colIndex] = Number(newLeft.toFixed(3));
      newRatios[colIndex + 1] = Number(newRight.toFixed(3));

      engine.updateBlock(block.id, {
        properties: { ...block.properties, columnRatios: newRatios },
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="block-column-list-wrapper" ref={containerRef}>
      <div className="block-column-list">
        <SortableContext items={childBlockIds.filter(Boolean)} strategy={horizontalListSortingStrategy}>
          {childBlockIds.filter(Boolean).map((childId, index) => (
            <React.Fragment key={childId}>
              <BlockRenderer blockId={childId} index={index} />
              {index < childBlockIds.length - 1 && (
                <div
                  className="column-resize-handle"
                  onMouseDown={(e) => handleResizeStart(index, e)}
                  contentEditable={false}
                  title="Drag to resize columns"
                >
                  <div className="column-resize-handle-bar" />
                </div>
              )}
            </React.Fragment>
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
