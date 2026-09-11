import { describe, it, expect, beforeEach } from 'vitest';
import { compressSnapshot, decompressSnapshot, cloneSnapshotToWorkspace } from '../utils/shareUtils';
import { db } from '../db/database';

describe('Share Utils (Snapshot Compression & Workspace Cloning)', () => {
  beforeEach(async () => {
    await db.pages.clear();
    await db.blocks.clear();
  });

  it('compresses a snapshot payload and decompresses it back with 100% fidelity', async () => {
    const payload = {
      title: 'Architectural Blueprint',
      icon: '📐',
      coverImage: 'https://example.com/cover.png',
      fullWidth: true,
      blocks: [
        {
          id: 'b1',
          type: 'heading1',
          content: 'System Overview',
          properties: {},
          sortOrder: 'a'
        },
        {
          id: 'b2',
          type: 'text',
          content: 'Local-first architecture with Dexie & Web Crypto 🔒',
          properties: {},
          sortOrder: 'b'
        }
      ]
    };

    const compressed = await compressSnapshot(payload);
    expect(typeof compressed).toBe('string');
    expect(compressed.startsWith('gz:') || compressed.startsWith('raw:')).toBe(true);

    const decompressed = await decompressSnapshot(compressed);
    expect(decompressed).toEqual(payload);
  });

  it('handles empty or malformed strings gracefully', async () => {
    expect(await decompressSnapshot('')).toBeNull();
    expect(await decompressSnapshot(null)).toBeNull();
  });

  it('clones snapshot into local workspace with fresh IDs and canonical fields', async () => {
    const snapshot = {
      title: 'Cloned Project Plan',
      icon: '🚀',
      blocks: [
        { id: 'old-1', type: 'text', content: 'First task', sortOrder: 'a' },
        { id: 'old-2', type: 'todo', content: 'Second task', properties: { checked: true }, sortOrder: 'b' }
      ]
    };

    const clonedPage = await cloneSnapshotToWorkspace(snapshot);

    expect(clonedPage.id).toBeDefined();
    expect(clonedPage.title).toBe('Cloned Project Plan');
    expect(clonedPage.icon).toBe('🚀');
    expect(clonedPage.version).toBe(1);

    // Verify persisted in Dexie
    const dbPage = await db.pages.get(clonedPage.id);
    expect(dbPage).toBeDefined();
    expect(dbPage.title).toBe('Cloned Project Plan');

    const dbBlocks = await db.blocks.where('pageId').equals(clonedPage.id).toArray();
    dbBlocks.sort((a, b) => a.sortOrder.localeCompare(b.sortOrder));
    expect(dbBlocks).toHaveLength(2);
    expect(dbBlocks[0].id).not.toBe('old-1');
    expect(dbBlocks[1].id).not.toBe('old-2');
    expect(dbBlocks[0].content).toBe('First task');
    expect(dbBlocks[1].content).toBe('Second task');
  });
});
