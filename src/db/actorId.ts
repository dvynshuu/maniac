/**
 * ─── Actor ID ───────────────────────────────────────────────────
 * Each browser instance gets a stable, persistent actor ID.
 * Used for version vectors, conflict resolution tiebreakers,
 * and operation log attribution.
 */

import { nanoid } from 'nanoid';

const ACTOR_STORAGE_KEY = 'maniac-actor-id';
let _actorId: string | null = null;

/**
 * Returns the local actor's ID. Creates and persists one if none exists.
 * Uses localStorage for instant synchronous access (Dexie is async).
 */
export function getActorId(): string {
  if (_actorId) return _actorId;

  _actorId = localStorage.getItem(ACTOR_STORAGE_KEY);
  if (!_actorId) {
    _actorId = nanoid(12);
    localStorage.setItem(ACTOR_STORAGE_KEY, _actorId);
  }
  return _actorId;
}

// ─── Version Vector ─────────────────────────────────────────────
// Tracks "what sequence number has each actor been seen at."
// This is the mechanism for detecting concurrent edits.

const _versionVector: Record<string, number> = {};

/**
 * Get the current version vector.
 * Returns a copy to prevent external mutation.
 */
export function getVersionVector(): Record<string, number> {
  return { ..._versionVector };
}

/**
 * Advance the vector for a given actor to a new sequence number.
 * Only advances forward — never goes backward.
 */
export function advanceVector(actorId: string, seq: number): void {
  const current = _versionVector[actorId] || 0;
  if (seq > current) {
    _versionVector[actorId] = seq;
  }
}

export interface VectorDifference {
  actorId: string;
  localSeq: number;
  remoteSeq: number;
}

/**
 * Check if a remote vector has operations we haven't seen.
 * Returns the list of actor IDs that are ahead of us.
 */
export function compareVectors(remoteVector: Record<string, number>): VectorDifference[] {
  const behind: VectorDifference[] = [];
  for (const [actorId, remoteSeq] of Object.entries(remoteVector)) {
    const localSeq = _versionVector[actorId] || 0;
    if (remoteSeq > localSeq) {
      behind.push({ actorId, localSeq, remoteSeq });
    }
  }
  return behind;
}

/**
 * Merge a remote version vector into the local one.
 * Takes the max of each actor's sequence number.
 */
export function mergeVectors(remoteVector: Record<string, number>): void {
  for (const [actorId, remoteSeq] of Object.entries(remoteVector)) {
    advanceVector(actorId, remoteSeq);
  }
}
