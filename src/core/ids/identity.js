import { nanoid } from 'nanoid';

/**
 * ─── Core: Identity ─────────────────────────────────────────────
 * Centralized ID generation. Defaults to nanoid for high entropy.
 */

export function createId(size = 21) {
  return nanoid(size);
}

/**
 * Generate a short, URL-friendly ID.
 */
export function createShortId() {
  return nanoid(10);
}
