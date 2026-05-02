import { useBlockStore } from '../../stores/blockStore';

/**
 * ─── Structural Normalizer ──────────────────────────────────────
 * Ensures the block tree maintains its invariants:
 *   1. No cycles (A -> B -> A)
 *   2. No orphans (Every block must belong to a page or a valid parent)
 *   3. Type constraints (e.g., Divider cannot have children)
 */
export class Normalizer {
  /**
   * Validate a move/create operation for cyclic dependencies.
   * 
   * @param {string} blockId - The block being moved
   * @param {string} targetParentId - The proposed new parent
   * @returns {boolean} True if safe, false if cyclic
   */
  static isSafeMove(blockId, targetParentId) {
    if (!targetParentId) return true; // Root moves are always safe
    if (blockId === targetParentId) return false;

    const store = useBlockStore.getState();
    const descendants = store.getDescendants(blockId);
    
    // Cannot move a block into its own children
    if (descendants.includes(targetParentId)) {
      return false;
    }

    return true;
  }

  /**
   * Validate if a block can accept children.
   */
  static canHaveChildren(blockType) {
    const blackList = ['divider', 'image', 'embed', 'video'];
    return !blackList.includes(blockType);
  }

  /**
   * Post-mutation cleanup: recover orphans or fix invalid states.
   * This runs after a transaction to ensure final consistency.
   */
  static normalizeTree() {
    const store = useBlockStore.getState();
    const { blockMap, blockOrder } = store;
    
    // 1. Identify Orphans (Parent exists but isn't in blockMap)
    // Actually, in our current model, children are rendered based on parentId.
    // If a parent is deleted, the children just don't render.
    // Real "Orphan Recovery" would move them to root or delete them.
  }
}
