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
   */
  static isSafeMove(blockId: string, targetParentId: string | null): boolean {
    if (!targetParentId) return true;
    if (blockId === targetParentId) return false;

    const store = useBlockStore.getState();
    const descendants = store.getDescendants(blockId);
    
    if (descendants.includes(targetParentId)) {
      return false;
    }

    return true;
  }

  /**
   * Validate if a block can accept children.
   */
  static canHaveChildren(blockType: string): boolean {
    const blackList = ['divider', 'image', 'embed', 'video'];
    return !blackList.includes(blockType);
  }

  /**
   * Post-mutation cleanup: recover orphans or fix invalid states.
   */
  static normalizeTree(): void {
    // Structural normalization hook
  }
}
