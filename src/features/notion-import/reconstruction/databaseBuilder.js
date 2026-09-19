/**
 * Database Structure and Persistence Record Builder
 * 
 * Transforms matched databases, schemas, and rows into Maniac:
 * - database blocks (type: 'database', properties: { schema })
 * - database_rows records
 * - database_cells records
 */

import { generateLexicalOrder } from '../../../utils/helpers.js';

/**
 * Builds database blocks, rows, and cells ready for persistence.
 * 
 * @param {Array<any>} databases - Matched databases
 * @param {Array<any>} allRows - Matched database rows
 * @param {Map<string, any>} schemaByDbUuid - Map of database UUID -> schema
 * @returns {{
 *   databaseBlocks: Array<any>,
 *   databaseRows: Array<any>,
 *   databaseCells: Array<any>
 * }}
 */
export function buildDatabaseRecords(databases, allRows, schemaByDbUuid) {
  const databaseBlocks = [];
  const databaseRows = [];
  const databaseCells = [];

  const now = Date.now();

  for (const db of databases) {
    const schema = schemaByDbUuid.get(db.notionUUID) || [];

    // Database block (acts as the container block in Maniac)
    const dbBlock = {
      id: db.id,
      pageId: db.parentPageId,
      parentId: null,
      type: 'database',
      content: db.title,
      notionUUID: db.notionUUID,
      primaryCsvPath: db.primaryCsvPath,
      companionCsvPath: db.companionCsvPath,
      properties: {
        title: db.title,
        schema,
        views: [
          {
            id: `view_${db.id}`,
            name: 'Table',
            type: 'table',
            sort: [],
            filter: [],
          },
        ],
      },
      sortOrder: generateLexicalOrder(null, null),
      orderKey: generateLexicalOrder(null, null),
      version: '1',
      actorId: 'notion-importer',
      updatedLogical: 1,
      createdAt: now,
      updatedAt: now,
      words: 0,
    };

    databaseBlocks.push(dbBlock);

    // Rows belonging to this database
    const dbRows = allRows.filter(r => r.blockId === db.id);

    for (const row of dbRows) {
      // Row record
      databaseRows.push({
        id: row.id,
        blockId: db.id,
        createdAt: row.createdAt || now,
        updatedAt: row.updatedAt || now,
      });

      // Cell records
      for (const prop of schema) {
        const cellValue = row.cells && row.cells[prop.id] !== undefined ? row.cells[prop.id] : '';
        databaseCells.push({
          id: `${row.id}_${prop.id}`,
          rowId: row.id,
          blockId: db.id,
          propertyId: prop.id,
          value: cellValue,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  return { databaseBlocks, databaseRows, databaseCells };
}
