import React from 'react';
import UniversalTextEditor from './UniversalTextEditor';

export default function TextBlock({ block }: { block: any; index?: number }) {
  return (
    <UniversalTextEditor
      block={block}
      placeholder="Type '/' for commands or '@' to mention"
      className="block-text"
      newBlockType="text"
      backspaceAction="delete"
    />
  );
}
