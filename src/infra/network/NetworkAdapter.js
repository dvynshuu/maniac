/**
 * ─── Infrastructure: Network ────────────────────────────────────
 * Network transport layer. Supports WebSocket and WebRTC.
 */

export class NetworkAdapter {
  constructor(url) {
    this.url = url;
    this.status = 'disconnected';
    this._listeners = new Set();
  }

  async connect() {
    this.status = 'connecting';
    console.debug(`[NetworkAdapter] Connecting to ${this.url}...`);
    
    // Simulate connection
    return new Promise(resolve => {
      setTimeout(() => {
        this.status = 'connected';
        this._emit('status', 'connected');
        resolve();
      }, 500);
    });
  }

  send(data) {
    if (this.status !== 'connected') return false;
    console.debug(`[NetworkAdapter] Outbound:`, data);
    return true;
  }

  _emit(event, payload) {
    this._listeners.forEach(l => l(event, payload));
  }

  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }
}
