import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useBlockStore } from '../../../stores/blockStore';
import { isEmptyContent } from '../../../utils/helpers';
import EmojiIcon from '../../Common/EmojiIcon';

function ActiveCalloutBlock({ block }) {
  const editor = useBlockEditor(block, {
    placeholder: 'Callout text',
    newBlockType: 'text',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  return <EditorContent editor={editor} className="block-callout-content" />;
}

export default function CalloutBlock({ block }) {
  const emoji = block.properties?.emoji || '💡';
  const color = block.properties?.color || 'default';

  return (
    <div className="block-callout" data-color={color}>
      <span className="block-callout-emoji"><EmojiIcon emoji={emoji} size="20px" /></span>
      <ActiveCalloutBlock block={block} />
    </div>
  );
}
