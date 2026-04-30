/**
 * ─── Operation Log ──────────────────────────────────────────────
 * Append-only journal of every mutation. Foundation for undo,
 * cross-tab sync, conflict resolution, and audit trail.
 *
 * Each operation is immutable once written. The log is the
 * canonical source of truth — stores are materialized views.
 */

import { db } from './database';
import { getActorId } from './actorId';

// ─── Operation Types ────────────────────────────────────────────

export const OpType = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  REORDER: 'REORDER',
  CHANGE_TYPE: 'CHANGE_TYPE',
});

export const EntityType = Object.freeze({
  BLOCK: 'block',
  PAGE: 'page',
  TRACKER: 'tracker',
  TRACKER_ENTRY: 'tracker_entry',
  DATABASE_ROW: 'database_row',
});

// ─── Operation Factory ──────────────────────────────────────────

let _lamportClock = 0;

/**
 * Creates an operation record. Does NOT persist it — use appendOp.
 */
export function createOp(entityType, entityId, op, payload, prevPayload = null, meta = {}) {
  _lamportClock++;
  return {
    id: crypto.randomUUID(),
    actorId: getActorId(),
    entityType,
    entityId,
    op,
    payload,
    prevPayload,
    timestamp: Date.now(),
    lamport: _lamportClock,
    meta, // { transactionId, source: 'local'|'remote', ... }
  };
}

// ─── Persistence ────────────────────────────────────────────────

/**
 * Appends an operation to the log. Returns the assigned sequence number.
 */
export async function appendOp(operation) {
  const seq = await db.operations.add(operation);
  return seq;
}

/**
 * Appends a batch of operations atomically.
 */
export async function appendOps(operations) {
  return db.operations.bulkAdd(operations);
}

// ─── Queries ────────────────────────────────────────────────────

/**
 * Get all operations after a given sequence number.
 * Used for sync replay and cross-tab catch-up.
 */
export async function getOpsAfter(seq = 0) {
  return db.operations.where('seq').above(seq).sortBy('seq');
}

/**
 * Get all operations for a specific entity.
 * Used for entity history / audit trail.
 */
export async function getOpsForEntity(entityType, entityId) {
  return db.operations
    .where('[entityType+entityId]')
    .equals([entityType, entityId])
    .sortBy('seq');
}

/**
 * Get the last N operations (most recent first).
 */
export async function getRecentOps(limit = 50) {
  return db.operations.orderBy('seq').reverse().limit(limit).toArray();
}

/**
 * Get operations within a transaction.
 */
export async function getOpsForTransaction(transactionId) {
  return db.operations
    .filter(op => op.meta?.transactionId === transactionId)
    .sortBy('seq');
}

/**
 * Update the Lamport clock when receiving a remote operation.
 * Ensures causal ordering across actors.
 */
export function receiveLamport(remoteLamport) {
  _lamportClock = Math.max(_lamportClock, remoteLamport) + 1;
}

/**
 * Get the current Lamport clock value.
 */
export function getLamport() {
  return _lamportClock;
}

/**
 * Prune operations older than a threshold (for storage management).
 * Keeps the most recent `keepCount` operations.
 */
export async function pruneOps(keepCount = 10000) {
  const total = await db.operations.count();
  if (total <= keepCount) return 0;

  const cutoff = total - keepCount;
  const oldOps = await db.operations.orderBy('seq').limit(cutoff).primaryKeys();
  await db.operations.bulkDelete(oldOps);
  return oldOps.length;
}
