/**
 * Master Notion Import Pipeline Orchestrator
 * 
 * Coordinates the full multi-phase import process:
 * extraction -> index parsing -> database detection -> schema & row matching
 * -> hierarchy building -> content block parsing -> asset extraction & resolution
 * -> pre-persistence validation -> atomic persistence -> diagnostics reporting.
 */

import JSZip from 'jszip';
import { normalizePath, extractNotionUUID } from './normalization/pathNormalizer.js';
import { generateExportId } from './normalization/idGenerator.js';
import { parseNotionIndex } from './parser/indexParser.js';
import { parseCsvFile } from './parser/csvParser.js';
import { extractAssets } from './parser/assetParser.js';
import { matchDatabases } from './matching/databaseMatcher.js';
import { matchDatabaseRows } from './matching/rowMatcher.js';
import { buildHierarchy } from './reconstruction/hierarchyBuilder.js';
import { buildDatabaseRecords } from './reconstruction/databaseBuilder.js';
import { buildAllBlocks } from './reconstruction/blockBuilder.js';
import { resolveAssetReferences } from './reconstruction/assetResolver.js';
import { validateImportModel } from './validation/importValidator.js';
import { persistImportModel } from './persistence/importPersistence.js';
import { createDiagnostics, DIAGNOSTIC_CODES } from './diagnostics/diagnostics.js';

const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

export { persistImportModel } from './persistence/importPersistence.js';

/**
 * Runs the end-to-end Notion import pipeline on a user-provided file.
 * 
 * @param {File|Blob|ArrayBuffer} file - The ZIP file
 * @param {(progress: {phase: string, percent: number, detail: string}) => void} [onProgress]
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<{
 *   success: boolean,
 *   exportId: string,
 *   model?: import('./model/types').NotionImportModel,
 *   stats: {
 *     pagesCount: number,
 *     databasesCount: number,
 *     rowsCount: number,
 *     cellsCount: number,
 *     blocksCount: number,
 *     assetsCount: number
 *   },
 *   diagnostics: import('./diagnostics/diagnostics').createDiagnostics,
 *   timeMs: number
 * }>}
 */
