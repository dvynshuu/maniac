/**
 * ─── Core: Sync OpQueue ─────────────────────────────────────────
 * Manages the operation log for replication and conflict resolution.
 *
 * Matches target tables:
 *   ops(opId, actorId, lamport, entityType, entityId, opType, payload, deps, createdAt)
 *   sync_state(peerId, lastAckLamport, cursor, health)
 */

import { getLamport, mergeLamport } from '../ops/definitions.js';

export class OpQueue {
  constructor(actorId = 'local-actor') {
    this.actorId = actorId;
    this.pending = [];     // Ops not yet ACK'd by remote
    this.applied = [];     // Full local op history
    this._listeners = new Set();
  }

  // ─── Local Operations ───────────────────────────────────────────

  /**
   * Enqueue a locally-generated operation.
   * @param {object} op - Operation created via createOp()
   */
  push(op) {
    this.pending.push(op);
    this.applied.push(op);
    this._notify();
  }

  /**
   * Acknowledge a remote confirmation for pending ops.
   * Removes from pending queue, updates sync_state.
   * @param {string} opId - The confirmed operation ID
   * @returns {object|null} The confirmed op, or null
   */
  ack(opId) {
    const idx = this.pending.findIndex(o => o.opId === opId);
    if (idx !== -1) {
      const [confirmed] = this.pending.splice(idx, 1);
      this._notify();
      return confirmed;
    }
    return null;
  }

  // ─── Remote Operations ──────────────────────────────────────────

  /**
   * Receive a remote operation. Merges Lamport clock and appends.
   * @param {object} remoteOp - Operation from a peer
   */
  receiveRemote(remoteOp) {
    // Merge Lamport to maintain causal order
    mergeLamport(remoteOp.lamport);
    this.applied.push(remoteOp);
    this.applied.sort((a, b) => a.lamport - b.lamport);
    this._notify();
  }

  // ─── Queries ──────────────────────────────────────────────────

  /**
   * Get all ops since a given Lamport timestamp.
   */
  getOpsSince(lamport) {
    return this.applied.filter(op => op.lamport > lamport);
  }

  /**
   * Get pending (un-ACK'd) operations.
   */
  getPending() {
    return [...this.pending];
  }

  /**
   * Get sync state snapshot for this actor.
   * @returns {object} Matches sync_state schema
   */
  getSyncState() {
    const lastApplied = this.applied[this.applied.length - 1];
    return {
      peerId: this.actorId,
      lastAckLamport: lastApplied ? lastApplied.lamport : 0,
      cursor: lastApplied ? lastApplied.opId : null,
      health: this.pending.length === 0 ? 'healthy' : 'degraded',
    };
  }

  // ─── Subscriptions ────────────────────────────────────────────

  _notify() {
    const state = { pending: this.pending, applied: this.applied };
    this._listeners.forEach(fn => fn(state));
  }

  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }
}
