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

export default function QuoteBlock({ block }) {
  return (
    <div className="block-quote">
      <ActiveQuoteBlock block={block} />
    </div>
  );
}
