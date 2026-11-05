import React, { useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { Quote as QuoteIcon } from 'lucide-react';

function ActiveQuoteBlock({ block }: { block: any }) {
  const editor = useBlockEditor(block, {
    placeholder: 'Write quote or citation...',
    newBlockType: 'text',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  return <EditorContent editor={editor} className="block-text block-quote-content" />;
}

export default function QuoteBlock({ block }: { block: any }) {
  const author = block.properties?.author || '';
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const engine = useEditorEngine();

  const handleAuthorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    engine.updateBlock(block.id, {
      properties: { ...block.properties, author: e.target.value }
    });
  };

  return (
    <div className="block-quote-enclosure">
      <div className="block-quote-bar" />
      <div className="block-quote-body">
        <ActiveQuoteBlock block={block} />

        {/* Optional Quote Attribution / Author */}
        <div className="block-quote-footer" contentEditable={false}>
          {isEditingAuthor || author ? (
            <div className="quote-author-row">
              <span className="quote-author-dash">—</span>
              <input
                type="text"
                className="quote-author-input"
                placeholder="Author or source..."
                value={author}
                onChange={handleAuthorChange}
                onBlur={() => { if (!author) setIsEditingAuthor(false); }}
                autoFocus={isEditingAuthor}
              />
            </div>
          ) : (
            <button
              type="button"
              className="quote-add-author-btn"
              onClick={() => setIsEditingAuthor(true)}
              title="Add citation or author"
            >
              + Add attribution
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
