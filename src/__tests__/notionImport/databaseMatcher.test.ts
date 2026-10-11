import { describe, it, expect } from 'vitest';
import { matchDatabases } from '../../features/notion-import/matching/databaseMatcher.js';
import { createDiagnostics } from '../../features/notion-import/diagnostics/diagnostics.js';

describe('databaseMatcher', () => {
  it('groups companion _all.csv and primary CSV into single logical database', () => {
    const indexEntries = [
      {
        id: 'd3df7b36495182dfb0d8014512d331ec',
        rawId: 'id::d3df7b36-4951-82df-b0d8-014512d331ec',
        title: 'People',
        rawTitle: 'People',
        path: '',
        parentId: null,
        type: 'database',
        isInline: false,
        childIds: [],
      },
    ];

    const csvPaths = [
      'Private & Shared/People d3df7b36495182dfb0d8014512d331ec.csv',
      'Private & Shared/People d3df7b36495182dfb0d8014512d331ec_all.csv',
    ];

    const diagnostics = createDiagnostics();
    const dbs = matchDatabases(indexEntries, csvPaths, diagnostics);

    expect(dbs).toHaveLength(1);
    expect(dbs[0].title).toBe('People');
    expect(dbs[0].primaryCsvPath).toBe('Private & Shared/People d3df7b36495182dfb0d8014512d331ec_all.csv');
    expect(dbs[0].companionCsvPath).toBe('Private & Shared/People d3df7b36495182dfb0d8014512d331ec.csv');
  });

  it('handles databases where only _all.csv was exported', () => {
    const indexEntries = [];
    const csvPaths = [
      'Movies 22af7b36495181969fb9dbd8f3a34930_all.csv',
    ];

    const diagnostics = createDiagnostics();
    const dbs = matchDatabases(indexEntries, csvPaths, diagnostics);

    expect(dbs).toHaveLength(1);
    expect(dbs[0].title).toBe('Movies');
    expect(dbs[0].primaryCsvPath).toBe('Movies 22af7b36495181969fb9dbd8f3a34930_all.csv');
  });
});
