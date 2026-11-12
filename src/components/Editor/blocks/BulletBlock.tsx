import React from 'react';
import UniversalTextEditor from './UniversalTextEditor';

export default function BulletBlock({ block }: { block: any }) {
  const depth = block.properties?.depth || 0;

  return (
    <div className="block-bullet">
      <div className="block-bullet-marker" data-depth={depth % 3} />
      <UniversalTextEditor
        block={block}
        placeholder="List item"
        className="block-text"
        newBlockType="bullet"
        backspaceAction="convert"
      />
    </div>
  );
}
