/**
 * ─── Core: Graph Store ──────────────────────────────────────────
 * Normalized, high-performance store matching the target data model.
 * 
 * DESIGN PRINCIPLE:
 * This store is a PROJECTION of the operation stream. 
 * While it supports direct updates for legacy compatibility, the
 * primary path is the `apply(op)` method.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { OP_TYPES } from '../ops/definitions';

export const useGraphStore = create(subscribeWithSelector((set, get) => ({
  // ─── Normalized Entity Maps ───────────────────────────────────
  pages: {},           // id → PageRecord
  blocks: {},          // id → BlockRecord
  block_props: {},     // blockId → BlockPropsRecord
  richtext_docs: {},   // docId → RichTextDocRecord
  relations: [],       // Array of RelationEdge
  database_defs: {},   // dbId → DatabaseDefRecord
  db_rows: {},         // rowId → DbRowRecord
  db_cells: {},        // `${rowId}:${propertyId}` → DbCellRecord
  ops: [],             // Array of OpRecord (append-only log)
  sync_state: {},      // peerId → SyncStateRecord

  // ─── Metadata ─────────────────────────────────────────────────
  version: 0,
  lastUpdated: Date.now(),

  // ─── The Projection Engine: Apply Operation ────────────────────

  /**
   * Apply an atomic operation to the store.
   * This is the canonical way to mutate domain state.
   */
  apply: (op) => {
    const { opType, entityType, entityId, payload } = op;
    const table = entityType + (entityType === 'page' ? 's' : 's'); // Simple pluralization for core tables
    
    // Normalize table names for complex ones
    let targetTable = table;
    if (entityType === 'block_props') targetTable = 'block_props';
    if (entityType === 'richtext') targetTable = 'richtext_docs';
    if (entityType === 'db_row') targetTable = 'db_rows';
    if (entityType === 'db_cell') targetTable = 'db_cells';

    set(state => {
      const nextState = { ...state, version: state.version + 1, lastUpdated: Date.now() };
      
      // Update ops log
      nextState.ops = [...state.ops, op];

      switch (opType) {
        case OP_TYPES.CREATE:
          nextState[targetTable] = { 
            ...state[targetTable], 
            [entityId]: { ...payload, id: entityId, createdAt: Date.now(), updatedAt: Date.now() } 
          };
          break;

        case OP_TYPES.UPDATE:
          if (state[targetTable]?.[entityId]) {
            nextState[targetTable] = {
              ...state[targetTable],
              [entityId]: { ...state[targetTable][entityId], ...payload, updatedAt: Date.now() }
            };
          }
          break;

        case OP_TYPES.DELETE:
          const nextTable = { ...state[targetTable] };
          delete nextTable[entityId];
          nextState[targetTable] = nextTable;
          break;

        case OP_TYPES.MOVE:
        case OP_TYPES.REPARENT:
          if (state[targetTable]?.[entityId]) {
            nextState[targetTable] = {
              ...state[targetTable],
              [entityId]: { ...state[targetTable][entityId], ...payload, updatedAt: Date.now() }
            };
          }
          break;
      }

      return nextState;
    });
  },

  // ─── Legacy/Bulk Ingestion (Direct writes) ────────────────────

  ingest: (table, entities) => {
    set(state => ({
      [table]: { ...state[table], ...entities },
      version: state.version + 1,
      lastUpdated: Date.now(),
    }));
  },

  update: (table, id, updates) => {
    set(state => {
      const entity = state[table]?.[id];
      if (!entity) return state;
      return {
        [table]: {
          ...state[table],
          [id]: { ...entity, ...updates, updatedAt: Date.now() },
        },
        version: state.version + 1,
        lastUpdated: Date.now(),
      };
    });
  },

  remove: (table, id) => {
    set(state => {
      const next = { ...state[table] };
      delete next[id];
      return {
        [table]: next,
        version: state.version + 1,
        lastUpdated: Date.now(),
      };
    });
  },

  // ─── Graph Queries ────────────────────────────────────────────

  getById: (table, id) => get()[table]?.[id],

  getChildren: (parentId) => {
    const { blocks } = get();
    return Object.values(blocks)
      .filter(b => (b.parentId || null) === parentId)
      .sort((a, b) => (a.orderKey || '').localeCompare(b.orderKey || ''));
  },

  getBlockProps: (blockId) => get().block_props[blockId]?.payload || {},

  getRichTextDoc: (docId) => get().richtext_docs[docId] || null,

  getOpsSince: (lamport) => get().ops.filter(op => op.lamport > lamport),
})));
