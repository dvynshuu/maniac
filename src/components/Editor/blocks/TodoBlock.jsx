import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { useBlockStore } from '../../../stores/blockStore';
import { isEmptyContent } from '../../../utils/helpers';
import { Check } from 'lucide-react';

function ActiveTodoBlock({ block, checked }) {
  const editor = useBlockEditor(block, {
    placeholder: 'To-do',
    newBlockType: 'todo',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  return (
    <EditorContent
      editor={editor}
      className={`block-text block-todo-content ${checked ? 'checked' : ''}`}
    />
  );
}

function StaticTodoBlock({ block, checked, onClick }) {
  const className = `tiptap-editor block-text block-todo-content ${checked ? 'checked' : ''}`;

  if (isEmptyContent(block.content)) {
    return (
      <div 
        className={`${className} is-editor-empty`} 
        onClick={onClick}
        style={{ color: 'var(--text-placeholder)', cursor: 'text' }}
      >
        To-do
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

export default function TodoBlock({ block }) {
  const checked = block.properties?.checked || false;
  const engine = useEditorEngine();

  const focusBlockId = useBlockStore(s => s.focusBlockId);
  const isFocused = focusBlockId === block.id;

  const toggleChecked = () => {
    engine.startTransaction()
      .updateBlock(block.id, {
        properties: { ...block.properties, checked: !checked },
      })
      .commit();
  };

  const handleFocus = () => {
    useBlockStore.getState().setFocusBlock(block.id);
  };

  return (
    <div className="block-todo">
      <button
        className={`block-todo-checkbox ${checked ? 'checked' : ''}`}
        onClick={toggleChecked}
        contentEditable={false}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </button>
      {isFocused ? (
        <ActiveTodoBlock block={block} checked={checked} />
      ) : (
        <StaticTodoBlock block={block} checked={checked} onClick={handleFocus} />
      )}
    </div>
  );
}
