import { describe, it, expect } from 'vitest';
import { parseNotionIndex } from '../../features/notion-import/parser/indexParser';

describe('indexParser', () => {
  it('parses nested pages and assigns correct parent relationships', () => {
    const sampleHtml = `
      <ul id="id::workspace-root">
        <li><h3>Workspace details:</h3><p>Identifier: root</p></li>
        <li>
          <ul id="id::parent-folder">
            <a>Parent Folder</a>
            <li>
              <ul id="id::11df7b36-4951-80a3-a070-f0ee5e8a3f87">
                <a href="Parent%20Folder/Child%20Page%2011df7b36495180a3a070f0ee5e8a3f87.md">Child Page</a>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    `;

    const entries = parseNotionIndex(sampleHtml);
    expect(entries.length).toBeGreaterThanOrEqual(2);

    const child = entries.find(e => e.id === '11df7b36495180a3a070f0ee5e8a3f87');
    expect(child).toBeDefined();
    expect(child.title).toBe('Child Page');
    expect(child.path).toBe('Parent Folder/Child Page 11df7b36495180a3a070f0ee5e8a3f87.md');
    expect(child.parentId).toBe('parent-folder');
  });

  it('detects inline databases and pairs with parent page', () => {
    const sampleHtml = `
      <ul id="id::workspace-root">
        <li>
          <ul id="id::22af7b36-4951-806c-9733-c0f1b1311c1b">
            <a href="Anime%2022af7b364951806c9733c0f1b1311c1b.md">Anime</a>
            <li>
              <ul id="id::22af7b36-4951-8149-9801-c2721620bf06">
                <a>Web Series 22af7b36495181499801c2721620bf06 (Inline database)</a>
                <li>
                  <ul id="id::22af7b36-4951-810d-8d7b-f13a1b2859b8">
                    <a href="Anime/Web%20Series/Witcher%2022af7b364951810d8d7bf13a1b2859b8.md">Witcher</a>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    `;

    const entries = parseNotionIndex(sampleHtml);
    const dbEntry = entries.find(e => e.id === '22af7b36495181499801c2721620bf06');
    expect(dbEntry).toBeDefined();
    expect(dbEntry.isInline).toBe(true);
    expect(dbEntry.type).toBe('database');
    expect(dbEntry.parentId).toBe('22af7b364951806c9733c0f1b1311c1b');

    const rowEntry = entries.find(e => e.id === '22af7b364951810d8d7bf13a1b2859b8');
    expect(rowEntry).toBeDefined();
    expect(rowEntry.parentId).toBe('22af7b36495181499801c2721620bf06');
  });
});
