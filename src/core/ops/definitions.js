/**
 * ─── Core: Operations ───────────────────────────────────────────
 * Atomic operation definitions matching the target data model:
 *   ops(opId, actorId, lamport, entityType, entityId, opType, payload, deps, createdAt)
 */

import { createId } from '../ids/identity.js';

// ─── Operation Types ────────────────────────────────────────────

export const OP_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  MOVE: 'MOVE',
  REPARENT: 'REPARENT',
};

// ─── Lamport Clock ──────────────────────────────────────────────

let _lamport = 0;

/**
 * Increment and return the local Lamport clock.
 */
export function tickLamport() {
  return ++_lamport;
}

/**
 * Merge with a remote Lamport value (max + 1).
 */
export function mergeLamport(remoteLamport) {
  _lamport = Math.max(_lamport, remoteLamport) + 1;
  return _lamport;
}

/**
 * Get current Lamport value without incrementing.
 */
export function getLamport() {
  return _lamport;
}

// ─── Operation Factory ─────────────────────────────────────────

/**
 * Create a fully-formed operation matching the target schema.
 *
 * @param {string} opType     - CREATE | UPDATE | DELETE | MOVE | REPARENT
 * @param {string} entityType - 'page' | 'block' | 'database' | etc.
 * @param {string} entityId   - Primary key of the target entity
 * @param {object} payload    - Mutation data
 * @param {string} actorId    - Actor performing the operation
 * @param {string[]} deps     - opIds this operation causally depends on
 * @returns {object} Operation record
 */
export function createOp(opType, entityType, entityId, payload = {}, actorId = 'local-actor', deps = []) {
  return {
    opId: createId(),
    actorId,
    lamport: tickLamport(),
    entityType,
    entityId,
    opType,
    payload,
    deps,
    createdAt: Date.now(),
  };
}

// ─── Validation ─────────────────────────────────────────────────

/**
 * Validate an operation's structural integrity.
 */
export function validateOp(op) {
  const required = ['opId', 'actorId', 'lamport', 'entityType', 'entityId', 'opType'];
  for (const field of required) {
    if (op[field] === undefined || op[field] === null) {
      throw new Error(`Operation missing required field: ${field}`);
    }
  }
  if (!Object.values(OP_TYPES).includes(op.opType)) {
    throw new Error(`Unknown opType: ${op.opType}`);
  }
  return true;
}

// ─── Inverse Operations (Undo) ──────────────────────────────────

/**
 * Compute the inverse operation for undo.
 * Requires the entity's state before the op was applied.
 *
 * @param {object} op        - The operation to invert
 * @param {object} prevState - Entity state before the op
 * @returns {object|null} Inverse operation, or null if not invertible
 */
export function getInverseOp(op, prevState) {
  switch (op.opType) {
    case OP_TYPES.UPDATE: {
      const inversePayload = {};
      for (const key of Object.keys(op.payload)) {
        inversePayload[key] = prevState[key];
      }
      return createOp(OP_TYPES.UPDATE, op.entityType, op.entityId, inversePayload, op.actorId, [op.opId]);
    }

    case OP_TYPES.CREATE:
      return createOp(OP_TYPES.DELETE, op.entityType, op.entityId, {}, op.actorId, [op.opId]);

    case OP_TYPES.DELETE:
      return createOp(OP_TYPES.CREATE, op.entityType, op.entityId, prevState, op.actorId, [op.opId]);

    case OP_TYPES.MOVE: {
      return createOp(OP_TYPES.MOVE, op.entityType, op.entityId, {
        orderKey: prevState.orderKey || prevState.sortOrder,
      }, op.actorId, [op.opId]);
    }

    case OP_TYPES.REPARENT: {
      return createOp(OP_TYPES.REPARENT, op.entityType, op.entityId, {
        parentId: prevState.parentId,
        orderKey: prevState.orderKey || prevState.sortOrder,
      }, op.actorId, [op.opId]);
    }

    default:
      return null;
  }
}
