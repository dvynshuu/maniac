/**
 * ─── Core: Monotonic Clock ──────────────────────────────────────
 * Hybrid Logical Clock (HLC) or simple monotonic counter to 
 * ensure causality in a distributed environment.
 */

let lastTime = 0;
let counter = 0;

/**
 * Get a monotonic timestamp.
 * If multiple IDs are requested within the same millisecond,
 * a counter is incremented to ensure uniqueness and order.
 */
export function getMonotonicTimestamp(): string {
  const now = Date.now();
  
  if (now <= lastTime) {
    counter++;
  } else {
    lastTime = now;
    counter = 0;
  }
  
  return `${lastTime}:${counter}`;
}

/**
 * Actor-aware clock for CRDT operations.
 */
export class VectorClock {
  actorId: string;
  versions: Record<string, number>;

  constructor(actorId: string) {
    this.actorId = actorId;
    this.versions = { [actorId]: 0 };
  }

  tick(): Record<string, number> {
    this.versions[this.actorId] = (this.versions[this.actorId] || 0) + 1;
    return { ...this.versions };
  }

  merge(remoteVersions: Record<string, number>): void {
    for (const [actor, version] of Object.entries(remoteVersions)) {
      this.versions[actor] = Math.max(this.versions[actor] || 0, version);
    }
  }

  isAheadOf(otherVersions: Record<string, number>): boolean {
    let ahead = false;
    for (const [actor, version] of Object.entries(this.versions)) {
      const otherVersion = otherVersions[actor] || 0;
      if (version < otherVersion) return false;
      if (version > otherVersion) ahead = true;
    }
    return ahead;
  }
}
