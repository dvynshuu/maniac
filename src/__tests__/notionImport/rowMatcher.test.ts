import { describe, it, expect } from 'vitest';
import { matchDatabaseRows } from '../../features/notion-import/matching/rowMatcher.js';
import { createDiagnostics } from '../../features/notion-import/diagnostics/diagnostics.js';

describe('rowMatcher', () => {
  it('matches CSV rows to child pages by title and generates deterministic row IDs', () => {
    const db = {
      id: 'ni-d-1234567890123456',
      notionUUID: '22af7b36495181499801c2721620bf06',
      title: 'Web Series',
      childRowEntries: [
        {
          id: 'child1_uuid',
          title: 'The Witcher',
          path: 'Web Series/The Witcher.md',
        },
        {
          id: 'child2_uuid',
          title: 'The Last of Us',
          path: 'Web Series/The Last of Us.md',
        },
      ],
    };

    const schema = [
      { id: 'prop_0_name', name: 'Name', type: 'text' },
      { id: 'prop_1_rating', name: 'Rating', type: 'number' },
    ];

    const csvRows = [
      { prop_0_name: 'The Witcher', prop_1_rating: 9 },
      { prop_0_name: 'The Last of Us', prop_1_rating: 10 },
      { prop_0_name: 'Game of Thrones', prop_1_rating: 8 },
    ];

    const diagnostics = createDiagnostics();
    const rows = matchDatabaseRows(db, csvRows, schema, diagnostics);

    expect(rows).toHaveLength(3);
    expect(rows[0].title).toBe('The Witcher');
    expect(rows[0].pageNotionUUID).toBe('child1_uuid');
    expect(rows[1].title).toBe('The Last of Us');
    expect(rows[1].pageNotionUUID).toBe('child2_uuid');
    expect(rows[2].title).toBe('Game of Thrones');
    expect(rows[2].pageNotionUUID).toBeNull();

    // Verify row IDs are 21 chars and deterministic
    expect(rows[0].id).toHaveLength(21);
    expect(rows[0].id.startsWith('ni-r-')).toBe(true);
  });

  it('synthesizes rows for child pages that have no corresponding CSV row', () => {
    const db = {
      id: 'ni-d-1234567890123456',
      notionUUID: '22af7b36495181499801c2721620bf06',
      title: 'Empty DB',
      childRowEntries: [
        {
          id: 'orphan_row_uuid',
          title: 'Orphan Page Row',
          path: 'Empty DB/Orphan Page Row.md',
        },
      ],
    };

    const diagnostics = createDiagnostics();
    const rows = matchDatabaseRows(db, [], [], diagnostics);

    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Orphan Page Row');
    expect(rows[0].pageNotionUUID).toBe('orphan_row_uuid');
  });
});
