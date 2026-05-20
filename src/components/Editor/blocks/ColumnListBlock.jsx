import React from 'react';
import { useChildBlockIds } from '../../../hooks/useChildBlockIds';
import BlockRenderer from '../BlockRenderer';

export default function ColumnListBlock({ block }) {
  const childBlockIds = useChildBlockIds(block.id);

  return (
    <div className="block-column-list">
      {childBlockIds.map((childId, index) => (
        <BlockRenderer key={childId} blockId={childId} index={index} />
      ))}
    </div>
  );
}
