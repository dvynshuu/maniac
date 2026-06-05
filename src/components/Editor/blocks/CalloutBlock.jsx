import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useBlockStore } from '../../../stores/blockStore';
import { isEmptyContent } from '../../../utils/helpers';
import EmojiIcon from '../../Common/EmojiIcon';

function ActiveCalloutBlock({ block }) {
  const editor = useBlockEditor(block, {
    placeholder: 'Callout text',
    newBlockType: 'text',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  return <EditorContent editor={editor} className="block-callout-content" />;
}

function StaticCalloutBlock({ block, onClick }) {
  if (isEmptyContent(block.content)) {
    return (
      <div 
        className="tiptap-editor block-callout-content is-editor-empty" 
        onClick={onClick}
        style={{ color: 'var(--text-placeholder)', cursor: 'text' }}
      >
        Callout text
      </div>
    );
  }
  return (
    <div 
      className="tiptap-editor block-callout-content" 
      onClick={onClick}
      style={{ cursor: 'text' }}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  );
}

export default function CalloutBlock({ block }) {
  const emoji = block.properties?.emoji || '💡';
  const color = block.properties?.color || 'default';

  const focusBlockId = useBlockStore(s => s.focusBlockId);
  const isFocused = focusBlockId === block.id;

  const handleFocus = () => {
    useBlockStore.getState().setFocusBlock(block.id);
  };

  return (
    <div className="block-callout" data-color={color}>
      <span className="block-callout-emoji"><EmojiIcon emoji={emoji} size="20px" /></span>
      {isFocused ? (
        <ActiveCalloutBlock block={block} />
      ) : (
        <StaticCalloutBlock block={block} onClick={handleFocus} />
      )}
    </div>
  );
}
