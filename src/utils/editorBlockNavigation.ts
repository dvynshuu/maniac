import { useBlockStore } from '../stores/blockStore';

export const EDITABLE_TYPES = [
  'text', 'heading1', 'heading2', 'heading3',
  'toggle_heading1', 'toggle_heading2', 'toggle_heading3',
  'todo', 'quote', 'callout', 'bullet', 'numbered', 'toggle', 'code'
];

export function isBlockVisibleInTree(blockId: string, blockMap: Record<string, any>): boolean {
  let curr = blockMap[blockId];
  while (curr && curr.parentId) {
    const parent = blockMap[curr.parentId];
    if (!parent) break;
    const isCollapsible =
      parent.type === 'toggle' ||
      parent.type === 'toggle_heading1' ||
      parent.type === 'toggle_heading2' ||
      parent.type === 'toggle_heading3';
    if (isCollapsible && parent.properties?.expanded === false) {
      return false;
    }
    curr = parent;
  }
  return true;
}

export function getNextEditableBlockId(
  currentId: string,
  direction: 'up' | 'down',
  blockOrder?: string[],
  blockMap?: Record<string, any>
): string | null {
  const order = blockOrder || useBlockStore.getState().blockOrder;
  const map = blockMap || useBlockStore.getState().blockMap;

  const index = order.indexOf(currentId);
  if (index === -1) return null;

  const step = direction === 'up' ? -1 : 1;
  let i = index + step;
  while (i >= 0 && i < order.length) {
    const nextId = order[i];
    const block = map[nextId];
    if (block && EDITABLE_TYPES.includes(block.type) && isBlockVisibleInTree(nextId, map)) {
      return nextId;
    }
    i += step;
  }
  return null;
}
