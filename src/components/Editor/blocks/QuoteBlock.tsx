import React from 'react';
import UniversalTextEditor from './UniversalTextEditor';

export default function QuoteBlock({ block }: { block: any }) {
  return (
    <div className="block-quote-container">
      <div className="block-quote-bar" />
      <UniversalTextEditor
        block={block}
        placeholder="Empty quote"
        className="block-text block-quote"
        newBlockType="text"
        backspaceAction="convert"
      />
    </div>
  );
}
