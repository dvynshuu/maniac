import { describe, it, expect } from 'vitest';
import {
  sha256,
  generatePageId,
  generateDatabaseId,
  generateRowId,
  generateBlockId,
  generateAssetId,
  generateExportId,
} from '../../features/notion-import/normalization/idGenerator';

describe('idGenerator', () => {
  describe('sha256', () => {
    it('produces known SHA-256 digests', () => {
      // sha256('') = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
      expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
      // sha256('hello') = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
      expect(sha256('hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });
  });

  describe('ID generation length and prefix compliance', () => {
    const uuid = '22af7b36495181499801c2721620bf06';

    it('generates 21-character page IDs with ni-p- prefix', () => {
      const id = generatePageId(uuid);
      expect(id).toHaveLength(21);
      expect(id.startsWith('ni-p-')).toBe(true);
    });

    it('generates 21-character database IDs with ni-d- prefix', () => {
      const id = generateDatabaseId(uuid);
      expect(id).toHaveLength(21);
      expect(id.startsWith('ni-d-')).toBe(true);
    });

    it('generates 21-character row IDs with ni-r- prefix', () => {
      const id = generateRowId(uuid, 0, 'My Row Title');
      expect(id).toHaveLength(21);
      expect(id.startsWith('ni-r-')).toBe(true);
    });

    it('generates 21-character block IDs with ni-b- prefix', () => {
      const id = generateBlockId(uuid, 0, 'heading1');
      expect(id).toHaveLength(21);
      expect(id.startsWith('ni-b-')).toBe(true);
    });

    it('generates 21-character asset IDs with ni-a- prefix', () => {
      const id = generateAssetId('image-hash-123456789');
      expect(id).toHaveLength(21);
      expect(id.startsWith('ni-a-')).toBe(true);
    });
  });

  describe('determinism and isolation', () => {
    const uuid = '22af7b36495181499801c2721620bf06';

    it('produces identical IDs for identical inputs (determinism)', () => {
      expect(generatePageId(uuid)).toBe(generatePageId(uuid));
      expect(generateDatabaseId(uuid)).toBe(generateDatabaseId(uuid));
      expect(generateRowId(uuid, 3, 'title')).toBe(generateRowId(uuid, 3, 'title'));
      expect(generateBlockId(uuid, 2)).toBe(generateBlockId(uuid, 2));
    });

    it('produces distinct IDs across namespaces for the same UUID', () => {
      const pageId = generatePageId(uuid);
      const dbId = generateDatabaseId(uuid);
      const blockId = generateBlockId(uuid, 0);
      expect(pageId).not.toBe(dbId);
      expect(pageId).not.toBe(blockId);
      expect(dbId).not.toBe(blockId);
    });

    it('produces distinct row IDs for different row indexes or fingerprints', () => {
      const r0 = generateRowId(uuid, 0, 'Row A');
      const r1 = generateRowId(uuid, 1, 'Row A');
      const r0b = generateRowId(uuid, 0, 'Row B');
      expect(r0).not.toBe(r1);
      expect(r0).not.toBe(r0b);
    });
  });

  describe('generateExportId', () => {
    it('produces a deterministic hash regardless of file array ordering', () => {
      const files1 = ['a.md', 'b.csv', 'c.png'];
      const files2 = ['c.png', 'a.md', 'b.csv'];
      expect(generateExportId(files1)).toBe(generateExportId(files2));
    });
  });
});
