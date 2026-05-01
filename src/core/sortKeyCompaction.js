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

const COMPACTION_THRESHOLD = 8;  // Trigger when any key length exceeds this
const COMPACTION_INTERVAL = 60000; // Check every 60s
const BASE = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Generate evenly spaced sort keys for n items.
 * Uses a simple scheme: divide the alphabet space into n+1 segments.
 */
function generateEvenKeys(count) {
  if (count === 0) return [];
  if (count === 1) return ['m'];

  const keys = [];
  const step = BASE.length / (count + 1);

  for (let i = 1; i <= count; i++) {
    const pos = Math.floor(step * i);
    const safePos = Math.min(pos, BASE.length - 1);
    let key = BASE[safePos];
    
    // For more than 26 items, add a second character for uniqueness
    if (count > BASE.length - 2) {
      const subStep = BASE.length / (count + 1);
      const subPos = Math.floor((step * i - pos) * BASE.length);
      key += BASE[Math.min(Math.max(subPos, 0), BASE.length - 1)];
    }

    // Ensure uniqueness
    while (keys.includes(key)) {
      key += BASE[Math.floor(Math.random() * BASE.length)];
    }

    keys.push(key);
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
 * Re-assigns clean, evenly-spaced keys while preserving current order.
 */
async function compactPage(pageId) {
  const blocks = await db.blocks.where('pageId').equals(pageId).sortBy('sortOrder');

  if (!needsCompaction(blocks)) return { compacted: false };

  const newKeys = generateEvenKeys(blocks.length);

  // Assign in a single transaction
  await db.transaction('rw', db.blocks, async () => {
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].sortOrder !== newKeys[i]) {
        await db.blocks.update(blocks[i].id, { sortOrder: newKeys[i] });
      }
    }
  });

  return {
    compacted: true,
    pageId,
    blockCount: blocks.length,
    maxOldLength: Math.max(...blocks.map(b => (b.sortOrder || '').length)),
    maxNewLength: Math.max(...newKeys.map(k => k.length)),
  };
}

/**
 * Compact sort keys for pages too.
 */
async function compactPages() {
  const pages = await db.pages.toArray();
  if (!pages.some(p => (p.sortOrder || '').length > COMPACTION_THRESHOLD)) return null;

  const sorted = [...pages].sort((a, b) => 
    String(a.sortOrder || '').localeCompare(String(b.sortOrder || ''))
  );
  const newKeys = generateEvenKeys(sorted.length);

  await db.transaction('rw', db.pages, async () => {
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].sortOrder !== newKeys[i]) {
        await db.pages.update(sorted[i].id, { sortOrder: newKeys[i] });
      }
    }
  });

  return { compacted: true, count: sorted.length };
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
    // Get unique pageIds
    const allBlocks = await db.blocks.toArray();
    const pageIds = [...new Set(allBlocks.map(b => b.pageId))];

    let totalCompacted = 0;

    for (const pageId of pageIds) {
      const pageBlocks = allBlocks.filter(b => b.pageId === pageId);
      if (needsCompaction(pageBlocks)) {
        await compactPage(pageId);
        totalCompacted++;
        // Yield to main thread between pages
        await new Promise(r => setTimeout(r, 10));
      }
    }

    // Also compact pages sidebar order
    await compactPages();

    if (totalCompacted > 0) {
      console.debug(`[Compaction] Compacted sort keys for ${totalCompacted} pages`);
    }
  } catch (err) {
    console.warn('[Compaction] Background compaction failed:', err);
  } finally {
    _running = false;
  }
}

/**
 * Start background compaction on an interval.
 */
export function startCompaction() {
  if (_compactionTimer) return;
  
  // Run once after a delay (let the app finish loading)
  setTimeout(runCompaction, 5000);

  _compactionTimer = setInterval(runCompaction, COMPACTION_INTERVAL);
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
