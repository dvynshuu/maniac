import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useBlockStore } from '../../../stores/blockStore';
import { isEmptyContent } from '../../../utils/helpers';
import { useShallow } from 'zustand/react/shallow';

function ActiveNumberedBlock({ block }) {
  const editor = useBlockEditor(block, {
    placeholder: 'List item',
    newBlockType: 'numbered',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  return <EditorContent editor={editor} className="block-text" />;
}

function StaticNumberedBlock({ block, onClick }) {
  if (isEmptyContent(block.content)) {
    return (
      <div 
        className="tiptap-editor block-text is-editor-empty" 
        onClick={onClick}
        style={{ color: 'var(--text-placeholder)', cursor: 'text' }}
      >
        List item
      </div>
    );
  }
  return (
    <div 
      className="tiptap-editor block-text" 
      onClick={onClick}
      style={{ cursor: 'text' }}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  );
}

export default function NumberedBlock({ block, index }) {
  const depth = block.properties?.depth || 0;

  const listIndex = useBlockStore(useShallow(s => {
    if (block.properties?.listIndex) return block.properties.listIndex;

    const { blockOrder, blockMap } = s;
    const myIdx = blockOrder.indexOf(block.id);
    if (myIdx === -1) return index + 1;

    let count = 1;
    for (let i = myIdx - 1; i >= 0; i--) {
      const sibling = blockMap[blockOrder[i]];
      if (!sibling) break;
      if (sibling.type !== 'numbered') break;
      if ((sibling.parentId || null) !== (block.parentId || null)) break;
      count++;
    }
    return count;
  }));

  const focusBlockId = useBlockStore(s => s.focusBlockId);
  const isFocused = focusBlockId === block.id;

  const handleFocus = () => {
    useBlockStore.getState().setFocusBlock(block.id);
  };

  // Notion cycles: 1/2/3 → a/b/c → i/ii/iii
  const formatNumber = (num, d) => {
    const style = d % 3;
    if (style === 0) return `${num}.`;
    if (style === 1) return `${String.fromCharCode(96 + ((num - 1) % 26) + 1)}.`;
    const roman = ['i','ii','iii','iv','v','vi','vii','viii','ix','x'];
    return `${roman[(num - 1) % 10] || num}.`;
  };

  return (
    <div className="block-numbered">
      <div className="block-numbered-marker">{formatNumber(listIndex, depth)}</div>
      {isFocused ? (
        <ActiveNumberedBlock block={block} />
      ) : (
        <StaticNumberedBlock block={block} onClick={handleFocus} />
      )}
    </div>
  );
}
