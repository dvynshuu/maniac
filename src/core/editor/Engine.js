/**
 * ─── Core: Editor Engine ────────────────────────────────────────
 * Pure logic for managing a page's block lifecycle and state.
 * Orchestrates store updates, persistence, and undo/redo.
 */

import { useBlockStore } from '../../stores/blockStore';
import { usePageStore } from '../../stores/pageStore';
import { generateLexicalOrder } from '../../utils/helpers';
import { db } from '../../db/database';
import { createOp, OP_TYPES } from '../ops/definitions';

export class EditorEngine {
  constructor(pageId) {
    this.pageId = pageId;
    this.actorId = 'local-user'; // TODO: Get from security/identity store
  }

  /**
   * Handle block reordering via drag-and-drop.
   */
  async reorderBlock(activeId, overId) {
    const store = useBlockStore.getState();
    const { blockMap, blockOrder } = store;

    const overIndex = blockOrder.indexOf(overId);
    const prevBlockId = overIndex > 0 ? blockOrder[overIndex - 1] : null;
    
    const prevSort = prevBlockId ? blockMap[prevBlockId]?.sortOrder : null;
    const overSort = blockMap[overId]?.sortOrder;
    const newSortOrder = generateLexicalOrder(prevSort, overSort);
    const now = Date.now();

    // Create Operation
    const op = createOp(OP_TYPES.MOVE, 'block', activeId, { sortOrder: newSortOrder }, this.actorId);

    // Optimistic store update
    const updatedBlock = { ...blockMap[activeId], sortOrder: newSortOrder, updatedAt: now };
    const newBlockMap = { ...blockMap, [activeId]: updatedBlock };
    const allBlocks = blockOrder.map(id => id === activeId ? updatedBlock : newBlockMap[id]).filter(Boolean);
    allBlocks.sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));

    useBlockStore.setState({ 
      blockMap: newBlockMap, 
      blockOrder: allBlocks.map(b => b.id) 
    });

    // Persistence via Dexie
    await db.blocks.update(activeId, { sortOrder: newSortOrder, updatedAt: now });
    
    return op;
  }

  /**
   * Update page metadata.
   */
  async updatePage(updates) {
    const now = Date.now();
    usePageStore.getState().updatePage(this.pageId, { ...updates, updatedAt: now });
    // Persistence handled by pageStore's built-in logic for now
  }

  /**
   * Selection management placeholder.
   */
  setSelection(blockId, offset) {
    // TODO: Implement selection model
    console.debug(`[EditorEngine] Selection set to ${blockId} at ${offset}`);
  }
}
