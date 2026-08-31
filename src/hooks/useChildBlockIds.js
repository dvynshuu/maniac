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
let _cachedParentMap = new Map(); // blockId -> parentId
let _cachedChildMap = new Map(); // parentId|null → [childId, ...]

/**
 * Rebuild the child map only when blockOrder or block parentId hierarchy actually changes.
 * Avoids rebuilding on content/property edits during typing.
 */
function getChildMap(blockMap, blockOrder) {
  if (!blockOrder || !blockMap) return _cachedChildMap;

  // Fast path: Check if structure (order and parentIds) is unchanged
  if (blockOrder === _cachedBlockOrder) {
    let structureChanged = false;
    for (const id of blockOrder) {
      const currentParent = blockMap[id]?.parentId || null;
      if (_cachedParentMap.get(id) !== currentParent) {
        structureChanged = true;
        break;
      }
    }
    if (!structureChanged) {
      return _cachedChildMap;
    }
  }

  // Rebuild only when structure actually changed (reparenting, reordering, creation, deletion)
  const newChildMap = new Map();
  const newParentMap = new Map();

  for (const id of blockOrder) {
    const block = blockMap[id];
    if (!block) continue;
    const parentKey = block.parentId || null;
    newParentMap.set(id, parentKey);
    if (!newChildMap.has(parentKey)) newChildMap.set(parentKey, []);
    newChildMap.get(parentKey).push(id);
  }

  _cachedBlockOrder = blockOrder;
  _cachedParentMap = newParentMap;
  _cachedChildMap = newChildMap;

  return newChildMap;
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
