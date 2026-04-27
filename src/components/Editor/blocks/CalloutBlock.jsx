import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';

export default function CalloutBlock({ block }) {
  const emoji = block.properties?.emoji || '💡';

  const editor = useBlockEditor(block, {
    placeholder: 'Callout text',
    newBlockType: 'text',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  return (
    <div className="block-callout">
      <span className="block-callout-emoji">{emoji}</span>
      <EditorContent editor={editor} className="block-callout-content" />
    </div>
  );
}
