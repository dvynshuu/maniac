/**
 * ─── Performance Layer: Derived Data Cache ──────────────────────
 * Cache invalidation strategy for heavy derived data.
 */

import { useMemo } from 'react';
import { getPlainText } from '../utils/helpers';
import type { Block } from '../types/block';

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

// ─── Scoped Derived Selectors ──────────────────────────────────

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export const getCachedHeadings = createDerivedCache<TocHeading[]>(
  'toc_headings',
  ['headings'],
  (blockOrder: string[], blockMap: Record<string, Block>) => {
    const list: TocHeading[] = [];
    if (!blockOrder || !blockMap) return list;
    for (const id of blockOrder) {
      const b = blockMap[id];
      if (!b) continue;
      let level = 0;
      if (b.type === 'heading1' || b.type === 'toggle_heading1') level = 1;
      else if (b.type === 'heading2' || b.type === 'toggle_heading2') level = 2;
      else if (b.type === 'heading3' || b.type === 'toggle_heading3') level = 3;

      if (level > 0) {
        const text = getPlainText(b.content || '').trim();
        list.push({
          id: b.id,
          text: text || `Untitled Heading ${level}`,
          level,
        });
      }
    }
    return list;
  }
);

export const getCachedSyncedCounts = createDerivedCache<Record<string, number>>(
  'synced_counts',
  ['synced'],
  (blockOrder: string[], blockMap: Record<string, Block>) => {
    const counts: Record<string, number> = {};
    if (!blockOrder || !blockMap) return counts;
    for (const id of blockOrder) {
      const b = blockMap[id];
      if (!b) continue;
      if (b.type === 'synced_block' || b.type === 'synced_reference') {
        const sid = b.properties?.sourceBlockId || b.id;
        counts[sid] = (counts[sid] || 0) + 1;
      }
    }
    return counts;
  }
);

export function selectHeadings(state: { blockOrder: string[]; blockMap: Record<string, Block> }): TocHeading[] {
  return getCachedHeadings(state.blockOrder, state.blockMap);
}

export function selectSyncedCount(sourceId: string) {
  return (state: { blockOrder: string[]; blockMap: Record<string, Block> }): number => {
    const counts = getCachedSyncedCounts(state.blockOrder, state.blockMap);
    return counts[sourceId] || 1;
  };
}
