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

export default function TodoBlock({ block }) {
  const checked = block.properties?.checked || false;
  const engine = useEditorEngine();

  const toggleChecked = () => {
    engine.startTransaction()
      .updateBlock(block.id, {
        properties: { ...block.properties, checked: !checked },
      })
      .commit();
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
      <ActiveTodoBlock block={block} checked={checked} />
    </div>
  );
}
