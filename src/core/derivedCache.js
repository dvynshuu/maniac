/**
 * ─── Performance Layer: Derived Data Cache ──────────────────────
 * Cache invalidation strategy for heavy derived data.
 *
 * Memoizes expensive computations (e.g., database row filtering,
 * backlink graph traversal, search index) with automatic
 * invalidation based on Zustand store version tracking.
 *
 * Each cache entry tracks which store slices it depends on.
 * When a store updates, only the affected cache entries invalidate.
 */

const _caches = new Map();
const _storeVersions = new Map(); // storeId → monotonic version counter

/**
 * Increment a store's version. Call this from store mutations.
 * @param {string} storeId - e.g., 'blockStore', 'pageStore'
 */
export function invalidateStore(storeId) {
  const current = _storeVersions.get(storeId) || 0;
  _storeVersions.set(storeId, current + 1);
}

/**
 * Create a cached computation.
 *
 * @param {string} cacheId - Unique ID for this cache entry
 * @param {string[]} dependsOn - Store IDs this computation depends on
 * @param {Function} computeFn - () => result. Expensive function to cache.
 * @param {object} options
 * @param {number} options.maxAge - Max cache age in ms (default: Infinity)
 * @param {number} options.maxSize - For collection caches, max items to keep
 * @returns {Function} () => cachedResult
 */
export function createDerivedCache(cacheId, dependsOn, computeFn, options = {}) {
  const { maxAge = Infinity } = options;

  _caches.set(cacheId, {
    value: undefined,
    depVersions: {},
    computedAt: 0,
    dependsOn,
    computeFn,
    maxAge,
  });

  return function getCachedValue(...args) {
    const entry = _caches.get(cacheId);
    if (!entry) return computeFn(...args);

    // Check if any dependency has changed
    let isValid = entry.value !== undefined;

    if (isValid) {
      for (const storeId of entry.dependsOn) {
        const currentVersion = _storeVersions.get(storeId) || 0;
        if (currentVersion !== (entry.depVersions[storeId] || 0)) {
          isValid = false;
          break;
        }
      }
    }

    // Check max age
    if (isValid && maxAge !== Infinity) {
      if (Date.now() - entry.computedAt > maxAge) {
        isValid = false;
      }
    }

    if (!isValid) {
      // Recompute
      entry.value = computeFn(...args);
      entry.computedAt = Date.now();
      for (const storeId of entry.dependsOn) {
        entry.depVersions[storeId] = _storeVersions.get(storeId) || 0;
      }
    }

    return entry.value;
  };
}

/**
 * Manually invalidate a specific cache entry.
 */
export function invalidateCache(cacheId) {
  const entry = _caches.get(cacheId);
  if (entry) {
    entry.value = undefined;
    entry.computedAt = 0;
  }
}

/**
 * Clear all caches.
 */
export function clearAllCaches() {
  for (const [, entry] of _caches) {
    entry.value = undefined;
    entry.computedAt = 0;
  }
}

/**
 * Get cache diagnostics.
 */
export function getCacheStats() {
  const stats = {};
  for (const [id, entry] of _caches) {
    stats[id] = {
      hasValue: entry.value !== undefined,
      computedAt: entry.computedAt,
      age: entry.computedAt ? Date.now() - entry.computedAt : null,
      dependsOn: entry.dependsOn,
    };
  }
  return stats;
}

// ─── React Hook ─────────────────────────────────────────────────

import { useMemo, useRef } from 'react';

/**
 * React hook for derived cache with automatic invalidation.
 *
 * @param {string} cacheId
 * @param {string[]} dependsOn
 * @param {Function} computeFn
 * @param {Array} deps - React dependency array for recomputation
 * @param {object} options
 */
export function useDerivedCache(cacheId, dependsOn, computeFn, deps = [], options = {}) {
  const cachedFn = useMemo(
    () => createDerivedCache(cacheId, dependsOn, computeFn, options),
    [cacheId] // Stable — don't recreate on every render
  );

  return useMemo(() => cachedFn(), deps);
}
