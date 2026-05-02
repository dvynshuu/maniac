/**
 * ─── Core: Editor Engine ────────────────────────────────────────
 * High-level API for UI components to trigger state changes.
 * Acts as a factory for operations that are dispatched via the CommandBus.
 * Follows the "Editor engine design" principles.
 */

import { Transaction } from './Transaction';
import { useBlockStore } from '../../stores/blockStore';
import { generateLexicalOrder } from '../../utils/helpers';

export class EditorEngine {
  constructor(pageId, actorId = 'local-user') {
    this.pageId = pageId;
    this.actorId = actorId;
  }

  /**
   * Start a new transaction.
   */
  startTransaction() {
    return new Transaction(this);
  }

  /**
   * Convenience: Update a single block.
   */
  async updateBlock(blockId, updates) {
    return this.startTransaction().updateBlock(blockId, updates).commit();
  }

  /**
   * Convenience: Delete a single block.
   */
  async deleteBlock(blockId) {
    return this.startTransaction().deleteBlock(blockId).commit();
  }

  // ─── Typed Commands ─────────────────────────────────────────────

  /**
   * Insert a new block after an existing one.
   * properties may include { parentId } to override the derived parent.
   */
  async insertAfter(blockId, type = 'text', properties = {}) {
    const tx = this.startTransaction();
    const { parentId: overrideParentId, ...restProperties } = properties;
    const block = blockId ? useBlockStore.getState().blockMap[blockId] : null;
    const parentId = overrideParentId !== undefined ? overrideParentId : (block ? block.parentId : null);
    
    tx.createBlock(type, parentId, blockId, restProperties);
    return tx.commit();
  }

  /**
   * Move a block to a new location.
   */
  async move(blockId, targetParentId, targetAfterId) {
    const tx = this.startTransaction();
    tx.moveBlock(blockId, targetParentId, targetAfterId);
    return tx.commit();
  }

  /**
   * Nest a block under the block above it (Tab).
   */
  async nest(blockId) {
    const store = useBlockStore.getState();
    const { blockOrder, blockMap } = store;
    const index = blockOrder.indexOf(blockId);
    if (index <= 0) return;

    const prevBlockId = blockOrder[index - 1];
    const prevBlock = blockMap[prevBlockId];
    const currentBlock = blockMap[blockId];

    // Only nest if they share the same parent or if prevBlock is a valid parent
    if (currentBlock.parentId === prevBlock.parentId) {
      const tx = this.startTransaction();
      tx.moveBlock(blockId, prevBlockId, null); // Move to end of prevBlock's children
      return tx.commit();
    }
  }

  /**
   * Un-nest a block (Shift+Tab).
   */
  async unnest(blockId) {
    const store = useBlockStore.getState();
    const { blockMap } = store;
    const currentBlock = blockMap[blockId];
    if (!currentBlock.parentId) return;

    const parentBlock = blockMap[currentBlock.parentId];
    const grandParentId = parentBlock ? parentBlock.parentId : null;

    const tx = this.startTransaction();
    tx.moveBlock(blockId, grandParentId, currentBlock.parentId);
    return tx.commit();
  }

  /**
   * Split a block at the current cursor position.
   */
  async split(blockId, contentBefore, contentAfter) {
    const tx = this.startTransaction();
    const block = useBlockStore.getState().blockMap[blockId];
    
    // Update current block with content before the split
    tx.updateBlock(blockId, { content: contentBefore });
    
    // Create new block with content after the split
    tx.createBlock(block.type, block.parentId, blockId, { 
      content: contentAfter,
      properties: { ...block.properties } 
    });
    
    return tx.commit();
  }

  /**
   * Merge a block with the one above it (Backspace at start).
   */
  async merge(blockId, targetId) {
    const store = useBlockStore.getState();
    const block = store.blockMap[blockId];
    const target = store.blockMap[targetId];
    if (!block || !target) return;

    const tx = this.startTransaction();
    
    // Append content
    const combinedContent = target.content + block.content;
    tx.updateBlock(targetId, { content: combinedContent });
    
    // Delete merged block
    tx.deleteBlock(blockId);
    
    return tx.commit();
  }

  /**
   * Change the type of a block (e.g. text -> h1).
   */
  async convertType(blockId, newType) {
    const tx = this.startTransaction();
    tx.convertType(blockId, newType);
    return tx.commit();
  }

  // ─── History ──────────────────────────────────────────────────

  async undo() {
    const { undo } = await import('../commandBus');
    return undo();
  }

  async redo() {
    const { redo } = await import('../commandBus');
    return redo();
  }
}