export async function runNotionImportPipeline(file, onProgress = () => {}, options = {}) {
  const pipelineStart = Date.now();
  const diagnostics = createDiagnostics();

  // ─── Phase 1: Archive Extraction & File Discovery ──────────────────
  onProgress({ phase: 'extracting', percent: 5, detail: 'Loading ZIP archive...' });
  const zip = await JSZip.loadAsync(file);
  const filePaths = Object.keys(zip.files);

  // Detect if archive has a common root folder containing index.html
  let rootPrefix = '';
  for (const rawPath of filePaths) {
    const norm = normalizePath(rawPath);
    if (norm.toLowerCase().endsWith('index.html')) {
      const parts = norm.split('/');
      if (parts.length > 1) {
        rootPrefix = parts.slice(0, -1).join('/') + '/';
      }
      break;
    }
  }

  const stripPrefix = (p) => {
    if (rootPrefix && p.startsWith(rootPrefix)) {
      return p.slice(rootPrefix.length);
    }
    return p;
  };

  const normalizedFilePaths = filePaths
    .filter(p => !zip.files[p].dir)
    .map(p => stripPrefix(normalizePath(p)));

  const exportId = generateExportId(normalizedFilePaths);

  // Categorize files
  let indexHtmlPath = null;
  const mdPaths = [];
  const csvPaths = [];
  const assetPaths = [];

  for (const rawPath of filePaths) {
    const entry = zip.files[rawPath];
    if (entry.dir) continue;

    const norm = stripPrefix(normalizePath(rawPath));
    const lower = norm.toLowerCase();

    if (lower === 'index.html' || lower.endsWith('/index.html')) {
      indexHtmlPath = rawPath;
    } else if (lower.endsWith('.md')) {
      mdPaths.push({ rawPath, normPath: norm });
    } else if (lower.endsWith('.csv')) {
      csvPaths.push({ rawPath, normPath: norm });
    } else if (/\.(png|jpg|jpeg|gif|webp|svg|bmp|ico|pdf)$/i.test(lower)) {
      assetPaths.push({ rawPath, normPath: norm });
    }
  }

  if (!indexHtmlPath && mdPaths.length === 0 && csvPaths.length === 0) {
    throw new Error('Unrecognized Notion export format. Expected index.html or markdown/csv files.');
  }

  await yieldToMain();

  // ─── Phase 2: Index Parsing & Hierarchy Discovery ─────────────────
  onProgress({ phase: 'index_parsing', percent: 15, detail: 'Parsing canonical hierarchy (index.html)...' });
  let indexEntries = [];

  if (indexHtmlPath) {
    const indexHtmlText = await zip.files[indexHtmlPath].async('text');
    indexEntries = parseNotionIndex(indexHtmlText);
  } else {
    diagnostics.warn(DIAGNOSTIC_CODES.MALFORMED_HTML, 'No index.html found. Falling back to filesystem discovery.');
  }

  await yieldToMain();

  // ─── Phase 3: Database Detection & Schema Inference ───────────────
  onProgress({ phase: 'databases', percent: 25, detail: 'Detecting databases and deduplicating CSV companions...' });
  const allCsvNormPaths = csvPaths.map(c => c.normPath);
  const rawDatabases = matchDatabases(indexEntries, allCsvNormPaths, diagnostics);

  const csvMap = new Map(); // normPath -> file text
  for (const { rawPath, normPath } of csvPaths) {
    const text = await zip.files[rawPath].async('text');
    csvMap.set(normPath, text);
  }

  const schemaByDbUuid = new Map();
  const allMatchedRows = [];

  for (const db of rawDatabases) {
    let csvRows = [];
    let schema = [];

    if (db.primaryCsvPath && csvMap.has(db.primaryCsvPath)) {
      const parsed = parseCsvFile(csvMap.get(db.primaryCsvPath), db.id);
      schema = parsed.schema;
      csvRows = parsed.rows;
    } else {
      diagnostics.warn(DIAGNOSTIC_CODES.MISSING_DATABASE_DATA, `Database has no CSV data: ${db.title}`, {
        dbId: db.id,
        uuid: db.notionUUID,
      });
      // Minimal default schema
      schema = [
        { id: `prop_0_title`, name: 'Name', type: 'text', width: 200, config: {} },
      ];
    }

    schemaByDbUuid.set(db.notionUUID, schema);

    // Multi-strategy row matching
    const rows = matchDatabaseRows(db, csvRows, schema, diagnostics);
    allMatchedRows.push(...rows);
  }

  await yieldToMain();

  // ─── Phase 4: Hierarchy Reconstruction ────────────────────────────
  onProgress({ phase: 'hierarchy', percent: 35, detail: 'Reconstructing workspace page tree...' });
  const indexedPaths = new Set(indexEntries.map(e => e.path).filter(Boolean));
  const unindexedMdFiles = mdPaths
    .filter(m => !indexedPaths.has(m.normPath))
    .map(m => m.normPath);

  const pages = buildHierarchy(indexEntries, rawDatabases, allMatchedRows, unindexedMdFiles, diagnostics);

  // Link databases to parent pages where available
  for (const db of rawDatabases) {
    if (db.parentNotionUUID) {
      const parentPage = pages.find(p => p.notionUUID === db.parentNotionUUID);
      if (parentPage) {
        db.parentPageId = parentPage.id;
      }
    }
  }

  await yieldToMain();

  // ─── Phase 5: Content Parsing & Block Building ────────────────────
  onProgress({ phase: 'content', percent: 45, detail: `Parsing markdown content for ${pages.length} pages...` });
  const contentMap = new Map(); // normPath -> markdown text

  for (let i = 0; i < mdPaths.length; i++) {
    const { rawPath, normPath } = mdPaths[i];
    const text = await zip.files[rawPath].async('text');
    contentMap.set(normPath, text);
    if (i % 50 === 0) {
      await yieldToMain();
    }
  }

  const { databaseBlocks, databaseRows, databaseCells } = buildDatabaseRecords(
    rawDatabases,
    allMatchedRows,
    schemaByDbUuid
  );

  const allBlocks = buildAllBlocks(pages, contentMap, databaseBlocks);

  await yieldToMain();

  // ─── Phase 6: Asset Extraction & Resolution ───────────────────────
  onProgress({ phase: 'assets', percent: 55, detail: 'Extracting images and resolving references...' });
  const { assets, assetMap } = await extractAssets(zip, ({ percent, detail }) => {
    onProgress({ phase: 'assets', percent: 55 + Math.round(percent * 0.05), detail });
  }, rootPrefix);

  resolveAssetReferences(allBlocks, pages, assetMap, diagnostics);

  await yieldToMain();

  // ─── Phase 7: Pre-Persistence Model Validation ───────────────────
  onProgress({ phase: 'validating', percent: 62, detail: 'Validating import relational integrity...' });
  const model = {
    exportId,
    pages,
    databases: rawDatabases,
    databaseRows,
    databaseCells,
    blocks: allBlocks,
    assets,
    diagnostics,
    stats: {
      totalPages: pages.length,
      totalDatabases: rawDatabases.length,
      totalRows: databaseRows.length,
      totalCells: databaseCells.length,
      totalBlocks: allBlocks.length,
      totalAssets: assets.length,
    },
  };

  const validationResult = validateImportModel(model, diagnostics);
  if (!validationResult.isValid && validationResult.errorCount > 0) {
    const firstErr = diagnostics.getErrors()[0];
    throw new Error(`Import validation failed: ${firstErr ? firstErr.message : 'Integrity check error'}`);
  }

  await yieldToMain();

  // If dry run is requested, return the validated model and stats without persisting
  if (options.dryRun) {
    onProgress({ phase: 'complete', percent: 100, detail: 'Validation complete, ready to import.' });
    return {
      success: true,
      exportId,
      model,
      stats: {
        pagesCount: pages.length,
        databasesCount: rawDatabases.length,
        rowsCount: databaseRows.length,
        cellsCount: databaseCells.length,
        blocksCount: allBlocks.length,
        assetsCount: assets.length,
      },
      diagnostics,
      timeMs: Date.now() - pipelineStart,
    };
  }

  // ─── Phase 8: Atomic Persistence ──────────────────────────────────
  onProgress({ phase: 'writing', percent: 65, detail: 'Executing atomic database writes...' });
  const persistenceStats = await persistImportModel(model, onProgress);

  // ─── Phase 9: Final Reconciliation & Summary ──────────────────────
  onProgress({ phase: 'complete', percent: 100, detail: 'Import complete!' });

  return {
    success: true,
    exportId,
    stats: {
      pagesCount: persistenceStats.pagesCount,
      databasesCount: rawDatabases.length,
      rowsCount: persistenceStats.rowsCount,
      cellsCount: persistenceStats.cellsCount,
      blocksCount: persistenceStats.blocksCount,
      assetsCount: persistenceStats.blobsCount,
    },
    diagnostics,
    timeMs: Date.now() - pipelineStart,
  };
}
