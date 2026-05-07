/**
 * ─── Query Engine ───────────────────────────────────────────────
 * Shared filter/sort/group logic for all database views.
 * Extracted from DatabaseBlock.jsx for reuse across
 * Table, Board, Calendar, Timeline, and Gallery views.
 */

import { useMemo, useRef, useEffect } from 'react';
import { useStore } from 'zustand';
import { useBlockStore } from '../stores/blockStore';
import { useDatabaseStore } from '../stores/databaseStore';
import { useBacklinkStore } from '../stores/backlinkStore';

/**
 * Apply filters to rows.
 * @param {Array} rows - Database rows
 * @param {Array} filters - [{ propertyId, operator, value }]
 * @param {Array} schema - Property definitions
 * @returns {Array} Filtered rows
 */
export function applyFilters(rows, filters, schema) {
  if (!filters || filters.length === 0) return rows;

  let result = [...rows];
  for (const f of filters) {
    if (!f.propertyId) continue;

    const prop = schema.find(p => p.id === f.propertyId);

    result = result.filter(row => {
      const rawVal = row.values[f.propertyId];
      const val = String(rawVal ?? '').toLowerCase();

      switch (f.operator) {
        case 'contains':
          return val.includes((f.value || '').toLowerCase());
        case 'not_contains':
          return !val.includes((f.value || '').toLowerCase());
        case 'equals':
          return val === (f.value || '').toLowerCase();
        case 'not_equals':
          return val !== (f.value || '').toLowerCase();
        case 'not_empty':
          return val.length > 0;
        case 'empty':
          return val.length === 0;
        case 'greater_than':
          return prop?.type === 'number' ? Number(rawVal) > Number(f.value) : false;
        case 'less_than':
          return prop?.type === 'number' ? Number(rawVal) < Number(f.value) : false;
        case 'date_before':
          return prop?.type === 'date' && rawVal ? new Date(rawVal) < new Date(f.value) : false;
        case 'date_after':
          return prop?.type === 'date' && rawVal ? new Date(rawVal) > new Date(f.value) : false;
        case 'is_checked':
          return rawVal === true;
        case 'is_unchecked':
          return rawVal !== true;
        default:
          return true;
      }
    });
  }

  return result;
}

/**
 * Apply sorts to rows.
 * @param {Array} rows - Database rows
 * @param {Array} sorts - [{ propertyId, direction: 'asc'|'desc' }]
 * @param {Array} schema - Property definitions
 * @returns {Array} Sorted rows
 */
export function applySorts(rows, sorts, schema) {
  if (!sorts || sorts.length === 0) return rows;

  const sorted = [...rows];
  sorted.sort((a, b) => {
    for (const s of sorts) {
      if (!s.propertyId) continue;
      const prop = schema.find(p => p.id === s.propertyId);
      const aVal = a.values[s.propertyId];
      const bVal = b.values[s.propertyId];

      let cmp = 0;
      if (prop?.type === 'number') {
        cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
      } else if (prop?.type === 'date') {
        cmp = (new Date(aVal || 0)).getTime() - (new Date(bVal || 0)).getTime();
      } else if (prop?.type === 'checkbox') {
        cmp = (aVal === true ? 1 : 0) - (bVal === true ? 1 : 0);
      } else {
        cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, { numeric: true });
      }

      if (cmp !== 0) return s.direction === 'desc' ? -cmp : cmp;
    }
    return 0;
  });

  return sorted;
}

/**
 * Group rows by a property value.
 * @param {Array} rows - Database rows
 * @param {string} propertyId - Property to group by
 * @param {Array} schema - Property definitions
 * @returns {Map<string, Array>} Grouped rows
 */
