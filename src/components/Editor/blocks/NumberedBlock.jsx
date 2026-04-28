import { EditorContent } from '@tiptap/react';
import { useBlockEditor } from '../../../hooks/useBlockEditor';
import { useBlockStore } from '../../../stores/blockStore';
import { useShallow } from 'zustand/react/shallow';

export default function NumberedBlock({ block, index }) {
  const depth = block.properties?.depth || 0;

  // Calculate the correct list number by counting consecutive
  // numbered blocks at the same parent level before this one
  const listIndex = useBlockStore(useShallow(s => {
    // Use pre-calculated listIndex if available (from fidelity layer)
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

  const editor = useBlockEditor(block, {
    placeholder: 'List item',
    newBlockType: 'numbered',
    backspaceAction: 'convert',
  });

  if (!editor) return null;

  // Notion cycles: 1/2/3 → a/b/c → i/ii/iii
  const formatNumber = (num, d) => {
    const style = d % 3;
    if (style === 0) return `${num}.`;
    if (style === 1) return `${String.fromCharCode(96 + ((num - 1) % 26) + 1)}.`;
    // Roman numerals for depth 2+
    const roman = ['i','ii','iii','iv','v','vi','vii','viii','ix','x'];
    return `${roman[(num - 1) % 10] || num}.`;
  };

  return (
    <div className="block-numbered">
      <div className="block-numbered-marker">{formatNumber(listIndex, depth)}</div>
      <EditorContent editor={editor} className="block-text" />
    </div>
  );
}
