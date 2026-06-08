import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useBlockStore } from '../../../stores/blockStore';
import { isEmptyContent } from '../../../utils/helpers';

function ActiveBulletBlock({ block }) {
  const editor = useBlockEditor(block, {
    placeholder: 'List item',
    newBlockType: 'bullet',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  return <EditorContent editor={editor} className="block-text" />;
}

export default function BulletBlock({ block }) {
  const depth = block.properties?.depth || 0;

  return (
    <div className="block-bullet">
      <div className="block-bullet-marker" data-depth={depth % 3}></div>
      <ActiveBulletBlock block={block} />
    </div>
  );
}
