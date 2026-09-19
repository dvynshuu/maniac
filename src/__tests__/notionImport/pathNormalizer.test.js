import { describe, it, expect } from 'vitest';
import {
  normalizePath,
  extractNotionUUID,
  cleanNotionTitle,
  isAllCompanionCsv,
  getPrimaryCsvPath,
  normalizePropertyName,
} from '../../features/notion-import/normalization/pathNormalizer';

describe('pathNormalizer', () => {
  describe('normalizePath', () => {
    it('normalizes backslashes to forward slashes', () => {
      expect(normalizePath('folder\\subfolder\\file.md')).toBe('folder/subfolder/file.md');
    });

    it('removes leading ./ or /', () => {
      expect(normalizePath('./Private & Shared/file.md')).toBe('Private & Shared/file.md');
      expect(normalizePath('/Private & Shared/file.md')).toBe('Private & Shared/file.md');
    });

    it('decodes URL-encoded characters and HTML entities', () => {
      expect(normalizePath('Private%20&amp;%20Shared/Letter%20to%20Papa.md')).toBe('Private & Shared/Letter to Papa.md');
    });

    it('handles relative segments safely', () => {
      expect(normalizePath('Private & Shared/../Root.md')).toBe('Root.md');
    });

    it('handles empty or non-string input safely', () => {
      expect(normalizePath('')).toBe('');
      expect(normalizePath(null)).toBe('');
      expect(normalizePath(undefined)).toBe('');
    });
  });

  describe('extractNotionUUID', () => {
    it('extracts hyphenated UUIDs from HTML id attributes', () => {
      expect(extractNotionUUID('id::22af7b36-4951-8149-9801-c2721620bf06')).toBe('22af7b36495181499801c2721620bf06');
    });

    it('extracts compact 32-char hex UUIDs from filenames', () => {
      expect(extractNotionUUID('Letter to Papa 11df7b36495180a3a070f0ee5e8a3f87.md')).toBe('11df7b36495180a3a070f0ee5e8a3f87');
    });

    it('extracts UUID from _all.csv companion filenames', () => {
      expect(extractNotionUUID('People d3df7b36495182dfb0d8014512d331ec_all.csv')).toBe('d3df7b36495182dfb0d8014512d331ec');
    });

    it('extracts short dashed IDs as fallback', () => {
      expect(extractNotionUUID('Untitled ed4f-694a.md')).toBe('ed4f-694a');
    });
  });

  describe('cleanNotionTitle', () => {
    it('strips extension and Notion 32-hex UUID from title', () => {
      expect(cleanNotionTitle('Letter to Papa 11df7b36495180a3a070f0ee5e8a3f87.md')).toBe('Letter to Papa');
    });

    it('strips _all suffix and UUID from database CSV names', () => {
      expect(cleanNotionTitle('People d3df7b36495182dfb0d8014512d331ec_all.csv')).toBe('People');
    });

    it('strips (Inline database) marker if present', () => {
      expect(cleanNotionTitle('🎥 Web Series 22af7b36495181499801c2721620bf06 (Inline database)')).toBe('🎥 Web Series');
    });

    it('handles short dashed filenames', () => {
      expect(cleanNotionTitle('Untitled ed4f-694a.md')).toBe('Untitled');
    });
  });

  describe('isAllCompanionCsv and getPrimaryCsvPath', () => {
    it('detects _all.csv companion files correctly', () => {
      expect(isAllCompanionCsv('test_all.csv')).toBe(true);
      expect(isAllCompanionCsv('test.csv')).toBe(false);
      expect(isAllCompanionCsv('all.csv')).toBe(false);
    });

    it('returns primary counterpart path for _all.csv files', () => {
      expect(getPrimaryCsvPath('dir/db 1234_all.csv')).toBe('dir/db 1234.csv');
    });
  });

  describe('normalizePropertyName', () => {
    it('normalizes property names for case and character insensitive comparisons', () => {
      expect(normalizePropertyName('Created Time')).toBe('createdtime');
      expect(normalizePropertyName('Status (Done?)')).toBe('statusdone');
    });
  });
});
