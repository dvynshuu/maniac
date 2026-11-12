import React, { useMemo } from 'react';
import UniversalTextEditor from './UniversalTextEditor';
import { useBlockStore } from '../../../stores/blockStore';
import { useChildBlockIds } from '../../../hooks/useChildBlockIds';

export default function NumberedBlock({ block, index }: { block: any; index?: number }) {
  const depth = block.properties?.depth || 0;
  // Subscribe strictly to direct siblings list, avoiding full-page O(N) cascades on typing
  const siblingIds = useChildBlockIds(block.parentId);

  const listIndex = useMemo(() => {
    if (block.properties?.listIndex) return block.properties.listIndex;

    const myIdx = siblingIds.indexOf(block.id);
    if (myIdx === -1) return (index ?? 0) + 1;

    const { blockMap } = useBlockStore.getState();
    let count = 1;
    for (let i = myIdx - 1; i >= 0; i--) {
      const sibling = blockMap[siblingIds[i]];
      if (!sibling || sibling.type !== 'numbered') break;
      count++;
    }
    return count;
  }, [siblingIds, block.id, block.properties?.listIndex, index]);

  // Notion cycles: 1/2/3 → a/b/c → i/ii/iii
  const formatNumber = (num: number, d: number) => {
    const style = d % 3;
    if (style === 0) return `${num}.`;
    if (style === 1) return `${String.fromCharCode(96 + ((num - 1) % 26) + 1)}.`;
    const roman = ['i','ii','iii','iv','v','vi','vii','viii','ix','x'];
    return `${roman[(num - 1) % 10] || num}.`;
  };

  return (
    <div className="block-numbered">
      <div className="block-numbered-marker">{formatNumber(listIndex, depth)}</div>
      <UniversalTextEditor
        block={block}
        placeholder="List item"
        className="block-text"
        newBlockType="numbered"
        backspaceAction="convert"
      />
    </div>
  );
}
