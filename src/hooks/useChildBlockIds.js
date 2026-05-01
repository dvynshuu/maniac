/**
 * ─── Performance Layer: Child Map Selector Memoization ──────────
 * Provides an incrementally-updated childMap (parentId → blockId[])
 * derived from blockStore, avoiding O(n) filter on every render.
 *
 * React components subscribe to `useChildBlockIds(parentId)` which
 * only re-renders when that specific parent's children change.
 */

import { useMemo, useRef } from 'react';
import { useBlockStore } from '../stores/blockStore';
import { useShallow } from 'zustand/react/shallow';

// ─── Module-level child map cache ───────────────────────────────
let _cachedBlockOrder = null;
let _cachedBlockMap = null;
let _cachedChildMap = new Map(); // parentId|null → [childId, ...]

/**
 * Rebuild the child map only when blockOrder or blockMap reference changes.
 * O(n) rebuild, but only on actual changes — not on every selector call.
 */
function getChildMap(blockMap, blockOrder) {
  if (blockOrder === _cachedBlockOrder && blockMap === _cachedBlockMap) {
    return _cachedChildMap;
  }

  const newMap = new Map();

  for (const id of blockOrder) {
    const block = blockMap[id];
    if (!block) continue;
    const parentKey = block.parentId || null;
    if (!newMap.has(parentKey)) newMap.set(parentKey, []);
    newMap.get(parentKey).push(id);
  }

  _cachedBlockOrder = blockOrder;
  _cachedBlockMap = blockMap;
  _cachedChildMap = newMap;

  return newMap;
}

/**
 * Hook: Get child block IDs for a given parentId.
 * Only re-renders when the actual child list for THIS parent changes.
 *
 * Replaces: `useBlockStore(useShallow(s => s.blockOrder.filter(id => s.blockMap[id]?.parentId === parentId)))`
 *
 * @param {string|null} parentId - Parent block ID, or null for root blocks
 * @returns {string[]} Child block IDs in order
 */
export function useChildBlockIds(parentId = null) {
  const prevRef = useRef([]);

  const children = useBlockStore((s) => {
    const childMap = getChildMap(s.blockMap, s.blockOrder);
    const result = childMap.get(parentId) || [];

    // Structural equality check — avoid new array reference if content is same
    const prev = prevRef.current;
    if (prev.length === result.length && prev.every((id, i) => id === result[i])) {
      return prev;
    }

    prevRef.current = result;
    return result;
  });

  return children;
}

/**
 * Hook: Get all root block IDs (blocks without a parentId).
 * Optimized replacement for the filter pattern in PageEditor.
 */
export function useRootBlockIds() {
  return useChildBlockIds(null);
}

/**
 * Hook: Get the full child map. Useful for tree operations.
 * Only re-renders when any parent-child relationship changes.
 */
export function useChildMap() {
  return useBlockStore((s) => getChildMap(s.blockMap, s.blockOrder));
}
