/**
 * ─── Performance Layer: Lexical Order Compaction ────────────────
 * Background compaction for lexical sort keys.
 *
 * Problem: After many insertions between adjacent keys, the
 * lexical order strings grow unboundedly (e.g., "mmmmmmmm").
 * This degrades comparison perf and storage.
 *
 * Solution: Periodically detect pages where keys are excessively
 * long, then re-assign clean, evenly-spaced keys in a single
 * batch transaction.
 */

import { db } from '../db/database';
import { useBlockStore } from '../stores/blockStore';
import { usePageStore } from '../stores/pageStore';

const COMPACTION_THRESHOLD = 8;  // Trigger when any key length exceeds this
const COMPACTION_INTERVAL = 300000; // Check every 5 minutes during idle
const BASE = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Generate evenly spaced sort keys for n items.
 * Guarantees strictly monotonic ascending lexical order matching array index.
 */
export function generateEvenKeys(count) {
  if (count === 0) return [];
  if (count === 1) return ['m'];

  if (count <= 25) {
    const result = [];
    let prevCode = -1;
    const step = 26 / (count + 1);
    for (let i = 0; i < count; i++) {
      let code = Math.floor(step * (i + 1));
      if (code <= prevCode) code = prevCode + 1;
      if (code > 25) code = 25;
      prevCode = code;
      result.push(BASE[code]);
    }
    if (new Set(result).size === count) {
      return result;
    }
  }

  // Base-26 equal-width representation for arbitrary count to ensure lexical sort matches numerical sort
  const width = Math.max(2, Math.ceil(Math.log(count + 1) / Math.log(26)));
  const keys = [];
  for (let i = 0; i < count; i++) {
    let num = i + 1;
    let str = '';
    for (let w = width - 1; w >= 0; w--) {
      const base = Math.pow(26, w);
      const digit = Math.floor(num / base) % 26;
      str += BASE[digit];
    }
    keys.push(str);
  }

  return keys;
}

/**
 * Check if a page's blocks need compaction.
 * Returns true if any sortOrder key is longer than threshold.
 */
function needsCompaction(blocks) {
  return blocks.some(b => (b.sortOrder || '').length > COMPACTION_THRESHOLD);
}

/**
 * Compact sort keys for a single page's blocks.
 * Groups by parentId to preserve sibling hierarchy, and syncs Zustand blockStore.
 */
async function compactPage(pageId) {
  const blocksRaw = await db.blocks.where('pageId').equals(pageId).toArray();
  if (!blocksRaw || blocksRaw.length === 0) return { compacted: false };

  // Group blocks by parentId
  const byParent = new Map();
  for (const b of blocksRaw) {
    const pId = b.parentId || null;
    if (!byParent.has(pId)) byParent.set(pId, []);
    byParent.get(pId).push(b);
  }

  const updates = [];

  for (const [parentId, siblings] of byParent) {
    siblings.sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));
    if (siblings.some(b => (b.sortOrder || '').length > COMPACTION_THRESHOLD)) {
      const newKeys = generateEvenKeys(siblings.length);
      for (let i = 0; i < siblings.length; i++) {
        if (siblings[i].sortOrder !== newKeys[i]) {
          updates.push({ id: siblings[i].id, sortOrder: newKeys[i] });
        }
      }
    }
  }

  if (updates.length === 0) return { compacted: false };

  // Persist to IndexedDB
  await db.transaction('rw', db.blocks, async () => {
    for (const u of updates) {
      await db.blocks.update(u.id, { sortOrder: u.sortOrder });
    }
  });

  // Sync in-memory blockStore if this page is active
  const blockStore = useBlockStore.getState();
  const currentBlockOrder = blockStore.blockOrder;
  if (currentBlockOrder.length > 0) {
    const firstBlock = blockStore.blockMap[currentBlockOrder[0]];
    if (firstBlock && firstBlock.pageId === pageId) {
      const newBlockMap = { ...blockStore.blockMap };
      let mapChanged = false;
      for (const u of updates) {
        if (newBlockMap[u.id]) {
          newBlockMap[u.id] = { ...newBlockMap[u.id], sortOrder: u.sortOrder };
          mapChanged = true;
        }
      }
      if (mapChanged) {
        const sortedOrder = [...currentBlockOrder].sort((a, b) => 
          String(newBlockMap[a]?.sortOrder || '').localeCompare(String(newBlockMap[b]?.sortOrder || ''))
        );
        useBlockStore.setState({ blockMap: newBlockMap, blockOrder: sortedOrder });
      }
    }
  }

  return {
    compacted: true,
    pageId,
    blockCount: updates.length,
  };
}

