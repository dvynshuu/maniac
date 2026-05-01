/**
 * ─── Performance Layer: Virtualized Block Rendering ─────────────
 * Renders only visible blocks using IntersectionObserver.
 * For pages with 50+ blocks, invisible blocks are replaced
 * with lightweight placeholder divs that preserve layout height.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const OVERSCAN = 3; // Extra blocks above/below viewport to render
const PLACEHOLDER_HEIGHT = 32; // Default estimated block height in px

/**
 * Hook that tracks which block IDs are "near viewport" and should render.
 * Returns a Set of block IDs that should be fully rendered.
 *
 * @param {string[]} blockIds - All block IDs in order
 * @param {number} threshold - Min blocks before virtualization kicks in
 * @returns {{ visibleSet: Set<string>, measureRef: (id: string) => (el: HTMLElement) => void, containerRef: React.RefObject }}
 */
export function useVirtualizedBlocks(blockIds, { threshold = 40 } = {}) {
  const [visibleSet, setVisibleSet] = useState(() => new Set(blockIds));
  const heightCache = useRef(new Map()); // blockId → measured height
  const observerRef = useRef(null);
  const elementsRef = useRef(new Map()); // blockId → element
  const isActiveRef = useRef(false);
  const containerRef = useRef(null);

  // Only activate virtualization above threshold
  const shouldVirtualize = blockIds.length > threshold;

  useEffect(() => {
    if (!shouldVirtualize) {
      setVisibleSet(new Set(blockIds));
      return;
    }

    isActiveRef.current = true;

    // Cleanup old observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const visible = new Set();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let changed = false;
        for (const entry of entries) {
          const id = entry.target.dataset.blockId;
          if (!id) continue;

          if (entry.isIntersecting) {
            if (!visible.has(id)) {
              visible.add(id);
              changed = true;
            }
          } else {
            // Cache height before hiding
            if (visible.has(id)) {
              const rect = entry.target.getBoundingClientRect();
              if (rect.height > 0) {
                heightCache.current.set(id, rect.height);
              }
              visible.delete(id);
              changed = true;
            }
          }
        }

        if (changed) {
          // Add overscan blocks
          const overscanSet = new Set(visible);
          const arr = blockIds;
          for (const id of visible) {
            const idx = arr.indexOf(id);
            for (let o = 1; o <= OVERSCAN; o++) {
              if (idx - o >= 0) overscanSet.add(arr[idx - o]);
              if (idx + o < arr.length) overscanSet.add(arr[idx + o]);
            }
          }
          setVisibleSet(overscanSet);
        }
      },
      {
        root: null, // viewport
        rootMargin: '200px 0px', // pre-load 200px above/below viewport
        threshold: 0,
      }
    );

    // Observe all registered elements
    for (const [, el] of elementsRef.current) {
      if (el) observerRef.current.observe(el);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      isActiveRef.current = false;
    };
  }, [blockIds, shouldVirtualize]);

  /**
   * Returns a ref callback for each block wrapper.
   * Usage: <div ref={measureRef(blockId)} data-block-id={blockId}>
   */
  const measureRef = useCallback((blockId) => (el) => {
    if (el) {
      elementsRef.current.set(blockId, el);
      if (observerRef.current && isActiveRef.current) {
        observerRef.current.observe(el);
      }
    } else {
      const prev = elementsRef.current.get(blockId);
      if (prev && observerRef.current) {
        observerRef.current.unobserve(prev);
      }
      elementsRef.current.delete(blockId);
    }
  }, []);

  /**
   * Get placeholder height for a hidden block.
   */
  const getPlaceholderHeight = useCallback((blockId) => {
    return heightCache.current.get(blockId) || PLACEHOLDER_HEIGHT;
  }, []);

  return {
    visibleSet,
    measureRef,
    getPlaceholderHeight,
    containerRef,
    isVirtualized: shouldVirtualize,
  };
}
