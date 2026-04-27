import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';

export default function QuoteBlock({ block }) {
  const editor = useBlockEditor(block, {
    placeholder: 'Empty quote',
    newBlockType: 'text',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  return (
    <div className="block-quote">
      <EditorContent editor={editor} className="block-text" />
    </div>
  );
}
