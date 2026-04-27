import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useBlockStore } from '../../../stores/blockStore';
import { Check } from 'lucide-react';

export default function TodoBlock({ block }) {
  const checked = block.properties?.checked || false;
  const updateBlock = useBlockStore(s => s.updateBlock);

  const editor = useBlockEditor(block, {
    placeholder: 'To-do',
    newBlockType: 'todo',
    backspaceAction: 'convert',
  });

  const toggleChecked = () => {
    updateBlock(block.id, {
      properties: { ...block.properties, checked: !checked },
    });
  };

  if (!editor) return null;

  return (
    <div className="block-todo">
      <button
        className={`block-todo-checkbox ${checked ? 'checked animate-ping' : ''}`}
        onClick={toggleChecked}
        contentEditable={false}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </button>
      <EditorContent
        editor={editor}
        className={`block-text block-todo-content ${checked ? 'checked' : ''}`}
      />
    </div>
  );
}
