/**
 * Atomic Dexie Persistence for Notion Importer
 * 
 * Safely writes pages, blocks, database rows, database cells, and blobs
 * inside an atomic Dexie transaction with chunked streaming to prevent UI lockup.
 */

import { db } from '../../../db/database.js';

const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Writes array items in batches to a Dexie table
 * @param {import('dexie').Table} table
 * @param {Array<any>} items
 * @param {number} [batchSize=200]
 * @param {(progress: {written: number, total: number}) => void} [onProgress]
 */
async function batchBulkPut(table, items, batchSize = 200, onProgress = () => {}) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await table.bulkPut(batch);
    onProgress({ written: Math.min(i + batch.length, items.length), total: items.length });
    await yieldToMain();
  }
}

/**
 * Persists intermediate model into Maniac Dexie database
 * 
 * @param {import('../model/types').NotionImportModel} model
 * @param {(progress: {phase: string, percent: number, detail: string}) => void} onProgress
 * @returns {Promise<{
 *   pagesCount: number,
 *   blocksCount: number,
 *   rowsCount: number,
 *   cellsCount: number,
 *   blobsCount: number,
 *   timeMs: number
 * }>}
 */
export async function persistImportModel(model, onProgress = () => {}) {
  const startTime = Date.now();
  const { pages, blocks, databaseRows, databaseCells, assets } = model;

  const now = Date.now();

  // Prepare pages according to Maniac's v12 schema
  const dbPages = pages.map(p => ({
    id: p.id,
    workspaceId: 'local',
    parentId: p.parentId,
    title: p.title || 'Untitled',
    icon: p.icon || '📄',
    coverImage: p.coverImage || null,
    fullWidth: false,
    sortOrder: p.sortOrder || 'a',
    orderKey: p.orderKey || 'a',
    isArchived: false,
    createdBy: 'notion-importer',
    createdAt: now,
    updatedAt: now,
    lastViewedAt: now,
    version: '1',
    actorId: 'notion-importer',
    updatedLogical: 1,
    ...(p.isDatabaseRow ? { isDatabaseRow: true, databaseBlockId: p.databaseBlockId } : {}),
  }));

  // Prepare blocks according to Maniac's v12 schema
  const dbBlocks = blocks.map(b => ({
    id: b.id,
    pageId: b.pageId,
    parentId: b.parentId || null,
    type: b.type || 'text',
    content: b.content || '',
    properties: b.properties || {},
    richText: b.richText || (b.content ? [{ type: 'text', text: b.content }] : []),
    sortOrder: b.sortOrder || 'a',
    orderKey: b.orderKey || 'a',
    version: b.version || '1',
    actorId: 'notion-importer',
    updatedLogical: 1,
    createdAt: b.createdAt || now,
    updatedAt: b.updatedAt || now,
    words: b.words || 0,
  }));

  // Prepare database rows
  const dbRows = databaseRows.map(r => ({
    id: r.id,
    blockId: r.blockId,
    createdAt: r.createdAt || now,
    updatedAt: r.updatedAt || now,
  }));

  // Prepare database cells
  const dbCells = databaseCells.map(c => ({
    id: c.id,
    rowId: c.rowId,
    blockId: c.blockId,
    propertyId: c.propertyId,
    value: c.value,
    createdAt: c.createdAt || now,
    updatedAt: c.updatedAt || now,
  }));

  // Prepare blobs
  const dbBlobs = assets.map(a => ({
    hash: a.hash,
    blob: a.blob,
    mimeType: a.mimeType,
    size: a.size,
    createdAt: now,
  }));

  // Execute within atomic readwrite transaction
  await db.transaction('rw', [db.pages, db.blocks, db.database_rows, db.database_cells, db.blobs], async () => {
    // 1. Pages
    onProgress({ phase: 'writing', percent: 65, detail: `Writing ${dbPages.length} pages...` });
    await db.pages.bulkPut(dbPages);

    // 2. Blocks
    onProgress({ phase: 'writing', percent: 75, detail: `Writing ${dbBlocks.length} blocks...` });
    await db.blocks.bulkPut(dbBlocks);

    // 3. Database Rows & Cells
    onProgress({ phase: 'writing', percent: 85, detail: `Writing ${dbRows.length} rows and ${dbCells.length} cells...` });
    await db.database_rows.bulkPut(dbRows);
    await db.database_cells.bulkPut(dbCells);

    // 4. Blobs
    if (dbBlobs.length > 0) {
      onProgress({ phase: 'writing', percent: 95, detail: `Writing ${dbBlobs.length} media assets...` });
      await db.blobs.bulkPut(dbBlobs);
    }
  });

  return {
    pagesCount: dbPages.length,
    blocksCount: dbBlocks.length,
    rowsCount: dbRows.length,
    cellsCount: dbCells.length,
    blobsCount: dbBlobs.length,
    timeMs: Date.now() - startTime,
  };
}
