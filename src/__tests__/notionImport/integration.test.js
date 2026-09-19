import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import { runNotionImportPipeline } from '../../features/notion-import/pipeline.js';
import { db } from '../../db/database.js';

describe('Notion Importer Full Integration (Real Notion Export ZIP)', () => {
  const zipPath = 'C:\\Downloads\\IMP\\Notion data\\Export-91edeb0a-e69c-4022-b974-d64c4970e8fd-Part-1.zip';

  beforeEach(async () => {
    await db.pages.clear();
    await db.blocks.clear();
    await db.database_rows.clear();
    await db.database_cells.clear();
    await db.blobs.clear();
  });

  it('imports the real Notion export ZIP losslessly with deterministic idempotency', async () => {
    if (!fs.existsSync(zipPath)) {
      console.warn('Real export zip not found at path; skipping integration test.');
      return;
    }

    const zipBuffer = fs.readFileSync(zipPath);

    // ─── First Import ───────────────────────────────────────────────
    console.log('Starting first import...');
    const progressEvents = [];
    const result1 = await runNotionImportPipeline(zipBuffer, (evt) => {
      progressEvents.push(evt.phase);
    });
    console.log('First import finished in stats:', result1.stats);

    expect(result1.success).toBe(true);
    expect(progressEvents).toContain('extracting');
    expect(progressEvents).toContain('writing');
    expect(progressEvents).toContain('complete');

    // ─── Target Metrics Verification ────────────────────────────────
    // Target: ~570 pages
    expect(result1.stats.pagesCount).toBeGreaterThanOrEqual(560);
    expect(result1.stats.pagesCount).toBeLessThanOrEqual(580);

    // Target: ~59-63 logical databases
    expect(result1.stats.databasesCount).toBeGreaterThanOrEqual(58);
    expect(result1.stats.databasesCount).toBeLessThanOrEqual(65);

    // Target: ~550-555 database rows
    expect(result1.stats.rowsCount).toBeGreaterThanOrEqual(540);
    expect(result1.stats.rowsCount).toBeLessThanOrEqual(560);

    // Target: 5 assets
    expect(result1.stats.assetsCount).toBe(5);

    // ─── Dexie Database State Verification ──────────────────────────
    console.log('Checking Dexie counts...');
    const dexiePages = await db.pages.toArray();
    console.log('dexiePages read:', dexiePages.length);
    const dexieRows = await db.database_rows.toArray();
    console.log('dexieRows read:', dexieRows.length);
    const dexieBlobs = await db.blobs.toArray();
    console.log('dexieBlobs read:', dexieBlobs.length);
    const dexieCellsCount = await db.database_cells.count();
    console.log('dexieCells count:', dexieCellsCount);

    const dexieBlocksCount = await db.blocks.count();
    console.log('dexieBlocks count:', dexieBlocksCount);

    expect(dexiePages.length).toBe(result1.stats.pagesCount);
    expect(dexieRows.length).toBe(result1.stats.rowsCount);
    expect(dexieBlobs.length).toBe(5);
    expect(dexieCellsCount).toBeGreaterThan(2000);

    // ─── Row Page Isolation Check ───────────────────────────────────
    // Database rows must NOT pollute the top-level page tree
    const rowPages = dexiePages.filter(p => p.isDatabaseRow);
    expect(rowPages.length).toBeGreaterThan(0);
    for (const rp of rowPages) {
      expect(rp.databaseBlockId).toBeTruthy();
      expect(rp.databaseBlockId.startsWith('ni-d-')).toBe(true);
    }

    const topLevelPages = dexiePages.filter(p => !p.parentId && !p.isDatabaseRow);
    // Root spaces: Private & Shared, Divyanshu singh's Notion HQ, and unindexed Untitled
    expect(topLevelPages.length).toBeGreaterThanOrEqual(2);
    expect(topLevelPages.length).toBeLessThanOrEqual(5);

    // ─── Re-Import Idempotency Test ─────────────────────────────────
    console.log('Starting re-import idempotency test...');
    // Re-importing must NOT create duplicates (same deterministic IDs)
    const result2 = await runNotionImportPipeline(zipBuffer);
    expect(result2.success).toBe(true);

    const dexiePagesAfter = await db.pages.toArray();
    const dexieBlocksAfterCount = await db.blocks.count();
    const dexieRowsAfter = await db.database_rows.toArray();
    const dexieBlobsAfter = await db.blobs.toArray();

    console.log('Re-import finished, checking counts...');
    expect(dexiePagesAfter.length).toBe(dexiePages.length);
    expect(dexieBlocksAfterCount).toBe(dexieBlocksCount);
    expect(dexieRowsAfter.length).toBe(dexieRows.length);
    expect(dexieBlobsAfter.length).toBe(dexieBlobs.length);
  }, 240000); // 4 minute timeout for processing 10MB zip twice in fake-indexeddb
});
