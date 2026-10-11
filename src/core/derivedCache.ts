/**
 * ─── Performance Layer: Derived Data Cache ──────────────────────
 * Cache invalidation strategy for heavy derived data.
 */

import { useMemo } from 'react';

export interface CacheEntry {
  value: any;
  depVersions: Record<string, number>;
  computedAt: number;
  dependsOn: string[];
  computeFn: (...args: any[]) => any;
  maxAge: number;
}

export interface DerivedCacheOptions {
  maxAge?: number;
  maxSize?: number;
}

const _caches = new Map<string, CacheEntry>();
const _storeVersions = new Map<string, number>();

export function invalidateStore(storeId: string): void {
  const current = _storeVersions.get(storeId) || 0;
  _storeVersions.set(storeId, current + 1);
}

export function createDerivedCache<T>(
  cacheId: string,
  dependsOn: string[],
  computeFn: (...args: any[]) => T,
  options: DerivedCacheOptions = {}
): (...args: any[]) => T {
  const { maxAge = Infinity } = options;

  _caches.set(cacheId, {
    value: undefined,
    depVersions: {},
    computedAt: 0,
    dependsOn,
    computeFn,
    maxAge,
  });

  return function getCachedValue(...args: any[]): T {
    const entry = _caches.get(cacheId);
    if (!entry) return computeFn(...args);

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

    if (isValid && maxAge !== Infinity) {
      if (Date.now() - entry.computedAt > maxAge) {
        isValid = false;
      }
    }

    if (!isValid) {
      entry.value = computeFn(...args);
      entry.computedAt = Date.now();
      for (const storeId of entry.dependsOn) {
        entry.depVersions[storeId] = _storeVersions.get(storeId) || 0;
      }
    }

    return entry.value;
  };
}

export function invalidateCache(cacheId: string): void {
  const entry = _caches.get(cacheId);
  if (entry) {
    entry.value = undefined;
    entry.computedAt = 0;
  }
}

export function clearAllCaches(): void {
  for (const [, entry] of _caches) {
    entry.value = undefined;
    entry.computedAt = 0;
  }
}

export function getCacheStats(): Record<string, any> {
  const stats: Record<string, any> = {};
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

export function useDerivedCache<T>(
  cacheId: string,
  dependsOn: string[],
  computeFn: () => T,
  deps: any[] = [],
  options: DerivedCacheOptions = {}
): T {
  const cachedFn = useMemo(
    () => createDerivedCache(cacheId, dependsOn, computeFn, options),
    [cacheId]
  );

  return useMemo(() => cachedFn(), deps);
}
