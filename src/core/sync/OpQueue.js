/**
 * ─── Core: Sync OpQueue ─────────────────────────────────────────
 * Manages outgoing operations and incoming remote changes.
 * Handles retry, ACK, and conflict detection.
 */

export class OpQueue {
  constructor() {
    this.pending = []; // Ops waiting for server ACK
    this.history = []; // Applied ops
    this._listeners = new Set();
  }

  /**
   * Enqueue a local operation for propagation.
   */
  async push(op) {
    this.pending.push(op);
    this.history.push(op);
    this._notify();
    
    // Simulate network delay and ACK
    this._processQueue();
  }

  /**
   * Mock network processing.
   */
  async _processQueue() {
    if (this.pending.length === 0) return;
    
    const nextOp = this.pending[0];
    try {
      // TODO: Transport.send(nextOp)
      console.debug(`[OpQueue] Sending op ${nextOp.id} to network...`);
      
      // Assume success for local-first
      this.pending.shift();
      this._notify();
    } catch (err) {
      console.warn(`[OpQueue] Failed to send op ${nextOp.id}:`, err);
      // Implement backoff retry
    }
  }

  _notify() {
    this._listeners.forEach(l => l(this.pending, this.history));
  }

  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }
}
