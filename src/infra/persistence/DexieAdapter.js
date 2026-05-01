/**
 * ─── Infrastructure: Dexie Persistence Adapter ──────────────────
 * Concrete implementation of the persistence layer for all
 * target data model tables.
 */

import { db } from '../../db/database';

export const DexieAdapter = {

  // ─── Pages ──────────────────────────────────────────────────────

  async loadPages() {
    return db.pages.toArray();
  },

  async savePage(page) {
    return db.pages.put(page);
  },

  async deletePage(id) {
    // Soft delete via tombstone
    return db.pages.update(id, { tombstonedAt: Date.now() });
  },

  // ─── Blocks ─────────────────────────────────────────────────────

  async loadBlocksForPage(pageId) {
    return db.blocks.where('pageId').equals(pageId).sortBy('orderKey');
  },

  async saveBlock(block) {
    return db.blocks.put(block);
  },

  async deleteBlock(id) {
    return db.blocks.delete(id);
  },

  // ─── Block Props ────────────────────────────────────────────────

  async loadBlockProps(blockId) {
    return db.block_props.get(blockId);
  },

  async saveBlockProps(props) {
    return db.block_props.put(props);
  },

  // ─── Rich Text Docs ────────────────────────────────────────────

  async loadRichTextDoc(docId) {
    return db.richtext_docs.get(docId);
  },

  async saveRichTextDoc(doc) {
    return db.richtext_docs.put(doc);
  },

  // ─── Relations ──────────────────────────────────────────────────

  async loadRelationsFrom(entityType, entityId) {
    return db.relations.where('[fromEntity+fromId]').equals([entityType, entityId]).toArray();
  },

  async loadRelationsTo(entityType, entityId) {
    return db.relations.where('[toEntity+toId]').equals([entityType, entityId]).toArray();
  },

  async saveRelation(relation) {
    return db.relations.put(relation);
  },

  async deleteRelation(edgeId) {
    return db.relations.delete(edgeId);
  },

  // ─── Database Defs ──────────────────────────────────────────────

  async loadDatabaseDef(dbId) {
    return db.database_defs.get(dbId);
  },

  async saveDatabaseDef(def) {
    return db.database_defs.put(def);
  },

  // ─── DB Rows ────────────────────────────────────────────────────

  async loadDbRows(dbId) {
    return db.db_rows.where('dbId').equals(dbId).sortBy('orderKey');
  },

  async saveDbRow(row) {
    return db.db_rows.put(row);
  },

  async deleteDbRow(rowId) {
    return db.db_rows.delete(rowId);
  },

  // ─── DB Cells ───────────────────────────────────────────────────

  async loadDbCells(rowId) {
    return db.db_cells.where('rowId').equals(rowId).toArray();
  },

  async saveDbCell(cell) {
    return db.db_cells.put(cell);
  },

  // ─── Ops ────────────────────────────────────────────────────────

  async loadOpsSince(lamport) {
    return db.ops.where('lamport').above(lamport).sortBy('lamport');
  },

  async saveOp(op) {
    return db.ops.put(op);
  },

  async saveOpsBatch(ops) {
    return db.ops.bulkPut(ops);
  },

  // ─── Sync State ─────────────────────────────────────────────────

  async loadSyncState(peerId) {
    return db.sync_state.get(peerId);
  },

  async saveSyncState(state) {
    return db.sync_state.put(state);
  },

  // ─── Bulk / Snapshots ─────────────────────────────────────────

  async createSnapshot() {
    const [pages, blocks, blockProps, richtextDocs, relations, databaseDefs, dbRows, dbCells, ops, syncState] = await Promise.all([
      db.pages.toArray(),
      db.blocks.toArray(),
      db.block_props.toArray(),
      db.richtext_docs.toArray(),
      db.relations.toArray(),
      db.database_defs.toArray(),
      db.db_rows.toArray(),
      db.db_cells.toArray(),
      db.ops.toArray(),
      db.sync_state.toArray(),
    ]);

    return {
      timestamp: Date.now(),
      data: { pages, blocks, blockProps, richtextDocs, relations, databaseDefs, dbRows, dbCells, ops, syncState },
    };
  },

  async restoreSnapshot(snapshot) {
    await db.transaction('rw', 
      db.pages, db.blocks, db.block_props, db.richtext_docs, db.relations,
      db.database_defs, db.db_rows, db.db_cells, db.ops, db.sync_state,
      async () => {
        const { data } = snapshot;
        if (data.pages) await db.pages.bulkPut(data.pages);
        if (data.blocks) await db.blocks.bulkPut(data.blocks);
        if (data.blockProps) await db.block_props.bulkPut(data.blockProps);
        if (data.richtextDocs) await db.richtext_docs.bulkPut(data.richtextDocs);
        if (data.relations) await db.relations.bulkPut(data.relations);
        if (data.databaseDefs) await db.database_defs.bulkPut(data.databaseDefs);
        if (data.dbRows) await db.db_rows.bulkPut(data.dbRows);
        if (data.dbCells) await db.db_cells.bulkPut(data.dbCells);
        if (data.ops) await db.ops.bulkPut(data.ops);
        if (data.syncState) await db.sync_state.bulkPut(data.syncState);
      }
    );
  },
};
