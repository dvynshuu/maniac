import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useBlockStore } from '../../../stores/blockStore';
import { ChevronRight } from 'lucide-react';
import BlockRenderer from '../BlockRenderer';
import { useShallow } from 'zustand/react/shallow';

export default function ToggleBlock({ block }) {
  const expanded = block.properties?.expanded ?? true;
  
  const updateBlock = useBlockStore(s => s.updateBlock);
  const addBlock = useBlockStore(s => s.addBlock);

  const childBlockIds = useBlockStore(useShallow(s => 
    s.blockOrder.filter(id => s.blockMap[id]?.parentId === block.id)
  ));

  const editor = useBlockEditor(block, {
    placeholder: 'Toggle heading',
    backspaceAction: 'convert',
    onEnter: () => {
      if (editor) {
        updateBlock(block.id, { content: editor.getHTML() });
      }
      if (expanded) {
        // Add a child inside the toggle
        addBlock(block.pageId, 'text', null, '', {}, block.id);
      } else {
        // Add sibling below toggle
        addBlock(block.pageId, 'text', block.id, '', {}, block.parentId);
      }
      return true; // handled
    },
  });

  const toggleExpanded = () => {
    updateBlock(block.id, {
      properties: { ...block.properties, expanded: !expanded }
    });
  };

  if (!editor) return null;

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
        <EditorContent editor={editor} className="block-text block-toggle-title" />
      </div>
      {expanded && (
        <div className="block-children toggle-children-blocks">
          {childBlockIds.length === 0 ? (
            <div 
              className="block-text text-placeholder" 
              style={{ padding: '4px 8px', cursor: 'text', color: 'var(--text-placeholder)', fontSize: '14px' }}
              onClick={() => addBlock(block.pageId, 'text', null, '', {}, block.id)}
            >
              Empty toggle. Click to add content...
            </div>
          ) : (
            childBlockIds.map((id, index) => (
              <BlockRenderer key={id} blockId={id} index={index} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
