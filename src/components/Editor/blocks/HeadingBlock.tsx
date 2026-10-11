import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { BLOCK_TYPES } from '../../../utils/constants';
import { useBlockStore } from '../../../stores/blockStore';
import { isEmptyContent } from '../../../utils/helpers';

function ActiveHeadingBlock({ block, level, className }) {
  const editor = useBlockEditor(block, {
    placeholder: `Heading ${level}`,
    newBlockType: 'text',
    backspaceAction: 'delete',
  });

  if (!editor) return null;

  return <EditorContent editor={editor} className={className} />;
}

export default function HeadingBlock({ block }) {
  const level = block.type === BLOCK_TYPES.HEADING1 ? 1 : block.type === BLOCK_TYPES.HEADING2 ? 2 : 3;
  const className = `block-text block-heading${level}`;

  return <ActiveHeadingBlock block={block} level={level} className={className} />;
}
