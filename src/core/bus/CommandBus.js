/**
 * ─── Core: Command Bus ──────────────────────────────────────────
 * The single entry point for all mutations in Maniac.
 * 
 * Flow:
 *   1. Validate Command
 *   2. Generate Forward & Inverse Ops
 *   3. Apply Optimistically to GraphStore
 *   4. Enqueue to OpQueue (Causal tracking)
 *   5. Persist to Dexie (Asynchronous)
 *   6. Replicate (Handled by OpQueue + NetworkAdapter)
 */

import { useGraphStore } from '../store/graphStore';
import { getInverseOp, validateOp } from '../ops/definitions';
import { DexieAdapter } from '../../infra/persistence/DexieAdapter';

class CommandBus {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.opQueue = null; // Injected during init
    this.isApplyingUndo = false;
  }

  setOpQueue(queue) {
    this.opQueue = queue;
  }

  /**
   * Dispatch a set of operations as a single atomic unit of work.
   * 
   * @param {object[]} ops - Array of operations to apply
   * @param {string} commandName - Human readable name for debugging
   */
  async dispatch(ops, commandName = 'unnamed-command') {
    if (this.isApplyingUndo) return;

    const graphStore = useGraphStore.getState();
    const inverseOps = [];

    // 1. Prepare Inverse Ops (Capture state before change)
    for (const op of ops) {
      validateOp(op);
      const prevState = graphStore.getById(op.entityType + 's', op.entityId);
      const inverse = getInverseOp(op, prevState || {});
      if (inverse) inverseOps.unshift(inverse); // Reverse order for undo
    }

    // 2. Apply Optimistically to Store
    for (const op of ops) {
      graphStore.apply(op);
    }

    // 3. Enqueue for Sync
    if (this.opQueue) {
      for (const op of ops) {
        this.opQueue.push(op);
      }
    }

    // 4. Persistence
    await this._persistOps(ops);

    // 5. Manage Undo Stack
    this.undoStack.push({ ops, inverseOps, name: commandName });
    this.redoStack = []; // Clear redo stack on new operation
    if (this.undoStack.length > 100) this.undoStack.shift();

    console.debug(`[CommandBus] Executed: ${commandName}`, { opsCount: ops.length });
  }

  /**
   * Undo the last command.
   */
  async undo() {
    if (this.undoStack.length === 0) return;
    
    this.isApplyingUndo = true;
    const { inverseOps, ops, name } = this.undoStack.pop();
    const graphStore = useGraphStore.getState();

    try {
      // Apply inverse operations
      for (const op of inverseOps) {
        graphStore.apply(op);
        if (this.opQueue) this.opQueue.push(op);
      }

      await this._persistOps(inverseOps);
      this.redoStack.push({ ops, inverseOps, name });
      console.debug(`[CommandBus] Undo: ${name}`);
    } finally {
      this.isApplyingUndo = false;
    }
  }

  /**
   * Redo the last undone command.
   */
  async redo() {
    if (this.redoStack.length === 0) return;

    this.isApplyingUndo = true;
    const { ops, inverseOps, name } = this.redoStack.pop();
    const graphStore = useGraphStore.getState();

    try {
      // Re-apply original operations
      for (const op of ops) {
        graphStore.apply(op);
        if (this.opQueue) this.opQueue.push(op);
      }

      await this._persistOps(ops);
      this.undoStack.push({ ops, inverseOps, name });
      console.debug(`[CommandBus] Redo: ${name}`);
    } finally {
      this.isApplyingUndo = false;
    }
  }

  async _persistOps(ops) {
    try {
      await DexieAdapter.saveOpsBatch(ops);
      // Also update entity tables in Dexie
      for (const op of ops) {
        const table = op.entityType + 's';
        const entity = useGraphStore.getState().getById(table, op.entityId);
        if (entity) {
          await DexieAdapter[`save${op.entityType.charAt(0).toUpperCase() + op.entityType.slice(1)}`](entity);
        } else if (op.opType === 'DELETE') {
          await DexieAdapter[`delete${op.entityType.charAt(0).toUpperCase() + op.entityType.slice(1)}`](op.entityId);
        }
      }
    } catch (err) {
      console.error('[CommandBus] Persistence failed:', err);
    }
  }
}

export const commandBus = new CommandBus();
