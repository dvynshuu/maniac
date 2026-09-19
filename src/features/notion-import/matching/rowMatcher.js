/**
 * Multi-strategy Row Matcher
 * 
 * Accurately associates CSV database rows with markdown subpages using:
 * 1. Normalized title matching (scoped to owning database)
 * 2. Ordinal fallback for duplicate "Untitled" rows
 * 3. Synthetic row generation for subpages when CSV is absent
 * 
 * Guarantees that row pages never pollute the top-level page tree.
 */

import { generateRowId } from '../normalization/idGenerator.js';
import { normalizePropertyName } from '../normalization/pathNormalizer.js';
import { DIAGNOSTIC_CODES } from '../diagnostics/diagnostics.js';

/**
 * Matches rows of a database to child markdown pages.
 * 
 * @param {Object} db - Database object from matchDatabases
 * @param {Array<Record<string, any>>} csvRows - Rows parsed from CSV
 * @param {Array<any>} schema - Inferred schema columns
 * @param {import('../diagnostics/diagnostics').createDiagnostics} diagnostics
 * @returns {Array<import('../model/types').NotionImportDatabaseRow>}
 */
export function matchDatabaseRows(db, csvRows = [], schema = [], diagnostics) {
  const matchedRows = [];
  const availablePages = [...(db.childRowEntries || [])];
  const titlePropId = schema[0]?.id;
  const now = Date.now();

  // 1. Process rows from CSV
  for (let rIdx = 0; rIdx < csvRows.length; rIdx++) {
    const rawRow = csvRows[rIdx];
    const rowTitle = titlePropId ? String(rawRow[titlePropId] || '').trim() : '';
    const normTitle = normalizePropertyName(rowTitle);

    let matchedPageEntry = null;

    // Strategy 1: Exact or prefix normalized title match
    if (normTitle) {
      const pageIdx = availablePages.findIndex(p => {
        const pNorm = normalizePropertyName(p.title);
        return pNorm === normTitle ||
               (normTitle.length > 3 && pNorm.startsWith(normTitle)) ||
               (pNorm.length > 3 && normTitle.startsWith(pNorm));
      });

      if (pageIdx !== -1) {
        matchedPageEntry = availablePages[pageIdx];
        availablePages.splice(pageIdx, 1);
      }
    }

    // Strategy 2: If title is 'Untitled' or empty, look for an 'Untitled' subpage
    if (!matchedPageEntry && (!normTitle || normTitle === 'untitled')) {
      const pageIdx = availablePages.findIndex(p => {
        const pNorm = normalizePropertyName(p.title);
        return !pNorm || pNorm === 'untitled';
      });
      if (pageIdx !== -1) {
        matchedPageEntry = availablePages[pageIdx];
        availablePages.splice(pageIdx, 1);
      }
    }

    // Generate deterministic row ID
    const rowId = generateRowId(db.notionUUID, rIdx, rowTitle);

    matchedRows.push({
      id: rowId,
      blockId: db.id,
      pageNotionUUID: matchedPageEntry ? matchedPageEntry.id : null,
      pageSourcePath: matchedPageEntry ? matchedPageEntry.path : null,
      title: rowTitle || (matchedPageEntry ? matchedPageEntry.title : 'Untitled Row'),
      cells: rawRow,
      rowIndex: rIdx,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 2. Any subpages remaining in availablePages (e.g. rows created in Notion without CSV entry)
  // Synthesize rows for them so they are properly anchored inside this database
  for (let sIdx = 0; sIdx < availablePages.length; sIdx++) {
    const pageEntry = availablePages[sIdx];
    const rowIndex = csvRows.length + sIdx;
    const rowId = generateRowId(db.notionUUID, rowIndex, pageEntry.title);

    const syntheticCells = {};
    if (titlePropId) {
      syntheticCells[titlePropId] = pageEntry.title;
    }

    matchedRows.push({
      id: rowId,
      blockId: db.id,
      pageNotionUUID: pageEntry.id,
      pageSourcePath: pageEntry.path,
      title: pageEntry.title || 'Untitled Row',
      cells: syntheticCells,
      rowIndex,
      createdAt: now,
      updatedAt: now,
    });

    diagnostics.info(DIAGNOSTIC_CODES.AMBIGUOUS_ROW_MATCH, `Synthesized database row for subpage: ${pageEntry.title}`, {
      db: db.title,
      subpage: pageEntry.title,
      path: pageEntry.path,
    });
  }

  return matchedRows;
}
