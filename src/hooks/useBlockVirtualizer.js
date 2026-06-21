/**
 * ─── useBlockVirtualizer ────────────────────────────────────────
 * IntersectionObserver-based block virtualization for PageEditor.
 *
 * Instead of mounting every BlockRenderer with a full TipTap instance,
 * only blocks within (viewport + overscan) are rendered. Offscreen blocks
 * are replaced with lightweight height-preserving placeholders.
 *
 * Key design decisions:
 *  - Single IntersectionObserver per page (not per block) for efficiency
 *  - ResizeObserver caches measured heights so placeholders are accurate
 *  - 200ms unmount delay prevents thrash during fast scrolling
 *  - Focus-pinned blocks bypass virtualization entirely
 *  - useSyncExternalStore pattern for per-block reactivity without context thrash
 */

import { createContext, useContext, useCallback, useEffect, useRef, useMemo, useSyncExternalStore, createElement } from 'react';
import { useBlockStore } from '../stores/blockStore';
import { BLOCK_TYPES } from '../utils/constants';

// ─── Module-level height cache ──────────────────────────────────
const heightCache = new Map();

export function getCachedHeight(blockId) {
  return heightCache.get(blockId) ?? 28;
}

export function setCachedHeight(blockId, height) {
  if (height > 0) heightCache.set(blockId, height);
}

// ─── Virtualizer Context ────────────────────────────────────────
const VirtualizerContext = createContext(null);

export function VirtualizerProvider({ children, value }) {
  return createElement(VirtualizerContext.Provider, { value }, children);
}

export function useVirtualizerContext() {
  return useContext(VirtualizerContext);
}

// ─── Constants ──────────────────────────────────────────────────
const OVERSCAN_PX = 500;
const UNMOUNT_DELAY_MS = 200;
const MIN_BLOCKS_TO_VIRTUALIZE = 20;

// ─── Main Hook ──────────────────────────────────────────────────

