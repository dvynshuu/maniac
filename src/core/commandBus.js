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

  // Execute inverse operations directly (bypass undo stack)
  for (const inverseOp of entry.inverseOps) {
    await applyInverse(inverseOp);
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
    await applyForward(op);
  }

  _undoStack.push(entry);
  event('command:redo', { type: entry.type, transactionId: entry.transactionId });
  return entry;
}

export function canUndo() { return _undoStack.length > 0; }
export function canRedo() { return _redoStack.length > 0; }

// ─── Inverse Application ───────────────────────────────────────
// These apply operations without going through the full dispatch pipeline.

async function applyInverse(op) {
  const { entityType, entityId, op: opType, prevPayload } = op;

  if (entityType === EntityType.BLOCK) {
    if (opType === OpType.CREATE) {
      // Inverse of create = delete
      const { useBlockStore } = await import('../stores/blockStore');
      const store = useBlockStore.getState();
      const newMap = { ...store.blockMap };
      delete newMap[entityId];
      useBlockStore.setState({
        blockMap: newMap,
        blockOrder: store.blockOrder.filter(id => id !== entityId),
      });
      await db.blocks.delete(entityId);
    } else if (opType === OpType.DELETE && prevPayload) {
      // Inverse of delete = re-create
      const { useBlockStore } = await import('../stores/blockStore');
      const store = useBlockStore.getState();
      useBlockStore.setState({
        blockMap: { ...store.blockMap, [entityId]: prevPayload },
        blockOrder: [...store.blockOrder, entityId].sort((a, b) => {
          const blockA = store.blockMap[a] || prevPayload;
          const blockB = store.blockMap[b] || prevPayload;
          return String(blockA?.sortOrder || '').localeCompare(String(blockB?.sortOrder || ''));
        }),
      });
      await db.blocks.add(prevPayload);
    } else if (opType === OpType.UPDATE && prevPayload) {
      // Inverse of update = restore previous state
      const { useBlockStore } = await import('../stores/blockStore');
      const store = useBlockStore.getState();
      const current = store.blockMap[entityId];
      if (current) {
        useBlockStore.setState({
          blockMap: { ...store.blockMap, [entityId]: { ...current, ...prevPayload } },
        });
        await db.blocks.update(entityId, prevPayload);
      }
    }
  } else if (entityType === EntityType.PAGE) {
    if (opType === OpType.CREATE) {
      const { usePageStore } = await import('../stores/pageStore');
      usePageStore.setState(s => ({
        pages: s.pages.filter(p => p.id !== entityId),
      }));
      await db.pages.delete(entityId);
    } else if (opType === OpType.DELETE && prevPayload) {
      const { usePageStore } = await import('../stores/pageStore');
      usePageStore.setState(s => ({
        pages: [...s.pages, prevPayload],
      }));
      await db.pages.add(prevPayload);
    } else if (opType === OpType.UPDATE && prevPayload) {
      const { usePageStore } = await import('../stores/pageStore');
      usePageStore.setState(s => ({
        pages: s.pages.map(p => p.id === entityId ? { ...p, ...prevPayload } : p),
      }));
      await db.pages.update(entityId, prevPayload);
    }
  }

  // Log the inverse
  await appendOp(op);
  broadcastOp(op);
}

