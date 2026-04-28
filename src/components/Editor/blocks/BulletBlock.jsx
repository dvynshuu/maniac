import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';

export default function BulletBlock({ block }) {
  const depth = block.properties?.depth || 0;

  const editor = useBlockEditor(block, {
    placeholder: 'List item',
    newBlockType: 'bullet',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  return (
    <div className="block-bullet">
      <div className="block-bullet-marker" data-depth={depth % 3}></div>
      <EditorContent editor={editor} className="block-text" />
    </div>
  );
}
