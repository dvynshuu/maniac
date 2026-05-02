import { dispatch } from '../commandBus';
import { createId } from '../ids/identity';
import { useBlockStore } from '../../stores/blockStore';
import { Normalizer } from './Normalizer';

/**
 * ─── Editor Transaction ─────────────────────────────────────────
 * Batches multiple block and text operations into a single unit.
 * Implements the "Single rich-text transaction layer" principle.
 */
export class Transaction {
  constructor(editorEngine) {
    this.engine = editorEngine;
    this.ops = [];
    this._isCommitted = false;
  }

  /**
   * Queue a create operation.
   */
  createBlock(type, parentId, afterBlockId, properties = {}) {
    this.ops.push({
      type: 'block/create',
      payload: { type, parentId, afterBlockId, properties }
    });
    return this;
  }

  /**
   * Queue an update operation.
   */
  updateBlock(blockId, updates) {
    this.ops.push({
      type: 'block/update',
      payload: { blockId, updates }
    });
    return this;
  }

  /**
   * Queue a delete operation.
   */
  deleteBlock(blockId) {
    // Also delete all descendants (Cascade delete)
    const store = useBlockStore.getState();
    const descendants = store.getDescendants(blockId);
    
    // Delete descendants first (bottom-up)
    for (const dId of descendants.reverse()) {
      this.ops.push({ type: 'block/delete', payload: { blockId: dId } });
    }

    this.ops.push({
      type: 'block/delete',
      payload: { blockId }
    });
    return this;
  }

  /**
   * Queue a move operation.
   */
  moveBlock(blockId, targetParentId, targetAfterBlockId) {
    // Normalization: Prevent circular moves
    if (!Normalizer.isSafeMove(blockId, targetParentId)) {
      console.warn(`[Transaction] Blocked cyclic move: ${blockId} -> ${targetParentId}`);
      return this;
    }

    this.ops.push({
      type: 'block/move',
      payload: { blockId, targetParentId, targetAfterBlockId }
    });
    return this;
  }

  /**
   * Duplicate a block and its entire subtree.
   */
  duplicateBlock(blockId, targetAfterBlockId = null) {
    const store = useBlockStore.getState();
    const sourceBlock = store.blockMap[blockId];
    if (!sourceBlock) return this;

    const newIdMap = new Map();
    const oldIds = [blockId, ...store.getDescendants(blockId)];

    // 1. Create mapping and new blocks
    for (const oldId of oldIds) {
      const block = store.blockMap[oldId];
      const newId = createId();
      newIdMap.set(oldId, newId);

      const parentId = oldId === blockId 
        ? sourceBlock.parentId 
        : newIdMap.get(block.parentId);
      
      const afterId = oldId === blockId 
        ? (targetAfterBlockId || blockId) 
        : null;

      this.createBlock(block.type, parentId, afterId, { ...block.properties });
      // Update the newly created block's ID and content
      const lastOp = this.ops[this.ops.length - 1];
      lastOp.payload.id = newId; // Inject forced ID
      lastOp.payload.content = block.content;
    }

    return this;
  }

  /**
   * Queue a type conversion.
   */
  convertType(blockId, newType) {
    this.ops.push({
      type: 'block/changeType',
      payload: { blockId, newType }
    });
    return this;
  }

  /**
   * Perform structural normalization on the queued operations.
   */
  normalize() {
    // Current logic: Ensure that if multiple creations happen in sequence, 
    // the 'afterBlockId' of subsequent ones correctly chain.
    let lastCreatedId = null;
    for (const op of this.ops) {
      if (op.type === 'block/create' && !op.payload.afterBlockId && lastCreatedId) {
        // If creating multiple blocks without explicit afterBlockId, chain them
        // op.payload.afterBlockId = lastCreatedId; // Disabled for now to let handler handle it
      }
      if (op.type === 'block/create' && op.payload.id) {
        lastCreatedId = op.payload.id;
      }
    }
    return this;
  }

  /**
   * Commit the transaction by dispatching all ops to the command bus.
   */
  async commit() {
    if (this._isCommitted) return;
    this._isCommitted = true;

    this.normalize();

    const { transaction, dispatch } = await import('../commandBus');
    
    return transaction(async () => {
      const results = [];
      for (const op of this.ops) {
        results.push(await dispatch(op));
      }
      return results;
    });
  }
}