async function applyForward(op) {
  const { entityType, entityId, op: opType, payload } = op;

  if (entityType === EntityType.BLOCK) {
    if (opType === OpType.CREATE && payload) {
      const { useBlockStore } = await import('../stores/blockStore');
      const store = useBlockStore.getState();
      useBlockStore.setState({
        blockMap: { ...store.blockMap, [entityId]: payload },
        blockOrder: [...store.blockOrder, entityId].sort((a, b) => {
          const blockA = store.blockMap[a] || payload;
          const blockB = store.blockMap[b] || payload;
          return String(blockA?.sortOrder || '').localeCompare(String(blockB?.sortOrder || ''));
        }),
      });
      await db.blocks.add(payload);
    } else if (opType === OpType.DELETE) {
      const { useBlockStore } = await import('../stores/blockStore');
      const store = useBlockStore.getState();
      const newMap = { ...store.blockMap };
      delete newMap[entityId];
      useBlockStore.setState({
        blockMap: newMap,
        blockOrder: store.blockOrder.filter(id => id !== entityId),
      });
      await db.blocks.delete(entityId);
    } else if (opType === OpType.UPDATE && payload) {
      const { useBlockStore } = await import('../stores/blockStore');
      const store = useBlockStore.getState();
      const current = store.blockMap[entityId];
      if (current) {
        useBlockStore.setState({
          blockMap: { ...store.blockMap, [entityId]: { ...current, ...payload } },
        });
        await db.blocks.update(entityId, payload);
      }
    }
  } else if (entityType === EntityType.PAGE) {
    if (opType === OpType.CREATE && payload) {
      const { usePageStore } = await import('../stores/pageStore');
      usePageStore.setState(s => ({ pages: [...s.pages, payload] }));
      await db.pages.add(payload);
    } else if (opType === OpType.DELETE) {
      const { usePageStore } = await import('../stores/pageStore');
      usePageStore.setState(s => ({ pages: s.pages.filter(p => p.id !== entityId) }));
      await db.pages.delete(entityId);
    } else if (opType === OpType.UPDATE && payload) {
      const { usePageStore } = await import('../stores/pageStore');
      usePageStore.setState(s => ({
        pages: s.pages.map(p => p.id === entityId ? { ...p, ...payload } : p),
      }));
      await db.pages.update(entityId, payload);
    }
  }

  await appendOp(op);
  broadcastOp(op);
}

// ─── Cross-Tab Replay ───────────────────────────────────────────

/**
 * Handle an operation received from another tab.
 * Applies it to the local store without re-broadcasting.
 */
export async function replayRemoteOp(operation) {
  const { entityType, entityId, op: opType, payload, prevPayload } = operation;

  event('command:remote', { entityType, entityId, opType });

  if (entityType === EntityType.BLOCK) {
    const { useBlockStore } = await import('../stores/blockStore');

    if (opType === OpType.CREATE && payload) {
      const store = useBlockStore.getState();
      if (!store.blockMap[entityId]) {
        useBlockStore.setState({
          blockMap: { ...store.blockMap, [entityId]: payload },
          blockOrder: [...store.blockOrder, entityId],
        });
      }
    } else if (opType === OpType.UPDATE && payload) {
      const store = useBlockStore.getState();
      if (store.blockMap[entityId]) {
        useBlockStore.setState({
          blockMap: { ...store.blockMap, [entityId]: { ...store.blockMap[entityId], ...payload } },
        });
      }
    } else if (opType === OpType.DELETE) {
      const store = useBlockStore.getState();
      const newMap = { ...store.blockMap };
      delete newMap[entityId];
      useBlockStore.setState({
        blockMap: newMap,
        blockOrder: store.blockOrder.filter(id => id !== entityId),
      });
    }
  } else if (entityType === EntityType.PAGE) {
    const { usePageStore } = await import('../stores/pageStore');

    if (opType === OpType.CREATE && payload) {
      usePageStore.setState(s => {
        if (s.pages.some(p => p.id === entityId)) return s;
        return { pages: [...s.pages, payload] };
      });
    } else if (opType === OpType.UPDATE && payload) {
      usePageStore.setState(s => ({
        pages: s.pages.map(p => p.id === entityId ? { ...p, ...payload } : p),
      }));
    } else if (opType === OpType.DELETE) {
      usePageStore.setState(s => ({
        pages: s.pages.filter(p => p.id !== entityId),
      }));
    }
  }
}

// ─── Debug Helpers ──────────────────────────────────────────────

export function getUndoStack() { return [..._undoStack]; }
export function getRedoStack() { return [..._redoStack]; }
export function clearHistory() { _undoStack = []; _redoStack = []; }
