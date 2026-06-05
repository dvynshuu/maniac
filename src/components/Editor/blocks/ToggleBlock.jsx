import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { useBlockStore } from '../../../stores/blockStore';
import { isEmptyContent } from '../../../utils/helpers';
import { ChevronRight } from 'lucide-react';
import BlockRenderer from '../BlockRenderer';
import { useShallow } from 'zustand/react/shallow';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

function ActiveToggleTitle({ block, expanded, engine }) {
  const editor = useBlockEditor(block, {
    placeholder: 'Toggle heading',
    backspaceAction: 'convert',
    onEnter: () => {
      if (editor) {
        engine.updateBlock(block.id, { content: editor.getHTML() });
      }
      if (expanded) {
        // Add a child inside the toggle
        engine.insertAfter(null, 'text', { parentId: block.id });
      } else {
        // Add sibling below toggle
        engine.insertAfter(block.id, 'text');
      }
      return true; // handled
    },
  });

  if (!editor) return null;

  return <EditorContent editor={editor} className="block-text block-toggle-title" />;
}

function StaticToggleTitle({ block, onClick }) {
  if (isEmptyContent(block.content)) {
    return (
      <div 
        className="tiptap-editor block-text block-toggle-title is-editor-empty" 
        onClick={onClick}
        style={{ color: 'var(--text-placeholder)', cursor: 'text' }}
      >
        Toggle heading
      </div>
    );
  }
  return (
    <div 
      className="tiptap-editor block-text block-toggle-title" 
      onClick={onClick}
      style={{ cursor: 'text' }}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  );
}

export default function ToggleBlock({ block }) {
  const expanded = block.properties?.expanded ?? true;
  
  const engine = useEditorEngine();

  const childBlockIds = useBlockStore(useShallow(s => 
    s.blockOrder.filter(id => s.blockMap[id]?.parentId === block.id)
  ));

  const focusBlockId = useBlockStore(s => s.focusBlockId);
  const isFocused = focusBlockId === block.id;

  const toggleExpanded = () => {
    engine.updateBlock(block.id, {
      properties: { ...block.properties, expanded: !expanded }
    });
  };

  const handleFocus = () => {
    useBlockStore.getState().setFocusBlock(block.id);
  };

  return (
    <div className="block-toggle">
      <div className="block-toggle-header">
        <button
          className={`block-toggle-arrow ${expanded ? 'expanded' : ''}`}
          onClick={toggleExpanded}
          contentEditable={false}
        >
          <ChevronRight size={16} />
        </button>
        {isFocused ? (
          <ActiveToggleTitle block={block} expanded={expanded} engine={engine} />
        ) : (
          <StaticToggleTitle block={block} onClick={handleFocus} />
        )}
      </div>
      {expanded && (
        <div className="block-children toggle-children-blocks">
          {childBlockIds.length === 0 ? (
            <div 
              className="block-text text-placeholder" 
              style={{ padding: '4px 8px', cursor: 'text', color: 'var(--text-placeholder)', fontSize: '14px' }}
              onClick={() => engine.insertAfter(null, 'text', { parentId: block.id })}
            >
              Empty toggle. Click to add content...
            </div>
          ) : (
            <SortableContext items={childBlockIds.filter(Boolean)} strategy={verticalListSortingStrategy}>
              {childBlockIds.filter(Boolean).map((id, index) => (
                <BlockRenderer key={id} blockId={id} index={index} />
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}
