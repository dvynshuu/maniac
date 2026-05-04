/**
 * ─── Command Bus ────────────────────────────────────────────────
 * The single entry point for ALL mutations in Maniac.
 *
 * Every write operation flows through dispatch():
 *   1. Permission check (ACL)
 *   2. Schema validation
 *   3. Operation log (append-only journal)
 *   4. Optimistic Zustand update
 *   5. Dexie persistence (debounced for updates)
 *   6. Cross-tab broadcast
 *   7. Undo stack management
 *   8. Observability trace
 *
 * Stores become read-only projections. They no longer write to Dexie directly.
 */

import { createOp, appendOp, OpType, EntityType } from '../db/opLog';
import { broadcastOp } from '../db/crossTabChannel';
import { getActorId } from '../db/actorId';
import { can, Permission } from './permissions';
import { validate, ensureDefaults } from './schemaRegistry';
import { trace, event } from './observability';
import { db } from '../db/database';
import { nanoid } from 'nanoid';
import { encryptForDB } from './persistence';

// ─── Undo / Redo Stacks ────────────────────────────────────────

const MAX_UNDO = 100;
let _undoStack = []; // Array of { ops: Operation[], inverseOps: Operation[] }
let _redoStack = [];
let _activeTransaction = null;

// ─── Middleware Pipeline ────────────────────────────────────────

const _middleware = [];

/**
 * Register a middleware function.
 * Middleware shape: (command, next) => next(command)
 */
export function use(middlewareFn) {
  _middleware.push(middlewareFn);
}

// ─── Structural Normalization Middleware ───────────────────────
import { Normalizer } from './editor/Normalizer';
import { useBlockStore } from '../stores/blockStore';

use(async (command, next) => {
  const { type, payload } = command;
  
  if (type === 'block/create' || type === 'block/move') {
    const targetParentId = payload.targetParentId || payload.parentId;
    if (targetParentId) {
      const store = useBlockStore.getState();
      const parent = store.blockMap[targetParentId];
      
      // 1. Constraint Check: Can this parent have children?
      if (parent && !Normalizer.canHaveChildren(parent.type)) {
        console.warn(`[Normalizer] Parent ${parent.type} cannot have children. Redirecting to root.`);
        if (payload.targetParentId !== undefined) payload.targetParentId = null;
        if (payload.parentId !== undefined) payload.parentId = null;
      }

      // 2. Cycle Prevention (for moves)
      if (type === 'block/move' && !Normalizer.isSafeMove(payload.blockId, targetParentId)) {
        console.error(`[Normalizer] Cyclic move detected. Blocking command.`);
        return null; // Block the command
      }
    }
  }

  return next(command);
});

// ─── Command Handlers ───────────────────────────────────────────
// Each command type maps to a handler that returns { ops, inverseOps, zustandUpdate }.

const _handlers = new Map();

/**
 * Register a command handler.
 *
 * @param {string} type - Command type (e.g. 'block/create')
 * @param {Function} handler - async (payload, meta) => { ops, inverseOps, apply, persist }
 */
export function registerHandler(type, handler) {
  _handlers.set(type, handler);
}

// ─── Core Dispatch ──────────────────────────────────────────────

/**
 * Dispatch a command through the bus.
 *
 * @param {object} command - { type, payload, meta }
 * @returns {Promise<any>} Result from the handler
 */
