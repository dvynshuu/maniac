import React from 'react';
import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { useBlockStore } from '../../../stores/blockStore';
import { ChevronRight } from 'lucide-react';
import BlockRenderer from '../BlockRenderer';
import { useShallow } from 'zustand/react/shallow';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

function ActiveToggleHeadingTitle({ block, level, expanded, engine }: { block: any; level: number; expanded: boolean; engine: any }) {
  const editor = useBlockEditor(block, {
    placeholder: `Toggle Heading ${level}`,
    newBlockType: 'text',
    backspaceAction: 'convert',
    onEnter: () => {
      if (editor) {
        engine.updateBlock(block.id, { content: editor.getHTML() });
      }
      if (expanded) {
        engine.insertAfter(null, 'text', { parentId: block.id });
      } else {
        engine.insertAfter(block.id, 'text');
      }
      return true;
    },
  });

  if (!editor) return null;

  return (
    <EditorContent
      editor={editor}
      className={`block-text block-heading${level} block-toggle-heading-title`}
    />
  );
}

export default function ToggleHeadingBlock({ block }: { block: any }) {
  const level = block.type === 'toggle_heading1' ? 1 : block.type === 'toggle_heading2' ? 2 : 3;
  const expanded = block.properties?.expanded ?? true;
  const engine = useEditorEngine();

  const childBlockIds = useBlockStore(
    useShallow((s) => s.blockOrder.filter((id) => s.blockMap[id]?.parentId === block.id))
  );

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    engine.updateBlock(block.id, {
      properties: { ...block.properties, expanded: !expanded },
    });
  };

  const chevronSize = level === 1 ? 20 : level === 2 ? 18 : 16;

  return (
    <div className={`block-toggle block-toggle-heading block-toggle-h${level}`}>
      <div className="block-toggle-header block-toggle-heading-header">
        <button
          className={`block-toggle-arrow ${expanded ? 'expanded' : ''}`}
          onClick={toggleExpanded}
          contentEditable={false}
          title={expanded ? 'Click to collapse' : 'Click to expand'}
          style={{ marginTop: level === 1 ? '10px' : level === 2 ? '6px' : '4px' }}
        >
          <ChevronRight size={chevronSize} />
        </button>
        <ActiveToggleHeadingTitle block={block} level={level} expanded={expanded} engine={engine} />
      </div>
      {expanded && (
        <div className="block-children toggle-children-blocks">
          {childBlockIds.length === 0 ? (
            <div
              className="block-text text-placeholder"
              style={{
                padding: '4px 8px',
                cursor: 'text',
                color: 'var(--text-placeholder)',
                fontSize: '14px',
              }}
              onClick={() => engine.insertAfter(null, 'text', { parentId: block.id })}
            >
              Empty toggle heading. Click to add content...
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
