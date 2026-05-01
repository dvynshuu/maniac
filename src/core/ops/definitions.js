/**
 * ─── Core: Operations ───────────────────────────────────────────
 * Formal definition of mutations as atomic operations.
 */

import { getMonotonicTimestamp } from '../ids/clock';

export const OP_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  MOVE: 'MOVE',
  REPARENT: 'REPARENT',
};

/**
 * Create a validated operation object.
 */
export function createOp(type, entityType, entityId, payload, actorId) {
  return {
    id: `op_${Math.random().toString(36).substr(2, 9)}`,
    type,
    entityType,
    entityId,
    payload,
    actorId,
    timestamp: getMonotonicTimestamp(),
  };
}

/**
 * Validate an operation against its entity schema.
 */
export function validateOp(op, schema) {
  // TODO: Implement AJV or simple field check
  if (!op.entityId) throw new Error('Operation missing entityId');
  if (!op.type) throw new Error('Operation missing type');
  return true;
}

/**
 * Compute the inverse operation for undo.
 */
export function getInverseOp(op, prevState) {
  switch (op.type) {
    case OP_TYPES.UPDATE:
      // Return update with previous values
      const inversePayload = {};
      Object.keys(op.payload).forEach(key => {
        inversePayload[key] = prevState[key];
      });
      return { ...op, payload: inversePayload };
      
    case OP_TYPES.CREATE:
      return { ...op, type: OP_TYPES.DELETE, payload: null };
      
    case OP_TYPES.DELETE:
      return { ...op, type: OP_TYPES.CREATE, payload: prevState };
      
    default:
      return null;
  }
}
