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

function StaticHeadingBlock({ block, level, className, onClick }) {
  if (isEmptyContent(block.content)) {
    return (
      <div 
        className={`${className} is-editor-empty`} 
        onClick={onClick}
        style={{ color: 'var(--text-placeholder)', cursor: 'text' }}
      >
        Heading {level}
      </div>
    );
  }
  return (
    <div 
      className={className} 
      onClick={onClick}
      style={{ cursor: 'text' }}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  );
}

export default function HeadingBlock({ block }) {
  const level = block.type === BLOCK_TYPES.HEADING1 ? 1 : block.type === BLOCK_TYPES.HEADING2 ? 2 : 3;
  const className = `block-text block-heading${level}`;

  const focusBlockId = useBlockStore(s => s.focusBlockId);
  const isFocused = focusBlockId === block.id;

  const handleFocus = () => {
    useBlockStore.getState().setFocusBlock(block.id);
  };

  return isFocused ? (
    <ActiveHeadingBlock block={block} level={level} className={className} />
  ) : (
    <StaticHeadingBlock block={block} level={level} className={className} onClick={handleFocus} />
  );
}
