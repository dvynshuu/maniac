import { describe, it, expect } from 'vitest';
import { validateImportModel } from '../../features/notion-import/validation/importValidator.js';
import { createDiagnostics } from '../../features/notion-import/diagnostics/diagnostics.js';

describe('importValidator', () => {
  it('passes on clean relational models', () => {
    const model = {
      pages: [
        { id: 'ni-p-page1', parentId: null, isDatabaseRow: false, title: 'Root' },
        { id: 'ni-p-page2', parentId: 'ni-p-page1', isDatabaseRow: false, title: 'Child' },
      ],
      databases: [
        { id: 'ni-d-db1', parentPageId: 'ni-p-page1', title: 'DB' },
      ],
      databaseRows: [
        { id: 'ni-r-row1', blockId: 'ni-d-db1', title: 'Row 1' },
      ],
      databaseCells: [],
      blocks: [
        { id: 'ni-b-b1', pageId: 'ni-p-page1', type: 'text' },
      ],
      assets: [],
    };

    const diagnostics = createDiagnostics();
    const result = validateImportModel(model, diagnostics);

    expect(result.isValid).toBe(true);
    expect(result.errorCount).toBe(0);
  });

  it('detects duplicate IDs and marks model invalid', () => {
    const model = {
      pages: [
        { id: 'ni-p-duplicate', parentId: null, isDatabaseRow: false, title: 'Page A' },
        { id: 'ni-p-duplicate', parentId: null, isDatabaseRow: false, title: 'Page B' },
      ],
      databases: [],
      databaseRows: [],
      databaseCells: [],
      blocks: [],
      assets: [],
    };

    const diagnostics = createDiagnostics();
    const result = validateImportModel(model, diagnostics);

    expect(result.isValid).toBe(false);
    expect(result.errorCount).toBeGreaterThan(0);
  });
});
