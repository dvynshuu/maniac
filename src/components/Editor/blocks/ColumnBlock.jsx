import React from 'react';
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
        childBlockIds.map((childId, index) => (
          <BlockRenderer key={childId} blockId={childId} index={index} />
        ))
      )}
    </div>
  );
}
