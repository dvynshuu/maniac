import { describe, it, expect } from 'vitest';
import { createBlock, createPage } from '../utils/helpers';
import {
  normalizeBlock,
  normalizePage,
  validateBlock,
  validatePage,
  isCanonicalBlock,
  isCanonicalPage
} from '../core/model/schemas';

describe('Canonical Data Model & Schemas', () => {
  describe('createBlock factory', () => {
    it('initializes a block with all canonical domain fields', () => {
      const block = createBlock('page-123', 'paragraph', { parentId: 'parent-456' });

      expect(block.id).toBeDefined();
      expect(typeof block.id).toBe('string');
      expect(block.pageId).toBe('page-123');
      expect(block.parentId).toBe('parent-456');
      expect(block.type).toBe('paragraph');
      expect(block.sortOrder).toBe('m');
      expect(block.orderKey).toBe('m');
      expect(block.content).toBe('');
      expect(block.properties).toEqual({});
      expect(block.richText).toEqual([]);
      expect(block.version).toBe(1);
      expect(block.actorId).toBeDefined();
      expect(typeof block.updatedLogical).toBe('number');
      expect(typeof block.createdAt).toBe('number');
      expect(typeof block.updatedAt).toBe('number');
    });

    it('passes canonical block validation', () => {
      const block = createBlock('page-1', 'heading1');
      const validation = validateBlock(block);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(isCanonicalBlock(block)).toBe(true);
    });
  });

  describe('createPage factory', () => {
    it('initializes a page with canonical domain fields', () => {
      const page = createPage({ title: 'Test Page', icon: 'icon-1', parentId: 'parent-page-1' });

      expect(page.id).toBeDefined();
      expect(page.title).toBe('Test Page');
      expect(page.icon).toBe('icon-1');
      expect(page.parentId).toBe('parent-page-1');
      expect(page.sortOrder).toBe('m');
      expect(page.orderKey).toBe('m');
      expect(page.isArchived).toBe(false);
      expect(page.createdAt).toBeDefined();
      expect(page.updatedAt).toBeDefined();
    });

    it('passes canonical page validation', () => {
      const page = createPage({ title: 'Valid Workspace' });
      const validation = validatePage(page);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(isCanonicalPage(page)).toBe(true);
    });
  });

  describe('normalizeBlock', () => {
    it('backfills missing fields on legacy or partial blocks', () => {
      const legacyBlock = {
        id: 'legacy-1',
        pageId: 'page-1',
        type: 'callout',
        content: 'Important notice'
      };

      const normalized = normalizeBlock(legacyBlock);

      expect(normalized.id).toBe('legacy-1');
      expect(normalized.pageId).toBe('page-1');
      expect(normalized.type).toBe('callout');
      expect(normalized.content).toBe('Important notice');
      expect(normalized.properties).toEqual({});
      expect(normalized.sortOrder).toBe('m');
      expect(normalized.orderKey).toBe('m');
      expect(normalized.version).toBe(1);
      expect(normalized.actorId).toBe('local-actor');
      expect(typeof normalized.updatedLogical).toBe('number');
      expect(typeof normalized.createdAt).toBe('number');
      expect(typeof normalized.updatedAt).toBe('number');

      expect(validateBlock(normalized).valid).toBe(true);
    });
  });

  describe('normalizePage', () => {
    it('backfills missing fields on legacy or partial pages', () => {
      const legacyPage = {
        id: 'page-legacy-1',
        title: 'Legacy Project'
      };

      const normalized = normalizePage(legacyPage);

      expect(normalized.id).toBe('page-legacy-1');
      expect(normalized.title).toBe('Legacy Project');
      expect(normalized.icon).toBe('📝');
      expect(normalized.coverImage).toBeNull();
      expect(normalized.parentId).toBeNull();
      expect(normalized.isArchived).toBe(false);
      expect(normalized.sortOrder).toBe('m');
      expect(normalized.orderKey).toBe('m');
      expect(validatePage(normalized).valid).toBe(true);
    });
  });

  describe('validateBlock validation failures', () => {
    it('fails when id is missing or not a string', () => {
      const invalid = { pageId: 'p1', type: 'paragraph', sortOrder: 'm', version: 1 };
      const res = validateBlock(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('fails when pageId is missing', () => {
      const invalid = { id: 'b1', type: 'paragraph', sortOrder: 'm', version: 1 };
      const res = validateBlock(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes('pageId'))).toBe(true);
    });

    it('fails when type is missing', () => {
      const invalid = { id: 'b1', pageId: 'p1', sortOrder: 'm', version: 1 };
      const res = validateBlock(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes('type'))).toBe(true);
    });

    it('fails when version is not a number', () => {
      const invalid = { id: 'b1', pageId: 'p1', type: 'paragraph', sortOrder: 'm', version: 'one' };
      const res = validateBlock(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes('version'))).toBe(true);
    });
  });

  describe('validatePage validation failures', () => {
    it('fails when id is missing', () => {
      const invalid = { title: 'No ID', sortOrder: 'm' };
      const res = validatePage(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('fails when title is missing or not a string', () => {
      const invalid = { id: 'p1', title: 123, sortOrder: 'm' };
      const res = validatePage(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes('title'))).toBe(true);
    });

    it('fails when sortOrder is missing', () => {
      const invalid = { id: 'p1', title: 'Page' };
      const res = validatePage(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.includes('sortOrder'))).toBe(true);
    });
  });
});