export function applyGroupBy(rows, propertyId, schema) {
  if (!propertyId) return new Map([['All', rows]]);

  const prop = schema.find(p => p.id === propertyId);
  const groups = new Map();

  // For select properties, pre-populate with configured options
  if (prop?.type === 'select' && prop?.config?.options) {
    for (const opt of prop.config.options) {
      groups.set(opt.name || opt.value || opt, []);
    }
    groups.set('No Value', []);
  }

  for (const row of rows) {
    const val = row.values[propertyId];
    const key = val !== undefined && val !== null && val !== '' ? String(val) : 'No Value';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  return groups;
}

// ─── Reactive Query Engine (Computed Selectors Layer) ────────────────

/**
 * Creates a memoized selector with dependency graphing.
 * Prevents expensive O(N) operations from running on every store update.
 */
function createSelector(cacheKey, inputSelectors, computeFn) {
  let lastDeps = null;
  let lastResult = null;
  
  return (state) => {
    const deps = inputSelectors.map(sel => sel(state));
    
    let depsChanged = false;
    if (!lastDeps || lastDeps.length !== deps.length) {
      depsChanged = true;
    } else {
      for (let i = 0; i < deps.length; i++) {
        if (lastDeps[i] !== deps[i]) {
          depsChanged = true;
          break;
        }
      }
    }
    
    if (depsChanged) {
      lastResult = computeFn(...deps);
      lastDeps = deps;
    }
    
    return lastResult;
  };
}

// Global caches to persist selector instances across hook calls
const selectorCaches = {
  visibleBlocks: new Map(),
  filteredRows: new Map(),
  backlinks: new Map(),
};

/**
 * Custom shallow equality for arrays to prevent React tree rerenders
 * when the array items are strictly equal.
 */
function shallowArrayEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * 1. useVisibleBlocks
 * Memoized selector for blocks belonging to a page.
 * Avoids O(N) traversal unless blockOrder or blockMap changes.
 */
export function useVisibleBlocks(pageId) {
  if (!selectorCaches.visibleBlocks.has(pageId)) {
    const selector = createSelector(
      `visibleBlocks_${pageId}`,
      [
        state => state.blockOrder,
        state => state.blockMap
      ],
      (blockOrder, blockMap) => {
        return blockOrder.map(id => blockMap[id]).filter(b => b && b.pageId === pageId);
      }
    );
    selectorCaches.visibleBlocks.set(pageId, selector);
  }
  
  const selector = selectorCaches.visibleBlocks.get(pageId);
  return useBlockStore(selector, shallowArrayEqual);
}

/**
 * 2. useFilteredDatabaseRows
 * Recomputes filters and sorts only when rows, schema, or queries change.
 * Huge unlock for database views.
 */
export function useFilteredDatabaseRows(blockId, filters = [], sorts = []) {
  // To avoid useDatabaseStore re-evaluating getDatabaseData constantly,
  // we select just the primitive references we need.
  const cacheKey = `${blockId}_${JSON.stringify(filters)}_${JSON.stringify(sorts)}`;
  
  if (!selectorCaches.filteredRows.has(cacheKey)) {
    const selector = createSelector(
      `filteredRows_${cacheKey}`,
      [
        state => state.getDatabaseData(blockId).rows,
        state => state.getDatabaseData(blockId).schema
      ],
      (rows, schema) => {
        if (!rows || !schema) return [];
        let result = applyFilters(rows, filters, schema);
        result = applySorts(result, sorts, schema);
        return result;
      }
    );
    selectorCaches.filteredRows.set(cacheKey, selector);
  }
  
  const selector = selectorCaches.filteredRows.get(cacheKey);
  const rows = useDatabaseStore(selector, shallowArrayEqual);
  
  return rows;
}

/**
 * 3. useBacklinks
 * Reactive graph lookup without recalculating the graph.
 */
export function useBacklinks(blockId) {
  if (!selectorCaches.backlinks.has(blockId)) {
    const selector = createSelector(
      `backlinks_${blockId}`,
      [
        state => state.backwardLinks[blockId],
        state => state.backlinkDetails[blockId]
      ],
      (links, details) => ({
        links: links || [],
        details: details || []
      })
    );
    selectorCaches.backlinks.set(blockId, selector);
  }
  
  const selector = selectorCaches.backlinks.get(blockId);
  return useBacklinkStore(selector, (a, b) => 
    shallowArrayEqual(a.links, b.links) && shallowArrayEqual(a.details, b.details)
  );
}

/**
 * 4. useMentionReferences
 * Derived cache for blocks mentioning the current block.
 */
export function useMentionReferences(blockId) {
  // Uses backlinkStore's forwardLinks to find where this block is mentioned.
  return useBacklinkStore(state => {
    const details = state.backlinkDetails[blockId] || [];
    return details;
  }, shallowArrayEqual);
}