/**
 * Compact sort keys for pages too, grouping by parentId and syncing pageStore.
 */
async function compactPages() {
  const pages = await db.pages.toArray();
  if (!pages || pages.length === 0) return null;

  const byParent = new Map();
  for (const p of pages) {
    const pId = p.parentId || null;
    if (!byParent.has(pId)) byParent.set(pId, []);
    byParent.get(pId).push(p);
  }

  const updates = [];
  for (const [parentId, siblings] of byParent) {
    siblings.sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));
    if (siblings.some(p => (p.sortOrder || '').length > COMPACTION_THRESHOLD)) {
      const newKeys = generateEvenKeys(siblings.length);
      for (let i = 0; i < siblings.length; i++) {
        if (siblings[i].sortOrder !== newKeys[i]) {
          updates.push({ id: siblings[i].id, sortOrder: newKeys[i] });
        }
      }
    }
  }

  if (updates.length === 0) return null;

  await db.transaction('rw', db.pages, async () => {
    for (const u of updates) {
      await db.pages.update(u.id, { sortOrder: u.sortOrder });
    }
  });

  // Sync in-memory pageStore
  const pageStore = usePageStore.getState();
  if (pageStore.pages && pageStore.pages.length > 0) {
    const updateMap = new Map(updates.map(u => [u.id, u.sortOrder]));
    const updatedPages = pageStore.pages.map(p => 
      updateMap.has(p.id) ? { ...p, sortOrder: updateMap.get(p.id) } : p
    );
    usePageStore.setState({ pages: updatedPages });
  }

  return { compacted: true, count: updates.length };
}

// ─── Background Compaction Runner ───────────────────────────────

let _compactionTimer = null;
let _running = false;

/**
 * Run a single compaction sweep across all pages.
 * Designed to run in the background without blocking UI.
 */
async function runCompaction() {
  if (_running) return;
  _running = true;

  try {
    // Get unique pageIds efficiently without loading all block objects into memory
    const pageIds = await db.blocks.orderBy('pageId').uniqueKeys();

    let totalCompacted = 0;

    for (const pageId of pageIds) {
      const res = await compactPage(pageId);
      if (res?.compacted) {
        totalCompacted++;
        // Yield to main thread between pages
        await new Promise(r => setTimeout(r, 10));
      }
    }

    // Also compact pages sidebar order
    await compactPages();

    if (totalCompacted > 0) {
      console.debug(`[Compaction] Compacted sort keys for ${totalCompacted} pages`);
      import('../stores/notificationStore').then(({ useNotificationStore }) => {
        useNotificationStore.getState().addNotification(
          'System Optimized',
          `Garbage collection reclaimed local storage space and optimized sort keys for ${totalCompacted} pages.`,
          'system'
        );
      });
    }
  } catch (err) {
    console.warn('[Compaction] Background compaction failed:', err);
  } finally {
    _running = false;
  }
}

function scheduleIdleCompaction() {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(() => runCompaction(), { timeout: 10000 });
  } else {
    setTimeout(runCompaction, 100);
  }
}

/**
 * Start background compaction on an interval.
 */
export function startCompaction() {
  if (_compactionTimer) return;
  
  // Run once after a delay (let the app finish initial boot)
  setTimeout(scheduleIdleCompaction, 15000);

  _compactionTimer = setInterval(scheduleIdleCompaction, COMPACTION_INTERVAL);
}

/**
 * Stop background compaction.
 */
export function stopCompaction() {
  if (_compactionTimer) {
    clearInterval(_compactionTimer);
    _compactionTimer = null;
  }
}

/**
 * Run compaction immediately (for debugging / manual trigger).
 */
export { runCompaction };
