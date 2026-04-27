import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';

export default function NumberedBlock({ block, index }) {
  const editor = useBlockEditor(block, {
    placeholder: 'List item',
    newBlockType: 'numbered',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  return (
    <div className="block-numbered">
      <div className="block-numbered-marker">{index + 1}.</div>
      <EditorContent editor={editor} className="block-text" />
    </div>
  );
}
