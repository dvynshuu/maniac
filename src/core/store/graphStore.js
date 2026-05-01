/**
 * ─── Core: Graph Store ──────────────────────────────────────────
 * High-performance, normalized store for all entities.
 * Replaces fragmented stores with a unified graph.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useGraphStore = create(subscribeWithSelector((set, get) => ({
  // Normalized entities
  pages: {},
  blocks: {},
  databases: {},
  relations: [],
  
  // Metadata & Indexing
  version: 0,
  lastUpdated: Date.now(),
  
  // Actions
  ingest: (entityType, entities) => {
    set(state => ({
      [entityType]: { ...state[entityType], ...entities },
      version: state.version + 1,
      lastUpdated: Date.now()
    }));
  },
  
  update: (entityType, id, updates) => {
    set(state => {
      const entity = state[entityType][id];
      if (!entity) return state;
      
      return {
        [entityType]: {
          ...state[entityType],
          [id]: { ...entity, ...updates, updatedAt: Date.now() }
        },
        version: state.version + 1,
        lastUpdated: Date.now()
      };
    });
  },
  
  remove: (entityType, id) => {
    set(state => {
      const newEntities = { ...state[entityType] };
      delete newEntities[id];
      return {
        [entityType]: newEntities,
        version: state.version + 1,
        lastUpdated: Date.now()
      };
    });
  },
  
  // Graph Queries
  getById: (type, id) => get()[type][id],
  
  getChildren: (parentId) => {
    const { blocks } = get();
    return Object.values(blocks)
      .filter(b => b.parentId === parentId)
      .sort((a, b) => (a.sortOrder || '').localeCompare(b.sortOrder || ''));
  }
})));
