/**
 * Page Block Content Builder
 * 
 * Parses markdown for each page, embeds inline database blocks in-place,
 * preserves parentId hierarchies, strips row property frontmatter,
 * and builds the complete flat array of blocks.
 */

import { parseMarkdownToBlocks } from '../parser/markdownParser.js';
import { generateBlockId } from '../normalization/idGenerator.js';
import { generateLexicalOrder } from '../../../utils/helpers.js';
import { cleanNotionTitle, normalizePath, extractNotionUUID } from '../normalization/pathNormalizer.js';

/**
 * Builds all blocks for all pages, embedding inline database blocks in-place.
 * 
 * @param {Array<import('../model/types').NotionImportPage>} pages
 * @param {Map<string, string>} contentMap - Map of normalized path -> file content
 * @param {Array<any>} databaseBlocks - Database container blocks
 * @returns {Array<import('../model/types').NotionImportBlock>}
 */
export function buildAllBlocks(pages, contentMap, databaseBlocks = []) {
  const allBlocks = [];

  // Index database blocks for in-place inline resolution
  const dbBlocksById = new Map();
  const dbBlocksByUuid = new Map();
  const dbBlocksByCsvPath = new Map();
  const dbBlocksByParentPageId = new Map();

  for (const dbBlock of databaseBlocks) {
    if (dbBlock.id) dbBlocksById.set(dbBlock.id, dbBlock);
    if (dbBlock.notionUUID) dbBlocksByUuid.set(dbBlock.notionUUID, dbBlock);
    if (dbBlock.primaryCsvPath) dbBlocksByCsvPath.set(normalizePath(dbBlock.primaryCsvPath), dbBlock);
    if (dbBlock.companionCsvPath) dbBlocksByCsvPath.set(normalizePath(dbBlock.companionCsvPath), dbBlock);

    if (dbBlock.pageId) {
      if (!dbBlocksByParentPageId.has(dbBlock.pageId)) {
        dbBlocksByParentPageId.set(dbBlock.pageId, []);
      }
      dbBlocksByParentPageId.get(dbBlock.pageId).push(dbBlock);
    }
  }

  for (const page of pages) {
    const md = page.sourcePath ? contentMap.get(page.sourcePath) : '';
    let pageBlocks = [];

    if (md) {
      pageBlocks = parseMarkdownToBlocks(md, page.id, {
        isDatabaseRow: Boolean(page.isDatabaseRow),
        pageTitle: page.title,
      });
    }

    // Replace database_placeholder blocks in-place with the actual databaseBlock
    const resolvedBlocks = [];
    for (const block of pageBlocks) {
      if (block.type === 'database_placeholder') {
        let matchingDb = null;
        if (block._dbUuid) {
          matchingDb = dbBlocksByUuid.get(block._dbUuid);
        }
        if (!matchingDb && block._csvHref) {
          const decodedHref = decodeURIComponent(block._csvHref);
          const normHref = normalizePath(decodedHref);
          const hrefUuid = extractNotionUUID(normHref);
          if (hrefUuid) {
            matchingDb = dbBlocksByUuid.get(hrefUuid);
          }
          if (!matchingDb) {
            matchingDb = dbBlocksByCsvPath.get(normHref);
          }
        }
        if (!matchingDb && block._dbTitle) {
          const cleanTitle = cleanNotionTitle(block._dbTitle).toLowerCase();
          const pageDbs = dbBlocksByParentPageId.get(page.id) || [];
          matchingDb = pageDbs.find(d => cleanNotionTitle(d.content).toLowerCase() === cleanTitle);
        }

        if (matchingDb) {
          matchingDb.pageId = page.id;
          matchingDb.parentId = block.parentId || null;
          matchingDb.sortOrder = block.sortOrder;
          matchingDb.orderKey = block.sortOrder;
          matchingDb._placed = true;
          resolvedBlocks.push(matchingDb);
        } else {
          // If no matching database is found, keep as a text block link instead of dropping
          resolvedBlocks.push({
            id: block.id,
            pageId: page.id,
            parentId: block.parentId || null,
            type: 'text',
            content: `[${block._dbTitle || block.content}](${block._csvHref || ''})`,
            properties: {},
            sortOrder: block.sortOrder,
            orderKey: block.sortOrder,
            version: '1',
            actorId: 'notion-importer',
            updatedLogical: 1,
            createdAt: block.createdAt || Date.now(),
            updatedAt: block.updatedAt || Date.now(),
            words: 1,
          });
        }
      } else {
        resolvedBlocks.push(block);
      }
    }
    pageBlocks = resolvedBlocks;

    // Append any inline database blocks owned by this page that were NOT placed inline via markdown links
    const inlineDbs = dbBlocksByParentPageId.get(page.id) || [];
    for (const dbBlock of inlineDbs) {
      if (!dbBlock._placed) {
        dbBlock.pageId = page.id;
        dbBlock.sortOrder = generateLexicalOrder(pageBlocks.length > 0 ? pageBlocks[pageBlocks.length - 1].sortOrder : null, null);
        dbBlock.orderKey = dbBlock.sortOrder;
        dbBlock._placed = true;
        pageBlocks.push(dbBlock);
      }
    }

    // Fallback: If a regular page has zero blocks, create an initial empty text block
    // Database rows with no notes/body content are kept empty (pageBlocks = [])
    if (!page.isDatabaseRow && pageBlocks.length === 0) {
      const now = Date.now();
      const sort = generateLexicalOrder(null, null);
      pageBlocks.push({
        id: generateBlockId(page.id, 0, 'text'),
        pageId: page.id,
        parentId: null,
        type: 'text',
        content: '',
        properties: {},
        sortOrder: sort,
        orderKey: sort,
        version: '1',
        actorId: 'notion-importer',
        updatedLogical: 1,
        createdAt: now,
        updatedAt: now,
        words: 0,
      });
    }

    page.blocks = pageBlocks;
    allBlocks.push(...pageBlocks);
  }

  // Any standalone database blocks without a parent page and not yet placed
  for (const dbBlock of databaseBlocks) {
    if (!dbBlock._placed && !dbBlock.pageId) {
      dbBlock._placed = true;
      allBlocks.push(dbBlock);
    }
  }

  return allBlocks;
}
