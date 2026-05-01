/**
 * ─── Infrastructure: Persistence ────────────────────────────────
 * Dexie.js implementation of the persistence layer.
 */

import { db } from '../../db/database';

export const DexieAdapter = {
  /**
   * Bulk put entities into their respective tables.
   */
  async persistBatch(table, entities) {
    return db[table].bulkPut(entities);
  },

  /**
   * Save a single update.
   */
  async update(table, id, updates) {
    return db[table].update(id, updates);
  },

  /**
   * Load all entities of a specific type.
   */
  async loadAll(table) {
    return db[table].toArray();
  },

  /**
   * Query by index.
   */
  async query(table, indexName, value) {
    return db[table].where(indexName).equals(value).toArray();
  },

  /**
   * Create a snapshot of the entire database.
   */
  async createSnapshot() {
    const pages = await db.pages.toArray();
    const blocks = await db.blocks.toArray();
    const databases = await db.databases.toArray();
    
    return {
      timestamp: Date.now(),
      data: { pages, blocks, databases }
    };
  }
};