export function useBlockVirtualizer(scrollElement, blockIds, pageId) {
  // Subscribers: Set of callbacks to notify on visibility changes
  const subscribersRef = useRef(new Set());

  // The set of blockIds that should be fully rendered
  const renderSetRef = useRef(new Set());

  // Map from DOM element → blockId
  const elementMapRef = useRef(new Map());

  // Pending unmount timers: blockId → timeoutId
  const unmountTimersRef = useRef(new Map());

  // The IntersectionObserver instance
  const observerRef = useRef(null);

  // Force-visible set
  const pinnedRef = useRef(new Set());

  // Track the last pageId we performed a full reset for
  const lastResetPageIdRef = useRef(null);
  
  // Track previous block IDs to detect when the new page's blocks arrive
  const prevBlockIdsRef = useRef(null);

  // Read focusBlockId directly from store via ref (avoids PageEditor re-renders)
  const focusBlockIdRef = useRef(null);
  focusBlockIdRef.current = useBlockStore.getState().focusBlockId;

  const enabled = blockIds.length >= MIN_BLOCKS_TO_VIRTUALIZE;

  /** Notify all subscribers that visibility may have changed */
  const notify = useCallback(() => {
    console.log('[DEBUG] notify called. Subscribers count:', subscribersRef.current.size);
    const subscribers = [...subscribersRef.current];
    for (const cb of subscribers) {
      cb();
    }
  }, []);

  // ── Reset virtualizer state on page navigation ────────────────
  // We only reset the virtualizer when the URL changes AND the new blocks have loaded.
  // This prevents resetting during block insertion/deletion, which would wipe pins.
  useEffect(() => {
    const isDifferentPage = lastResetPageIdRef.current !== pageId;
    const prevIds = prevBlockIdsRef.current;
    const idsChanged = !prevIds || prevIds.length !== blockIds.length || 
      (blockIds.length > 0 && prevIds[0] !== blockIds[0]);

    if (isDifferentPage && idsChanged) {
      lastResetPageIdRef.current = pageId;

      if (enabled) {
        console.log('[DEBUG] Reset virtualizer triggered for page:', pageId);
        // Clear stale state from previous page
        for (const timer of unmountTimersRef.current.values()) {
          clearTimeout(timer);
        }
        unmountTimersRef.current.clear();
        pinnedRef.current.clear();
        elementMapRef.current.clear();

        // Pre-populate renderSet with ALL block IDs (root + children) so every block
        // renders immediately.
        const allBlockIds = useBlockStore.getState().blockOrder;
        renderSetRef.current = new Set(allBlockIds);

        notify();
      }
    }
    prevBlockIdsRef.current = blockIds;
  }, [pageId, blockIds, enabled, notify]);

  // ── Create / recreate observer ────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const root = scrollElement;
    if (!root) return;

    observerRef.current?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        const renderSet = renderSetRef.current;
        let changed = false;

        for (const entry of entries) {
          const blockId = elementMapRef.current.get(entry.target);
          if (!blockId) continue;

          if (entry.isIntersecting) {
            if (!renderSet.has(blockId)) {
              renderSet.add(blockId);
              changed = true;
            }
            const timer = unmountTimersRef.current.get(blockId);
            if (timer) {
              clearTimeout(timer);
              unmountTimersRef.current.delete(blockId);
            }
          } else {
            if (renderSet.has(blockId) && !pinnedRef.current.has(blockId)) {
              if (!unmountTimersRef.current.has(blockId)) {
                const timer = setTimeout(() => {
                  unmountTimersRef.current.delete(blockId);
                  if (renderSet.has(blockId) && blockId !== focusBlockIdRef.current) {
                    renderSet.delete(blockId);
                    notify();
                  }
                }, UNMOUNT_DELAY_MS);
                unmountTimersRef.current.set(blockId, timer);
              }
            }
          }
        }

        if (changed) notify();
      },
      {
        root,
        rootMargin: `${OVERSCAN_PX}px 0px ${OVERSCAN_PX}px 0px`,
        threshold: 0,
      }
    );

    observerRef.current = observer;

    for (const [element] of elementMapRef.current) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [enabled, scrollElement, notify]);

  // ── Cleanup timers on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      for (const timer of unmountTimersRef.current.values()) {
        clearTimeout(timer);
      }
      unmountTimersRef.current.clear();
    };
  }, []);

  // ── Stable API object (never changes reference) ───────────────
  const apiRef = useRef(null);
  if (!apiRef.current) {
    apiRef.current = {
      observe: (element, blockId) => {
        if (!element) return;
        elementMapRef.current.set(element, blockId);
        observerRef.current?.observe(element);
      },
      unobserve: (element) => {
        if (!element) return;
        elementMapRef.current.delete(element);
        observerRef.current?.unobserve(element);
      },
      subscribe: (callback) => {
        subscribersRef.current.add(callback);
        return () => subscribersRef.current.delete(callback);
      },
      getBlockVisible: (blockId) => {
        if (pinnedRef.current.has(blockId)) return true;
        if (blockId === focusBlockIdRef.current) return true;
        return renderSetRef.current.has(blockId);
      },
      pinBlock: (blockId) => {
        pinnedRef.current.add(blockId);
        if (!renderSetRef.current.has(blockId)) {
          renderSetRef.current.add(blockId);
          notify();
        }
      },
      unpinBlock: (blockId) => {
        pinnedRef.current.delete(blockId);
      },
    };
  }

  if (!enabled) return null;
  return apiRef.current;
}

// ─── Per-Block Visibility Hook ──────────────────────────────────
/**
 * Used inside BlockRenderer to subscribe to visibility for one block.
 * Uses useSyncExternalStore for tear-free, concurrent-safe reads.
 *
 * @param {string} blockId
 * @returns {boolean} whether this block should render full content
 */
export function useBlockVisible(blockId) {
  const virtualizer = useVirtualizerContext();

  // Natively check if the block needs pinning to avoid 1-frame unmounts
  const type = useBlockStore(s => s.blockMap[blockId]?.type);
  const needsPinning = type === BLOCK_TYPES.EMBED || 
                       type === BLOCK_TYPES.TRACKER ||
                       type === BLOCK_TYPES.COLUMN_LIST ||
                       type === BLOCK_TYPES.COLUMN;

  const subscribe = useCallback(
    (onStoreChange) => {
      if (!virtualizer) return () => {};
      return virtualizer.subscribe(onStoreChange);
    },
    [virtualizer]
  );

  const getSnapshot = useCallback(() => {
    if (!virtualizer) return true;
    return virtualizer.getBlockVisible(blockId);
  }, [virtualizer, blockId]);

  const isVisible = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return needsPinning || isVisible;
}
