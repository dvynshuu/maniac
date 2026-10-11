/**
 * ─── Cross-Tab Consistency Channel ──────────────────────────────
 * Uses BroadcastChannel API to keep multiple tabs in sync.
 * When one tab commits an operation, all other tabs receive it
 * and can replay/invalidate their local state.
 */

const CHANNEL_NAME = 'maniac-sync';

// ─── Message Types ──────────────────────────────────────────────

export const ChannelMessageType = Object.freeze({
  OP_COMMITTED: 'OP_COMMITTED',       // An operation was persisted
  STORE_INVALIDATE: 'STORE_INVALIDATE', // A store needs to reload
  LOCK_ACQUIRED: 'LOCK_ACQUIRED',     // A tab acquired an entity lock
  LOCK_RELEASED: 'LOCK_RELEASED',     // A tab released an entity lock
  PING: 'PING',                       // Heartbeat
  PONG: 'PONG',                       // Heartbeat response
} as const);

export type ChannelMessageTypeKey = keyof typeof ChannelMessageType;

export interface ChannelMessage {
  type: string;
  tabId: string;
  timestamp: number;
  [key: string]: any;
}

// ─── Channel Singleton ──────────────────────────────────────────

let _channel: BroadcastChannel | null = null;
const _listeners = new Set<(msg: ChannelMessage) => void>();
let _tabId: string | null = null;

export function getTabId(): string {
  if (!_tabId) {
    _tabId = crypto.randomUUID().slice(0, 8);
  }
  return _tabId;
}

/**
 * Initialize the cross-tab channel. Idempotent.
 */
export function initChannel(): void {
  if (_channel) return;
  if (typeof BroadcastChannel === 'undefined') {
    console.warn('[CrossTab] BroadcastChannel not supported in this browser.');
    return;
  }

  _channel = new BroadcastChannel(CHANNEL_NAME);
  _channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
    const msg = event.data;
    // Ignore messages from self
    if (msg?.tabId === getTabId()) return;
    _listeners.forEach(fn => {
      try { fn(msg); }
      catch (e) { console.error('[CrossTab] Listener error:', e); }
    });
  };
}

/**
 * Broadcast a message to all other tabs.
 */
export function broadcast(type: string, data: Record<string, any> = {}): void {
  if (!_channel) initChannel();
  if (!_channel) return; // BroadcastChannel not supported

  _channel.postMessage({
    type,
    tabId: getTabId(),
    timestamp: Date.now(),
    ...data,
  });
}

/**
 * Register a message listener. Returns an unsubscribe function.
 */
export function onMessage(handler: (msg: ChannelMessage) => void): () => void {
  if (!_channel) initChannel();
  _listeners.add(handler);
  return () => _listeners.delete(handler);
}

/**
 * Broadcast that an operation was committed.
 */
export function broadcastOp(operation: any): void {
  broadcast(ChannelMessageType.OP_COMMITTED, { operation });
}

/**
 * Broadcast a store invalidation signal.
 */
export function broadcastInvalidate(storeName: string, entityId: string | null = null): void {
  broadcast(ChannelMessageType.STORE_INVALIDATE, { storeName, entityId });
}

/**
 * Destroy the channel. Call on app unmount.
 */
export function destroyChannel(): void {
  if (_channel) {
    _channel.close();
    _channel = null;
  }
  _listeners.clear();
}
