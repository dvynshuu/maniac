import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import EmojiIcon from '../../Common/EmojiIcon';

export default function CalloutBlock({ block }) {
  const emoji = block.properties?.emoji || '💡';
  const color = block.properties?.color || 'default';

  const editor = useBlockEditor(block, {
    placeholder: 'Callout text',
    newBlockType: 'text',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  return (
    <div className="block-callout" data-color={color}>
      <span className="block-callout-emoji"><EmojiIcon emoji={emoji} size="20px" /></span>
      <EditorContent editor={editor} className="block-callout-content" />
    </div>
  );
}
