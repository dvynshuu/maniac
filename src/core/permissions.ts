/**
 * ─── Permission / ACL Primitives ────────────────────────────────
 * Lays the foundation for entity-level access control.
 */

import { getActorId } from '../db/actorId';

export const Permission = Object.freeze({
  NONE: 0,
  READ: 1,
  WRITE: 2,
  ADMIN: 3,
  OWNER: 4,
} as const);

export type PermissionLevel = typeof Permission[keyof typeof Permission];

const _policies = new Map<string, number>();

function policyKey(entityType: string, entityId: string, actorId: string): string {
  return `${entityType}:${entityId}:${actorId}`;
}

export function setPolicy(entityType: string, entityId: string, actorId: string, permission: number): void {
  _policies.set(policyKey(entityType, entityId, actorId), permission);
}

export function getPermission(entityType: string, entityId: string, actorId: string): number {
  const key = policyKey(entityType, entityId, actorId);
  if (_policies.has(key)) {
    return _policies.get(key)!;
  }
  if (actorId === getActorId()) {
    return Permission.OWNER;
  }
  return Permission.NONE;
}

export function can(actorId: string, entityType: string, entityId: string, requiredPermission: number): boolean {
  const level = getPermission(entityType, entityId, actorId);
  return level >= requiredPermission;
}

export function assertCan(actorId: string, entityType: string, entityId: string, requiredPermission: number): void {
  if (!can(actorId, entityType, entityId, requiredPermission)) {
    const permName = (Object.keys(Permission) as (keyof typeof Permission)[]).find(k => Permission[k] === requiredPermission) || requiredPermission;
    throw new Error(
      `[ACL] Permission denied: actor ${actorId} needs ${permName} on ${entityType}:${entityId}`
    );
  }
}

export function clearPolicies(entityType: string, entityId: string): void {
  const prefix = `${entityType}:${entityId}:`;
  for (const key of _policies.keys()) {
    if (key.startsWith(prefix)) {
      _policies.delete(key);
    }
  }
}

export function getPolicies(entityType: string, entityId: string): { actorId: string; permission: number }[] {
  const prefix = `${entityType}:${entityId}:`;
  const result: { actorId: string; permission: number }[] = [];
  for (const [key, permission] of _policies.entries()) {
    if (key.startsWith(prefix)) {
      const actorId = key.slice(prefix.length);
      result.push({ actorId, permission });
    }
  }
  return result;
}
