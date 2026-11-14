import React from 'react';
import UniversalTextEditor from './UniversalTextEditor';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { ChevronRight } from 'lucide-react';
import BlockRenderer from '../BlockRenderer';
import { useChildBlockIds } from '../../../hooks/useChildBlockIds';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

function ActiveToggleTitle({ block, level, expanded, engine }: { block: any; level?: number; expanded: boolean; engine: any }) {
  const placeholder = level ? `Toggle Heading ${level}` : 'Toggle heading';
  const headingClass = level ? ` block-heading${level} block-toggle-heading-title` : ' block-toggle-title';

  return (
    <UniversalTextEditor
      block={block}
      placeholder={placeholder}
      className={`block-text${headingClass}`}
      newBlockType="text"
      backspaceAction="convert"
      onEnter={(editor) => {
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
      }}
    />
  );
}

export default function ToggleBlock({ block }: { block: any }) {
  const isHeading = block.type === 'toggle_heading1' || block.type === 'toggle_heading2' || block.type === 'toggle_heading3';
  const level = isHeading ? (block.type === 'toggle_heading1' ? 1 : block.type === 'toggle_heading2' ? 2 : 3) : undefined;
  const expanded = block.properties?.expanded ?? true;
  
  const engine = useEditorEngine(block.pageId);
  const childBlockIds = useChildBlockIds(block.id);

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    engine.updateBlock(block.id, {
      properties: { ...block.properties, expanded: !expanded }
    });
  };

  const chevronSize = level === 1 ? 20 : level === 2 ? 18 : 16;
  const containerClasses = level
    ? `block-toggle block-toggle-heading block-toggle-h${level}`
    : 'block-toggle';
  const headerClasses = level
    ? 'block-toggle-header block-toggle-heading-header'
    : 'block-toggle-header';

  return (
    <div className={containerClasses}>
      <div className={headerClasses}>
        <button
          className={`block-toggle-arrow ${expanded ? 'expanded' : ''}`}
          onClick={toggleExpanded}
          contentEditable={false}
          title={expanded ? 'Click to collapse' : 'Click to expand'}
          style={level ? { marginTop: level === 1 ? '10px' : level === 2 ? '6px' : '4px' } : undefined}
        >
          <ChevronRight size={chevronSize} />
        </button>
        <ActiveToggleTitle block={block} level={level} expanded={expanded} engine={engine} />
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
