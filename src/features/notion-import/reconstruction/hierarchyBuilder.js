/**
 * Workspace Hierarchy Reconstructor
 * 
 * Rebuilds the complete page tree from index.html hierarchy and database associations.
 * Assigns lexical sort orders, detects cycles, and ensures row pages are isolated.
 */

import { generatePageId } from '../normalization/idGenerator.js';
import { generateLexicalOrder } from '../../../utils/helpers.js';
import { cleanNotionTitle, extractNotionUUID } from '../normalization/pathNormalizer.js';
import { DIAGNOSTIC_CODES } from '../diagnostics/diagnostics.js';

/**
 * Builds the complete hierarchy of Maniac pages.
 * 
 * @param {import('../model/types').NotionIndexEntry[]} indexEntries
 * @param {Array<any>} databases - Matched databases from matchDatabases
 * @param {Array<any>} databaseRows - Matched rows from matchDatabaseRows
 * @param {string[]} unindexedFiles - Any files not in index.html (e.g. Untitled ed4f-694a.md)
 * @param {import('../diagnostics/diagnostics').createDiagnostics} diagnostics
 * @returns {import('../model/types').NotionImportPage[]}
 */
export function buildHierarchy(indexEntries, databases = [], databaseRows = [], unindexedFiles = [], diagnostics) {
  const pages = [];
  const pageIdMap = new Map(); // notionUUID -> pageId
  const rowPageMap = new Map(); // pageNotionUUID -> rowRecord

  // Index row pages
  for (const row of databaseRows) {
    if (row.pageNotionUUID) {
      rowPageMap.set(row.pageNotionUUID, row);
    }
  }

  // 1. First pass: Assign deterministic page IDs for all page entries
  for (const entry of indexEntries) {
    if (entry.type !== 'page') continue;

    const rowRecord = rowPageMap.get(entry.id);
    let pageId;

    if (rowRecord) {
      // In Maniac, row pages use the exact same ID as the database row!
      pageId = rowRecord.id;
    } else {
      pageId = generatePageId(entry.id);
    }

    pageIdMap.set(entry.id, pageId);
  }

  // Also index database IDs into mapping so children can link to database parents
  for (const db of databases) {
    pageIdMap.set(db.notionUUID, db.id);
  }

  // 2. Second pass: Construct pages with resolved parents and metadata
  const siblingsByParent = new Map(); // parentId -> array of pages

  for (const entry of indexEntries) {
    if (entry.type !== 'page') continue;

    const pageId = pageIdMap.get(entry.id);
    const rowRecord = rowPageMap.get(entry.id);

    let resolvedParentId = null;
    let isRowPage = false;
    let databaseBlockId = null;

    if (rowRecord) {
      isRowPage = true;
      databaseBlockId = rowRecord.blockId;
      resolvedParentId = rowRecord.blockId;
    } else if (entry.parentId) {
      resolvedParentId = pageIdMap.get(entry.parentId) || null;
      if (!resolvedParentId && entry.parentId) {
        diagnostics.warn(DIAGNOSTIC_CODES.UNRESOLVED_PARENT, `Could not resolve parent for page: ${entry.title}`, {
          page: entry.title,
          parentId: entry.parentId,
        });
      }
    }

    const pageRecord = {
      id: pageId,
      notionUUID: entry.id,
      parentId: resolvedParentId,
      title: entry.title || 'Untitled',
      icon: isRowPage ? '📄' : (entry.childIds && entry.childIds.length > 0 ? '📁' : '📄'),
      coverImage: null,
      sourcePath: entry.path,
      depth: entry.depth,
      order: entry.order,
      sortIndex: entry.order,
      isDatabaseRow: isRowPage,
      databaseBlockId: databaseBlockId,
      blocks: [],
    };

    pages.push(pageRecord);

    const pKey = resolvedParentId || 'root';
    if (!siblingsByParent.has(pKey)) {
      siblingsByParent.set(pKey, []);
    }
    siblingsByParent.get(pKey).push(pageRecord);
  }

  // 3. Process unindexed files (e.g. Untitled ed4f-694a.md)
  for (const unindexedPath of unindexedFiles) {
    const uuid = extractNotionUUID(unindexedPath) || unindexedPath;
    const pageId = generatePageId(uuid);
    const title = cleanNotionTitle(unindexedPath);

    const pageRecord = {
      id: pageId,
      notionUUID: uuid,
      parentId: null, // Top-level
      title,
      icon: '📄',
      coverImage: null,
      sourcePath: unindexedPath,
      depth: 0,
      order: pages.length,
      sortIndex: pages.length,
      isDatabaseRow: false,
      databaseBlockId: null,
      blocks: [],
    };

    pages.push(pageRecord);
    pageIdMap.set(uuid, pageId);

    diagnostics.info(DIAGNOSTIC_CODES.UNINDEXED_FILE, `Included unindexed root file: ${unindexedPath}`, {
      path: unindexedPath,
    });
  }

  // 4. Assign lexical sort orders among siblings to maintain document order
  for (const [, siblings] of siblingsByParent.entries()) {
    siblings.sort((a, b) => a.order - b.order);
    let prevSort = null;
    for (const sib of siblings) {
      const next = generateLexicalOrder(prevSort, null);
      sib.sortOrder = next;
      sib.orderKey = next;
      prevSort = next;
    }
  }

  // 5. Detect and break any circular parent references
  const visited = new Set();
  for (const page of pages) {
    let curr = page;
    const pathSet = new Set();
    while (curr && curr.parentId) {
      if (pathSet.has(curr.id)) {
        diagnostics.error(DIAGNOSTIC_CODES.HIERARCHY_CYCLE, `Cycle detected at page ${curr.title}; unparenting to root`, {
          pageId: curr.id,
        });
        curr.parentId = null;
        break;
      }
      pathSet.add(curr.id);
      curr = pages.find(p => p.id === curr.parentId);
    }
  }

  return pages;
}
