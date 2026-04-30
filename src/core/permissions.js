/**
 * ─── Permission / ACL Primitives ────────────────────────────────
 * Lays the foundation for entity-level access control.
 * In single-user mode (current), the local actor has OWNER
 * on everything. The interface is ready for multi-user.
 */

import { getActorId } from '../db/actorId';

// ─── Permission Levels ──────────────────────────────────────────

export const Permission = Object.freeze({
  NONE: 0,
  READ: 1,
  WRITE: 2,
  ADMIN: 3,
  OWNER: 4,
});

// ─── Policy Storage ─────────────────────────────────────────────
// In-memory for now. Future: persisted in Dexie `permissions` table.

const _policies = new Map();

/**
 * Generate a policy key for an entity.
 */
function policyKey(entityType, entityId, actorId) {
  return `${entityType}:${entityId}:${actorId}`;
}

/**
 * Set a permission policy for an entity.
 *
 * @param {string} entityType - 'page' | 'block' | 'tracker'
 * @param {string} entityId - The entity's ID
 * @param {string} actorId - The actor's ID
 * @param {number} permission - Permission level from the Permission enum
 */
export function setPolicy(entityType, entityId, actorId, permission) {
  _policies.set(policyKey(entityType, entityId, actorId), permission);
}

/**
 * Get the permission level for an actor on an entity.
 * Returns OWNER for the local actor in single-user mode (default policy).
 */
export function getPermission(entityType, entityId, actorId) {
  const key = policyKey(entityType, entityId, actorId);
  if (_policies.has(key)) {
    return _policies.get(key);
  }
  // Default policy: local actor owns everything
  if (actorId === getActorId()) {
    return Permission.OWNER;
  }
  return Permission.NONE;
}

/**
 * Check if an actor has at least the given permission level.
 *
 * @param {string} actorId - Actor to check
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @param {number} requiredPermission - Minimum required permission
 * @returns {boolean}
 */
export function can(actorId, entityType, entityId, requiredPermission) {
  const level = getPermission(entityType, entityId, actorId);
  return level >= requiredPermission;
}

/**
 * Assert that an actor has a permission. Throws if denied.
 */
export function assertCan(actorId, entityType, entityId, requiredPermission) {
  if (!can(actorId, entityType, entityId, requiredPermission)) {
    const permName = Object.keys(Permission).find(k => Permission[k] === requiredPermission) || requiredPermission;
    throw new Error(
      `[ACL] Permission denied: actor ${actorId} needs ${permName} on ${entityType}:${entityId}`
    );
  }
}

/**
 * Remove all policies for an entity (e.g., on deletion).
 */
export function clearPolicies(entityType, entityId) {
  const prefix = `${entityType}:${entityId}:`;
  for (const key of _policies.keys()) {
    if (key.startsWith(prefix)) {
      _policies.delete(key);
    }
  }
}

/**
 * Get all policies for an entity.
 */
export function getPolicies(entityType, entityId) {
  const prefix = `${entityType}:${entityId}:`;
  const result = [];
  for (const [key, permission] of _policies.entries()) {
    if (key.startsWith(prefix)) {
      const actorId = key.slice(prefix.length);
      result.push({ actorId, permission });
    }
  }
  return result;
}
