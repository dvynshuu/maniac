/**
 * Database Matcher and Companion Deduplicator
 * 
 * Groups primary CSV and _all.csv companions into single logical databases,
 * associates inline databases with parent pages, and guarantees 0 duplicate databases.
 */

import { extractNotionUUID, cleanNotionTitle, isAllCompanionCsv, normalizePath } from '../normalization/pathNormalizer.js';
import { generateDatabaseId } from '../normalization/idGenerator.js';
import { DIAGNOSTIC_CODES } from '../diagnostics/diagnostics.js';

/**
 * Matches index database entries with discovered CSV files on disk.
 * Deduplicates _all.csv companion files into single logical databases.
 * 
 * @param {import('../model/types').NotionIndexEntry[]} indexEntries
 * @param {string[]} csvPaths - Array of normalized ZIP paths to .csv files
 * @param {import('../diagnostics/diagnostics').createDiagnostics} diagnostics
 * @returns {Array<{
 *   notionUUID: string,
 *   id: string,
 *   title: string,
 *   parentNotionUUID: string|null,
 *   primaryCsvPath: string|null,
 *   companionCsvPath: string|null,
 *   isInline: boolean,
 *   childRowEntries: import('../model/types').NotionIndexEntry[]
 * }>}
 */
export function matchDatabases(indexEntries, csvPaths = [], diagnostics) {
  const matchedDbs = new Map(); // notionUUID -> dbRecord

  // Index CSV files by UUID
  const csvByUuid = new Map();
  for (const p of csvPaths) {
    const uuid = extractNotionUUID(p);
    if (uuid) {
      if (!csvByUuid.has(uuid)) {
        csvByUuid.set(uuid, []);
      }
      csvByUuid.get(uuid).push(p);
    }
  }

  // 1. First pass: Register all databases defined in index.html
  for (const entry of indexEntries) {
    if (entry.type !== 'database' && !entry.isInline) continue;

    const uuid = entry.id;
    if (!uuid) continue;

    if (!matchedDbs.has(uuid)) {
      const dbId = generateDatabaseId(uuid);
      matchedDbs.set(uuid, {
        notionUUID: uuid,
        id: dbId,
        title: entry.title || cleanNotionTitle(entry.rawTitle) || 'Untitled Database',
        parentNotionUUID: entry.parentId,
        primaryCsvPath: null,
        companionCsvPath: null,
        isInline: entry.isInline,
        childRowEntries: [],
      });
    }

    // Collect child row pages from index.html if this is an inline database
    if (entry.isInline && entry.childIds && entry.childIds.length > 0) {
      const dbRecord = matchedDbs.get(uuid);
      for (const childId of entry.childIds) {
        const childEntry = indexEntries.find(e => e.id === childId);
        if (childEntry && childEntry.type === 'page') {
          dbRecord.childRowEntries.push(childEntry);
        }
      }
    }
  }

  // 2. Second pass: Associate CSV files with databases and deduplicate _all.csv
  const processedCsvs = new Set();

  for (const csvPath of csvPaths) {
    if (processedCsvs.has(csvPath)) continue;

    const uuid = extractNotionUUID(csvPath);
    if (!uuid) {
      diagnostics.warn(DIAGNOSTIC_CODES.UNKNOWN_PROPERTY_TYPE, `CSV file has no identifiable UUID: ${csvPath}`, { path: csvPath });
      continue;
    }

    const isAll = isAllCompanionCsv(csvPath);
    const relatedCsvs = csvByUuid.get(uuid) || [csvPath];

    // Identify primary vs companion
    let viewCsv = relatedCsvs.find(p => !isAllCompanionCsv(p)) || null;
    let allCsv = relatedCsvs.find(p => isAllCompanionCsv(p)) || null;

    // The authoritative data source containing ALL rows is _all.csv (Notion unfiltered view)
    // If _all.csv is present, it has all rows. Otherwise fallback to the view CSV.
    const authoritative = allCsv || viewCsv;
    const secondary = allCsv && viewCsv ? viewCsv : null;

    // Mark both as processed
    if (viewCsv) processedCsvs.add(viewCsv);
    if (allCsv) processedCsvs.add(allCsv);

    if (allCsv && viewCsv) {
      diagnostics.info(DIAGNOSTIC_CODES.COMPANION_CSV_MERGED, `Merged view CSV: ${viewCsv} into full database ${allCsv}`, {
        primary: allCsv,
        view: viewCsv,
        uuid,
      });
    }

    // If already registered from index.html, attach CSV paths
    if (matchedDbs.has(uuid)) {
      const existing = matchedDbs.get(uuid);
      existing.primaryCsvPath = authoritative;
      existing.companionCsvPath = secondary;
    } else {
      // Database not in index.html (e.g. standalone CSV like People or unindexed DB)
      const dbId = generateDatabaseId(uuid);
      const title = cleanNotionTitle(authoritative || csvPath);

      matchedDbs.set(uuid, {
        notionUUID: uuid,
        id: dbId,
        title,
        parentNotionUUID: null, // to be inferred from folder path
        primaryCsvPath: authoritative,
        companionCsvPath: secondary,
        isInline: false,
        childRowEntries: [],
      });
    }
  }

  // Return deduplicated list of databases
  return Array.from(matchedDbs.values());
}
