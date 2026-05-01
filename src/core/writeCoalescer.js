/**
 * ─── Performance Layer: Batched Write Coalescing ────────────────
 * Coalesces rapid Dexie writes across stores into batched
 * transactions. Prevents write amplification when many blocks
 * update in quick succession (e.g., drag reorder, bulk paste,
 * real-time typing across multiple blocks).
 *
 * Usage:
 *   import { writeCoalescer } from './writeCoalescer';
 *   writeCoalescer.enqueue('blocks', blockId, { content: '...' });
 *   writeCoalescer.enqueue('pages', pageId, { title: '...' });
 */

import { db } from '../db/database';

const FLUSH_INTERVAL = 100; // ms — flush coalesced writes every 100ms
const MAX_QUEUE_SIZE = 200; // Force flush if queue exceeds this

class WriteCoalescer {
  constructor() {
    // Pending writes: Map<table, Map<id, mergedUpdate>>
    this._pending = new Map();
    this._timer = null;
    this._flushing = false;
    this._flushCount = 0;
    this._coalescedCount = 0;
  }

  /**
   * Enqueue a write. If a write for the same table+id is already
   * pending, the updates are merged (last-write-wins per field).
   *
   * @param {string} table - Dexie table name ('blocks', 'pages', 'database_cells', etc.)
   * @param {string} id - Record primary key
   * @param {object} updates - Fields to update
   */
  enqueue(table, id, updates) {
    if (!this._pending.has(table)) {
      this._pending.set(table, new Map());
    }

    const tableQueue = this._pending.get(table);

    if (tableQueue.has(id)) {
      // Coalesce: merge with existing pending update
      const existing = tableQueue.get(id);
      tableQueue.set(id, { ...existing, ...updates });
      this._coalescedCount++;
    } else {
      tableQueue.set(id, { ...updates });
    }

    // Schedule flush
    this._scheduleFlush();

    // Force flush if queue is too large
    const totalSize = this._getTotalSize();
    if (totalSize >= MAX_QUEUE_SIZE) {
      this._cancelTimer();
      this.flush();
    }
  }

  /**
   * Enqueue a full record insert (add, not update).
   */
  enqueueAdd(table, record) {
    if (!this._pending.has(`${table}:add`)) {
      this._pending.set(`${table}:add`, new Map());
    }
    this._pending.get(`${table}:add`).set(record.id || Date.now().toString(), record);
    this._scheduleFlush();
  }

  _getTotalSize() {
    let total = 0;
    for (const [, map] of this._pending) {
      total += map.size;
    }
    return total;
  }

  _scheduleFlush() {
    if (this._timer || this._flushing) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      this.flush();
    }, FLUSH_INTERVAL);
  }

  _cancelTimer() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /**
   * Flush all pending writes in a single Dexie transaction.
   */
  async flush() {
    if (this._flushing || this._pending.size === 0) return;

    this._flushing = true;
    const snapshot = this._pending;
    this._pending = new Map();

    try {
      // Group operations by type
      const updates = [];
      const adds = [];

      for (const [key, map] of snapshot) {
        if (key.endsWith(':add')) {
          const table = key.replace(':add', '');
          for (const [, record] of map) {
            adds.push({ table, record });
          }
        } else {
          for (const [id, fields] of map) {
            updates.push({ table: key, id, fields });
          }
        }
      }

      // Execute in a single transaction for atomicity
      if (updates.length > 0 || adds.length > 0) {
        const tableNames = new Set([
          ...updates.map(u => u.table),
          ...adds.map(a => a.table),
        ]);

        await db.transaction('rw', [...tableNames].map(t => db[t]), async () => {
          // Batch updates
          for (const { table, id, fields } of updates) {
            await db[table].update(id, fields);
          }

          // Batch adds
          for (const { table, record } of adds) {
            await db[table].put(record);
          }
        });
      }

      this._flushCount++;
    } catch (err) {
      console.error('[WriteCoalescer] Flush failed:', err);
      // Re-enqueue failed writes
      for (const [key, map] of snapshot) {
        if (!this._pending.has(key)) {
          this._pending.set(key, new Map());
        }
        for (const [id, data] of map) {
          if (!this._pending.get(key).has(id)) {
            this._pending.get(key).set(id, data);
          }
        }
      }
    } finally {
      this._flushing = false;

      // If new writes came in during flush, schedule another
      if (this._pending.size > 0) {
        this._scheduleFlush();
      }
    }
  }

  /**
   * Get diagnostics.
   */
  getStats() {
    return {
      pendingWrites: this._getTotalSize(),
      flushes: this._flushCount,
      coalesced: this._coalescedCount,
    };
  }

  /**
   * Force immediate flush (e.g., before page unload).
   */
  async forceFlush() {
    this._cancelTimer();
    await this.flush();
  }
}

// Singleton
export const writeCoalescer = new WriteCoalescer();

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    writeCoalescer.forceFlush();
  });

  // Also flush on visibility change (tab hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      writeCoalescer.forceFlush();
    }
  });
}
