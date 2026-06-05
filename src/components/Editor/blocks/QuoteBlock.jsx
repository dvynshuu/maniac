import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useBlockStore } from '../../../stores/blockStore';
import { isEmptyContent } from '../../../utils/helpers';

function ActiveQuoteBlock({ block }) {
  const editor = useBlockEditor(block, {
    placeholder: 'Empty quote',
    newBlockType: 'text',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  return <EditorContent editor={editor} className="block-text" />;
}

function StaticQuoteBlock({ block, onClick }) {
  if (isEmptyContent(block.content)) {
    return (
      <div 
        className="tiptap-editor block-text is-editor-empty" 
        onClick={onClick}
        style={{ color: 'var(--text-placeholder)', cursor: 'text' }}
      >
        Empty quote
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

export default function QuoteBlock({ block }) {
  const focusBlockId = useBlockStore(s => s.focusBlockId);
  const isFocused = focusBlockId === block.id;

  const handleFocus = () => {
    useBlockStore.getState().setFocusBlock(block.id);
  };

  return (
    <div className="block-quote">
      {isFocused ? (
        <ActiveQuoteBlock block={block} />
      ) : (
        <StaticQuoteBlock block={block} onClick={handleFocus} />
      )}
    </div>
  );
}