export async function dispatch(command) {
  return trace(`command:${command.type}`, async () => {
    const { type, payload, meta = {} } = command;

    // Run middleware pipeline
    let finalCommand = command;
    for (const mw of _middleware) {
      finalCommand = await mw(finalCommand, (c) => c);
      if (!finalCommand) {
        event('command:blocked', { type, reason: 'middleware' });
        return null;
      }
    }

    // Find handler
    const handler = _handlers.get(type);
    if (!handler) {
      console.error(`[CommandBus] No handler registered for: ${type}`);
      return null;
    }

    // Permission check
    const actorId = getActorId();
    if (payload.entityType && payload.entityId) {
      const requiredPerm = type.includes('/delete') ? Permission.ADMIN : Permission.WRITE;
      if (!can(actorId, payload.entityType, payload.entityId, requiredPerm)) {
        event('command:denied', { type, actorId });
        throw new Error(`[ACL] Permission denied for ${type}`);
      }
    }

    // Execute the handler
    const transactionId = _activeTransaction?.id || nanoid(8);
    const result = await handler(payload, { ...meta, actorId, transactionId });

    if (!result) return null;

    const { ops = [], inverseOps = [], returnValue } = result;

    // Write to operation log
    for (const op of ops) {
      op.meta = { ...op.meta, transactionId };
      await appendOp(op);
    }

    // Undo stack
    if (ops.length > 0) {
      const undoEntry = { ops, inverseOps, transactionId, type };
      if (_activeTransaction) {
        _activeTransaction.entries.push(undoEntry);
      } else {
        _undoStack.push(undoEntry);
        if (_undoStack.length > MAX_UNDO) {
          _undoStack = _undoStack.slice(-MAX_UNDO);
        }
        _redoStack = []; // Clear redo on new action
      }
    }

    // Cross-tab broadcast
    for (const op of ops) {
      broadcastOp(op);
    }

    event('command:dispatched', { type, opsCount: ops.length });

    return returnValue;
  });
}

// ─── Transactions ───────────────────────────────────────────────

/**
 * Group multiple dispatches into a single undoable transaction.
 *
 * @param {Function} fn - async () => { ... dispatch calls ... }
 * @returns {Promise<any>} Result of fn
 */
export async function transaction(fn) {
  if (_activeTransaction) {
    // Nested transactions just merge into the parent
    return fn();
  }

  _activeTransaction = {
    id: nanoid(8),
    entries: [],
  };

  try {
    const result = await fn();

    // Merge all entries into a single undo unit
    if (_activeTransaction.entries.length > 0) {
      const mergedOps = _activeTransaction.entries.flatMap(e => e.ops);
      // Inverse operations should be applied in reverse order
      const mergedInverse = _activeTransaction.entries.flatMap(e => e.inverseOps).reverse();
      _undoStack.push({
        ops: mergedOps,
        inverseOps: mergedInverse,
        transactionId: _activeTransaction.id,
        type: 'transaction',
      });
      if (_undoStack.length > MAX_UNDO) {
        _undoStack = _undoStack.slice(-MAX_UNDO);
      }
      _redoStack = [];
    }

    return result;
  } finally {
    _activeTransaction = null;
  }
}

// ─── Undo / Redo ────────────────────────────────────────────────

/**
 * Undo the last command (or transaction).
 * Dispatches the inverse operations.
 */
export async function undo() {
  if (_undoStack.length === 0) return null;
  const entry = _undoStack.pop();

  // Execute inverse operations directly
  for (const inverseOp of entry.inverseOps) {
    await executeOp(inverseOp);
  }

  _redoStack.push(entry);
  event('command:undo', { type: entry.type, transactionId: entry.transactionId });
  return entry;
}

/**
 * Redo the last undone command.
 */
export async function redo() {
  if (_redoStack.length === 0) return null;
  const entry = _redoStack.pop();

  // Re-execute the original operations
  for (const op of entry.ops) {
    await executeOp(op);
  }

  _undoStack.push(entry);
  event('command:redo', { type: entry.type, transactionId: entry.transactionId });
  return entry;
}

export function canUndo() { return _undoStack.length > 0; }
export function canRedo() { return _redoStack.length > 0; }

// ─── Operation Execution ────────────────────────────────────────
// Single entry point for applying operations to state and DB.
// Used by Undo, Redo, and Cross-tab replay.

