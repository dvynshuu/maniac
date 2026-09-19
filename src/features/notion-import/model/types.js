/**
 * Canonical Data Types for the Notion Import Pipeline
 * 
 * Provides JSDoc type definitions and data structures for intermediate
 * representation (IR) between Notion extraction and Maniac persistence.
 */

/**
 * @typedef {'page' | 'database' | 'asset'} NotionEntryType
 */

/**
 * Raw entry parsed from index.html
 * @typedef {Object} NotionIndexEntry
 * @property {string} id - Notion UUID or synthetic unique ID
 * @property {string} rawId - The original ID attribute from HTML (e.g., 'id::324f7b36...')
 * @property {string} title - Page or database title
 * @property {string} path - Canonical relative file path (e.g. 'Divyanshu/file.md')
 * @property {string|null} parentId - Parent Notion UUID or null if top-level
 * @property {NotionEntryType} type - Entry classification
 * @property {boolean} isInline - Whether index.html flagged this as '(Inline database)'
 * @property {number} order - Original ordinal index in index.html
 * @property {string[]} childIds - Notion UUIDs of child entries
 */

/**
 * Normalized Page Model
 * @typedef {Object} NotionImportPage
 * @property {string} id - Deterministic Maniac ID (ni-p-...)
 * @property {string} notionUUID - Original 32-char hex UUID or fallback
 * @property {string|null} parentId - Deterministic Maniac ID of parent page
 * @property {string} title - Sanitized and normalized title
 * @property {string} icon - Page icon emoji or default
 * @property {string|null} coverImage - Cover image path or URL
 * @property {string} sourcePath - Relative path in ZIP
 * @property {number} depth - Tree depth level (0 = root)
 * @property {number} sortIndex - Lexical or numerical sort order
 * @property {boolean} isDatabaseRow - True if this page is a row record of an inline database
 * @property {string|null} databaseBlockId - Owning database block ID if isDatabaseRow is true
 * @property {Array<NotionImportBlock>} blocks - Parsed content blocks
 */

/**
 * Database Schema Column
 * @typedef {Object} NotionDatabaseColumn
 * @property {string} id - Column ID
 * @property {string} name - Display column name
 * @property {'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'email' | 'phone' | 'created_at' | 'status'} type
 * @property {number} width - Default column pixel width
 * @property {Object} config - Extra type-specific configurations (e.g., options for select)
 */

/**
 * Normalized Database Row
 * @typedef {Object} NotionImportDatabaseRow
 * @property {string} id - Deterministic Maniac row ID (ni-r-...)
 * @property {string} blockId - Owning database block ID (ni-d-...)
 * @property {string|null} pageNotionUUID - Notion UUID of corresponding .md page if row has subpage
 * @property {string} title - Row title or display text
 * @property {Record<string, any>} cells - Map of columnId -> cell value
 * @property {number} rowIndex - Ordinal row index in database
 * @property {number} createdAt - Timestamp
 * @property {number} updatedAt - Timestamp
 */

/**
 * Normalized Database Model
 * @typedef {Object} NotionImportDatabase
 * @property {string} id - Deterministic Maniac database block ID (ni-d-...)
 * @property {string} notionUUID - Notion UUID from CSV filename / index.html
 * @property {string} title - Database display title
 * @property {string|null} parentPageId - Deterministic ID of parent Maniac page
 * @property {string} primaryCsvPath - Path to primary CSV
 * @property {string|null} companionCsvPath - Path to matching _all.csv companion (if present)
 * @property {boolean} isInline - Whether database was defined as inline
 * @property {Array<NotionDatabaseColumn>} schema - Inferred schema columns
 * @property {Array<NotionImportDatabaseRow>} rows - Inferred and matched rows
 */

/**
 * Normalized Asset (Image/Attachment)
 * @typedef {Object} NotionImportAsset
 * @property {string} id - Deterministic Maniac asset ID (ni-a-...)
 * @property {string} originalPath - Path as referenced in Markdown or HTML
 * @property {string} zipPath - Normalized path inside ZIP archive
 * @property {string} hash - SHA-256 checksum of binary data
 * @property {string} mimeType - MIME type (e.g., 'image/png')
 * @property {Blob} blob - Binary content
 * @property {number} size - File size in bytes
 */

/**
 * Normalized Block Model
 * @typedef {Object} NotionImportBlock
 * @property {string} id - Deterministic Maniac block ID (ni-b-...)
 * @property {string} pageId - Owning Maniac page ID
 * @property {string|null} parentId - Parent block ID (for nested toggles/lists)
 * @property {string} type - Block type (heading1, bullet, text, image, database, etc.)
 * @property {string} content - Text content or HTML snippet
 * @property {Object} properties - Type-specific attributes
 * @property {string} sortOrder - Lexical sort key
 * @property {string|null} _imageSrc - Temporary unresolved image link before asset resolution
 */

/**
 * Diagnostic Severity Level
 * @typedef {'info' | 'warning' | 'error'} DiagnosticSeverity
 */

/**
 * Diagnostic Message
 * @typedef {Object} ImportDiagnostic
 * @property {DiagnosticSeverity} severity
 * @property {string} code - Machine-readable error/warning code
 * @property {string} message - Human-readable explanation
 * @property {Record<string, any>} [context] - Contextual metadata for debugging
 */

/**
 * Complete In-Memory Intermediate Representation (IR)
 * @typedef {Object} NotionImportModel
 * @property {string} exportId - Unique hash representing this specific ZIP export
 * @property {Array<NotionImportPage>} pages
 * @property {Array<NotionImportDatabase>} databases
 * @property {Array<NotionImportDatabaseRow>} databaseRows
 * @property {Array<NotionImportAsset>} assets
 * @property {Array<NotionImportBlock>} blocks
 * @property {Array<ImportDiagnostic>} diagnostics
 * @property {Object} stats
 * @property {number} stats.totalPages
 * @property {number} stats.totalDatabases
 * @property {number} stats.totalRows
 * @property {number} stats.totalAssets
 * @property {number} stats.totalBlocks
 */

export const IMPORT_CONSTANTS = {
  PAGE_ID_PREFIX: 'ni-p-',
  DATABASE_ID_PREFIX: 'ni-d-',
  ROW_ID_PREFIX: 'ni-r-',
  BLOCK_ID_PREFIX: 'ni-b-',
  ASSET_ID_PREFIX: 'ni-a-',
  ID_LENGTH: 21,
  WORKSPACE_ID: 'local',
  ACTOR_ID: 'notion-importer',
};
