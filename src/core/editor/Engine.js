/**
 * ─── Core: Editor Engine ────────────────────────────────────────
 * High-level API for UI components to trigger state changes.
 * Acts as a factory for operations that are dispatched via the CommandBus.
 */

import { commandBus } from '../bus/CommandBus';
import { createOp, OP_TYPES } from '../ops/definitions';
import { useGraphStore } from '../store/graphStore';
import { createId } from '../ids/identity';

export class EditorEngine {
  constructor(pageId, actorId = 'local-user') {
    this.pageId = pageId;
    this.actorId = actorId;
  }

  // ─── Block Operations ───────────────────────────────────────────

  /**
   * Create a new block.
   */
  async createBlock(type = 'text', parentId = null, orderKey = 'a0') {
    const blockId = createId();
    const op = createOp(OP_TYPES.CREATE, 'block', blockId, {
      type,
      pageId: this.pageId,
      parentId,
      orderKey,
      content: '',
      properties: {},
      version: 1,
      actorId: this.actorId,
    }, this.actorId);

    await commandBus.dispatch([op], `create-block:${type}`);
    return blockId;
  }

  /**
   * Update block content or properties.
   */
  async updateBlock(blockId, updates) {
    const op = createOp(OP_TYPES.UPDATE, 'block', blockId, updates, this.actorId);
    await commandBus.dispatch([op], 'update-block');
  }

  /**
   * Move a block within the same parent or to a new parent.
   */
  async moveBlock(blockId, targetParentId, targetOrderKey) {
    const ops = [];
    const block = useGraphStore.getState().getById('blocks', blockId);
    
    if (block.parentId !== targetParentId) {
      ops.push(createOp(OP_TYPES.REPARENT, 'block', blockId, { 
        parentId: targetParentId,
        orderKey: targetOrderKey 
      }, this.actorId));
    } else {
      ops.push(createOp(OP_TYPES.MOVE, 'block', blockId, { 
        orderKey: targetOrderKey 
      }, this.actorId));
    }

    await commandBus.dispatch(ops, 'move-block');
  }

  /**
   * Delete a block.
   */
  async deleteBlock(blockId) {
    const op = createOp(OP_TYPES.DELETE, 'block', blockId, {}, this.actorId);
    await commandBus.dispatch([op], 'delete-block');
  }

  // ─── Page Operations ────────────────────────────────────────────

  async updatePage(updates) {
    const op = createOp(OP_TYPES.UPDATE, 'page', this.pageId, updates, this.actorId);
    await commandBus.dispatch([op], 'update-page');
  }

  // ─── History ──────────────────────────────────────────────────

  undo() {
    return commandBus.undo();
  }

  redo() {
    return commandBus.redo();
  }
}