export async function executeOp(operation) {
  const { entityType, entityId, op: opType, payload, prevPayload } = operation;

  if (entityType === EntityType.BLOCK) {
    const { useBlockStore } = await import('../stores/blockStore');
    const store = useBlockStore.getState();

    switch (opType) {
      case OpType.CREATE: {
        const block = payload;
        if (!block) break;
        const newMap = { ...store.blockMap, [entityId]: block };
        const newOrder = store.blockOrder.includes(entityId) 
          ? [...store.blockOrder] 
          : [...store.blockOrder, entityId];
        
        newOrder.sort((a, b) => {
          const blockA = newMap[a];
          const blockB = newMap[b];
          return String(blockA?.sortOrder || '').localeCompare(String(blockB?.sortOrder || ''));
        });

        useBlockStore.setState({
          blockMap: newMap,
          blockOrder: newOrder,
        });
        const dbBlock = await encryptForDB(block, true);
        await db.blocks.put(dbBlock);
        break;
      }

      case OpType.DELETE: {
        const newMap = { ...store.blockMap };
        delete newMap[entityId];
        useBlockStore.setState({
          blockMap: newMap,
          blockOrder: store.blockOrder.filter(id => id !== entityId),
        });
        await db.blocks.delete(entityId);
        break;
      }

      case OpType.UPDATE:
      case OpType.REORDER:
      case OpType.CHANGE_TYPE: {
        const current = store.blockMap[entityId];
        if (current && payload) {
          const updated = { ...current, ...payload };
          const newMap = { ...store.blockMap, [entityId]: updated };
          
          // DAG Synchronization: If this is a synced block, update all other instances
          const sourceId = current.properties?.sourceBlockId;
          if (sourceId && payload.content !== undefined) {
            Object.values(newMap).forEach(b => {
              if (b.properties?.sourceBlockId === sourceId && b.id !== entityId) {
                newMap[b.id] = { ...b, content: payload.content };
              }
            });
          }

          let newOrder = store.blockOrder;
          if (payload.sortOrder !== undefined && payload.sortOrder !== current.sortOrder) {
            newOrder = [...store.blockOrder].sort((a, b) => {
              const blockA = newMap[a];
              const blockB = newMap[b];
              return String(blockA?.sortOrder || '').localeCompare(String(blockB?.sortOrder || ''));
            });
          }

          useBlockStore.setState({
            blockMap: newMap,
            blockOrder: newOrder,
          });

          // Persist the primary change
          const dbUpd = await encryptForDB(payload, true);
          await db.blocks.update(entityId, dbUpd);
          
          // Persist synced changes if any
          if (sourceId && payload.content !== undefined) {
            const syncedIds = Object.values(store.blockMap)
              .filter(b => b.properties?.sourceBlockId === sourceId && b.id !== entityId)
              .map(b => b.id);
            if (syncedIds.length > 0) {
              await db.blocks.where('id').anyOf(syncedIds).modify({ content: payload.content });
            }
          }
        }
        break;
      }
    }
  } else if (entityType === EntityType.PAGE) {
    const { usePageStore } = await import('../stores/pageStore');

    switch (opType) {
      case OpType.CREATE: {
        if (!payload) break;
        usePageStore.setState(s => ({ pages: [...s.pages, payload] }));
        await db.pages.put(payload);
        break;
      }

      case OpType.DELETE: {
        usePageStore.setState(s => ({ pages: s.pages.filter(p => p.id !== entityId) }));
        await db.pages.delete(entityId);
        break;
      }

      case OpType.UPDATE: {
        if (!payload) break;
        usePageStore.setState(s => ({
          pages: s.pages.map(p => p.id === entityId ? { ...p, ...payload } : p),
        }));
        await db.pages.update(entityId, payload);
        break;
      }
    }
  } else if (entityType === 'CRDT') {
    if (opType === 'CRDT_UPDATE') {
      const { applyRemoteUpdate } = await import('./crdtManager');
      await applyRemoteUpdate(entityId, payload.update);
    }
  }

  // Cross-tab broadcast (only if it's a local execution like undo/redo)
  // ReplayRemoteOp will NOT call executeOp to avoid loops.
  if (operation.meta?.source !== 'remote') {
    broadcastOp(operation);
  }
}

// ─── Cross-Tab Replay ───────────────────────────────────────────

/**
 * Handle an operation received from another tab.
 * Applies it to the local store without re-broadcasting.
 */
export async function replayRemoteOp(operation) {
  // Mark as remote to avoid re-broadcast
  operation.meta = { ...operation.meta, source: 'remote' };
  await executeOp(operation);
  event('command:remote', { type: operation.op, entityId: operation.entityId });
}

// ─── Debug Helpers ──────────────────────────────────────────────

export function getUndoStack() { return [..._undoStack]; }
export function getRedoStack() { return [..._redoStack]; }
export function clearHistory() { _undoStack = []; _redoStack = []; }
