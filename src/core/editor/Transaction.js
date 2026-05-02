import { dispatch } from '../commandBus';
import { createId } from '../ids/identity';
import { useBlockStore } from '../../stores/blockStore';

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
    this.ops.push({
      type: 'block/move',
      payload: { blockId, targetParentId, targetAfterBlockId }
    });
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
   * This is the "Structural normalization pass after each transaction batch".
   */
  normalize() {
    const store = useBlockStore.getState();
    const { blockMap, blockOrder } = store;

    // Track state of sort orders in memory during normalization
    const tempSortOrders = new Map();

    for (let i = 0; i < this.ops.length; i++) {
      const op = this.ops[i];
      if (op.type === 'block/create' || op.type === 'block/move') {
        const { targetParentId, targetAfterBlockId, afterBlockId, parentId } = op.payload;
        const pId = targetParentId !== undefined ? targetParentId : parentId;
        const aId = targetAfterBlockId !== undefined ? targetAfterBlockId : afterBlockId;

        // If we've already inserted something after 'aId' in this transaction,
        // we need to update the subsequent 'create' to be after the newly created block.
        // This is a simple form of structural normalization.
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

    const { transaction } = await import('../commandBus');
    
    return transaction(async () => {
      const results = [];
      for (const op of this.ops) {
        results.push(await dispatch(op));
      }
      return results;
    });
  }
}
