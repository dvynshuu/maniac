/**
 * ─── Conflict Resolver ──────────────────────────────────────────
 * Block-level conflict resolution using Last-Writer-Wins (LWW)
 * with Lamport timestamp + actor ID tiebreaker.
 *
 * This is the pragmatic first step — not a character-level CRDT,
 * but sufficient for cross-tab consistency and future multi-device sync.
 * The interface is designed so a real CRDT can be swapped in later
 * without changing the command bus.
 */

// ─── Resolution Strategies ──────────────────────────────────────

export const Strategy = Object.freeze({
  LAST_WRITE_WINS: 'LWW',
  FIRST_WRITE_WINS: 'FWW',
  MANUAL: 'MANUAL', // Future: surface conflicts to the user
});

/**
 * Resolve a conflict between two concurrent operations on the same entity.
 *
 * @param {object} localOp - The local operation
 * @param {object} remoteOp - The remote operation
 * @param {string} strategy - Resolution strategy (default: LWW)
 * @returns {{ winner: object, loser: object, resolved: boolean }}
 */
export function resolve(localOp, remoteOp, strategy = Strategy.LAST_WRITE_WINS) {
  if (strategy === Strategy.LAST_WRITE_WINS) {
    return resolveLWW(localOp, remoteOp);
  }
  if (strategy === Strategy.FIRST_WRITE_WINS) {
    return resolveFWW(localOp, remoteOp);
  }
  // MANUAL — mark as unresolved
  return {
    winner: null,
    loser: null,
    resolved: false,
    conflict: { localOp, remoteOp },
  };
}

/**
 * Last-Writer-Wins: higher Lamport timestamp wins.
 * On tie: higher actor ID (lexicographic) wins for determinism.
 */
function resolveLWW(localOp, remoteOp) {
  if (localOp.lamport > remoteOp.lamport) {
    return { winner: localOp, loser: remoteOp, resolved: true };
  }
  if (remoteOp.lamport > localOp.lamport) {
    return { winner: remoteOp, loser: localOp, resolved: true };
  }
  // Lamport tie — deterministic tiebreaker using actor ID
  if (localOp.actorId > remoteOp.actorId) {
    return { winner: localOp, loser: remoteOp, resolved: true };
  }
  return { winner: remoteOp, loser: localOp, resolved: true };
}

/**
 * First-Writer-Wins: lower Lamport timestamp wins.
 */
function resolveFWW(localOp, remoteOp) {
  if (localOp.lamport < remoteOp.lamport) {
    return { winner: localOp, loser: remoteOp, resolved: true };
  }
  if (remoteOp.lamport < localOp.lamport) {
    return { winner: remoteOp, loser: localOp, resolved: true };
  }
  // Tie — same deterministic tiebreaker
  if (localOp.actorId < remoteOp.actorId) {
    return { winner: localOp, loser: remoteOp, resolved: true };
  }
  return { winner: remoteOp, loser: localOp, resolved: true };
}

/**
 * Detect conflicts between two sets of operations.
 * Returns pairs of operations that target the same entity concurrently.
 *
 * @param {Array} localOps - Local operations
 * @param {Array} remoteOps - Remote operations
 * @returns {Array<{ localOp, remoteOp }>}
 */
export function detectConflicts(localOps, remoteOps) {
  const conflicts = [];
  const remoteByEntity = new Map();

  // Index remote ops by entity
  for (const op of remoteOps) {
    const key = `${op.entityType}:${op.entityId}`;
    if (!remoteByEntity.has(key)) {
      remoteByEntity.set(key, []);
    }
    remoteByEntity.get(key).push(op);
  }

  // Find local ops that touch the same entities
  for (const localOp of localOps) {
    const key = `${localOp.entityType}:${localOp.entityId}`;
    const remoteMatches = remoteByEntity.get(key);
    if (remoteMatches) {
      for (const remoteOp of remoteMatches) {
        conflicts.push({ localOp, remoteOp });
      }
    }
  }

  return conflicts;
}

/**
 * Resolve all conflicts in a batch, returning the winning operations.
 *
 * @param {Array<{ localOp, remoteOp }>} conflicts
 * @param {string} strategy
 * @returns {Array<{ winner, loser, resolved }>}
 */
export function resolveAll(conflicts, strategy = Strategy.LAST_WRITE_WINS) {
  return conflicts.map(({ localOp, remoteOp }) => resolve(localOp, remoteOp, strategy));
}
