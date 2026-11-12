import React from 'react';
import UniversalTextEditor from './UniversalTextEditor';
import { BLOCK_TYPES } from '../../../utils/constants';

export default function HeadingBlock({ block }: { block: any }) {
  const level = block.type === BLOCK_TYPES.HEADING1 ? 1 : block.type === BLOCK_TYPES.HEADING2 ? 2 : 3;
  const className = `block-text block-heading${level}`;

  return (
    <UniversalTextEditor
      block={block}
      placeholder={`Heading ${level}`}
      className={className}
      newBlockType="text"
      backspaceAction="convert"
    />
  );
}
