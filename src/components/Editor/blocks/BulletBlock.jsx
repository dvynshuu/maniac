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

function StaticBulletBlock({ block, onClick }) {
  if (isEmptyContent(block.content)) {
    return (
      <div 
        className="tiptap-editor block-text is-editor-empty" 
        onClick={onClick}
        style={{ color: 'var(--text-placeholder)', cursor: 'text' }}
      >
        List item
      </div>
    );
  }
  return (
    <div 
      className="tiptap-editor block-text" 
      onClick={onClick}
      style={{ cursor: 'text' }}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  );
}

export default function BulletBlock({ block }) {
  const depth = block.properties?.depth || 0;

  const focusBlockId = useBlockStore(s => s.focusBlockId);
  const isFocused = focusBlockId === block.id;

  const handleFocus = () => {
    useBlockStore.getState().setFocusBlock(block.id);
  };

  return (
    <div className="block-bullet">
      <div className="block-bullet-marker" data-depth={depth % 3}></div>
      {isFocused ? (
        <ActiveBulletBlock block={block} />
      ) : (
        <StaticBulletBlock block={block} onClick={handleFocus} />
      )}
    </div>
  );
}
