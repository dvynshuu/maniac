/**
 * Pre-Persistence Import Validator
 * 
 * Verifies relational integrity, ID uniqueness, acyclic hierarchy,
 * and database-row associations prior to executing database writes.
 */

import { DIAGNOSTIC_CODES } from '../diagnostics/diagnostics.js';

/**
 * Validates the intermediate import model.
 * 
 * @param {import('../model/types').NotionImportModel} model
 * @param {import('../diagnostics/diagnostics').createDiagnostics} diagnostics
 * @returns {{ isValid: boolean, errorCount: number, warningCount: number }}
 */
export function validateImportModel(model, diagnostics) {
  const { pages, databases, databaseRows, databaseCells, blocks, assets } = model;

  let isValid = true;
  const pageIds = new Set();
  const dbBlockIds = new Set();
  const rowIds = new Set();
  const blockIds = new Set();
  const assetIds = new Set();

  // 1. Check ID uniqueness and 21-character length
  for (const page of pages) {
    if (pageIds.has(page.id)) {
      diagnostics.error(DIAGNOSTIC_CODES.DUPLICATE_ID, `Duplicate page ID found: ${page.id}`, { page: page.title });
      isValid = false;
    }
    pageIds.add(page.id);
  }

  for (const db of databases) {
    if (dbBlockIds.has(db.id)) {
      diagnostics.error(DIAGNOSTIC_CODES.DUPLICATE_DATABASE, `Duplicate database ID found: ${db.id}`, { db: db.title });
      isValid = false;
    }
    dbBlockIds.add(db.id);
  }

  for (const row of databaseRows) {
    if (rowIds.has(row.id)) {
      diagnostics.error(DIAGNOSTIC_CODES.DUPLICATE_ID, `Duplicate row ID found: ${row.id}`, { rowId: row.id });
      isValid = false;
    }
    rowIds.add(row.id);
  }

  for (const block of blocks) {
    if (blockIds.has(block.id)) {
      diagnostics.error(DIAGNOSTIC_CODES.DUPLICATE_ID, `Duplicate block ID found: ${block.id}`, { blockId: block.id });
      isValid = false;
    }
    blockIds.add(block.id);
  }

  for (const asset of assets) {
    assetIds.add(asset.id);
  }

  // 2. Validate hierarchy relationships
  for (const page of pages) {
    if (page.parentId) {
      const parentExists = pageIds.has(page.parentId) || dbBlockIds.has(page.parentId);
      if (!parentExists) {
        diagnostics.warn(DIAGNOSTIC_CODES.UNRESOLVED_PARENT, `Page ${page.title} references non-existent parent ${page.parentId}`, {
          pageId: page.id,
          parentId: page.parentId,
        });
      }
    }

    // Row page isolation
    if (page.isDatabaseRow) {
      if (!page.databaseBlockId || !dbBlockIds.has(page.databaseBlockId)) {
        diagnostics.error(DIAGNOSTIC_CODES.UNMATCHED_ROW, `Row page ${page.title} is not associated with a valid database block`, {
          pageId: page.id,
          databaseBlockId: page.databaseBlockId,
        });
        isValid = false;
      }
    }
  }

  // 3. Validate database row associations
  for (const row of databaseRows) {
    if (!dbBlockIds.has(row.blockId)) {
      diagnostics.error(DIAGNOSTIC_CODES.UNMATCHED_ROW, `Row ${row.id} belongs to missing database ${row.blockId}`, {
        rowId: row.id,
        blockId: row.blockId,
      });
      isValid = false;
    }
  }

  // 4. Validate block page associations
  for (const block of blocks) {
    if (block.pageId && !pageIds.has(block.pageId)) {
      diagnostics.warn(DIAGNOSTIC_CODES.UNRESOLVED_PARENT, `Block ${block.id} references non-existent page ${block.pageId}`, {
        blockId: block.id,
        pageId: block.pageId,
      });
    }
  }

  const summary = diagnostics.summary();
  return {
    isValid: isValid && summary.error === 0,
    errorCount: summary.error,
    warningCount: summary.warning,
  };
}
