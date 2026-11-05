import React from 'react';
import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { Check, Flag } from 'lucide-react';

function ActiveTodoBlock({ block, checked }: { block: any; checked: boolean }) {
  const editor = useBlockEditor(block, {
    placeholder: 'To-do task...',
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

export default function TodoBlock({ block }: { block: any }) {
  const checked = block.properties?.checked || false;
  const priority = block.properties?.priority || 0; // 0: None, 1: Normal, 2: High, 3: Critical
  const engine = useEditorEngine();

  const toggleChecked = () => {
    engine.startTransaction()
      .updateBlock(block.id, {
        properties: { ...block.properties, checked: !checked },
      })
      .commit();
  };

  const cyclePriority = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPriority = (priority + 1) % 4;
    engine.updateBlock(block.id, {
      properties: { ...block.properties, priority: nextPriority }
    });
  };

  return (
    <div className={`block-todo ${checked ? 'is-completed' : ''}`}>
      {/* Mechanical Tactile Checkbox */}
      <button
        type="button"
        className={`block-todo-checkbox ${checked ? 'checked' : ''}`}
        onClick={toggleChecked}
        contentEditable={false}
        title={checked ? 'Mark as incomplete' : 'Mark as completed'}
        aria-checked={checked}
        role="checkbox"
      >
        {checked && <Check size={12} strokeWidth={3} className="todo-check-icon" />}
      </button>

      {/* Optional Priority Tag */}
      {priority > 0 && (
        <button
          type="button"
          className={`todo-priority-tag p-${priority}`}
          onClick={cyclePriority}
          contentEditable={false}
          title={`Priority ${priority} (Click to change)`}
        >
          <span>P{priority}</span>
        </button>
      )}

      {/* Editable Todo Text */}
      <ActiveTodoBlock block={block} checked={checked} />

      {/* Subtle Priority Trigger on Hover */}
      {!checked && priority === 0 && (
        <button
          type="button"
          className="todo-set-priority-btn"
          onClick={cyclePriority}
          contentEditable={false}
          title="Set priority tag"
        >
          <Flag size={11} />
        </button>
      )}
    </div>
  );
}
