/**
 * ─── Core: Editor Engine ────────────────────────────────────────
 * High-level API for UI components to trigger state changes.
 * Acts as a factory for operations that are dispatched via the CommandBus.
 */

import { dispatch } from '../commandBus';
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
    return dispatch({
      type: 'block/create',
      payload: { type, parentId, sortOrder: orderKey, pageId: this.pageId }
    });
  }

  /**
   * Update block content or properties.
   */
  async updateBlock(blockId, updates) {
    return dispatch({
      type: 'block/update',
      payload: { blockId, updates }
    });
  }

  /**
   * Move a block within the same parent or to a new parent.
   */
  async moveBlock(blockId, targetParentId, targetOrderKey) {
    // Legacy bus uses block/reorder and manual parent updates
    // For now, let's just update properties via block/update
    return dispatch({
      type: 'block/update',
      payload: { blockId, updates: { parentId: targetParentId, sortOrder: targetOrderKey } }
    });
  }

  /**
   * Delete a block.
   */
  async deleteBlock(blockId) {
    return dispatch({
      type: 'block/delete',
      payload: { blockId }
    });
  }

  // ─── Page Operations ────────────────────────────────────────────

  async updatePage(updates) {
    return dispatch({
      type: 'page/update',
      payload: { pageId: this.pageId, updates }
    });
  }

  // ─── History ──────────────────────────────────────────────────

  undo() {
    // Legacy bus exports undo/redo directly
    const { undo: legacyUndo } = require('../commandBus');
    return legacyUndo();
  }

  redo() {
    const { redo: legacyRedo } = require('../commandBus');
    return legacyRedo();
  }
}
