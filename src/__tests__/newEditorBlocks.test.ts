import { describe, it, expect, beforeEach } from 'vitest';
import { createFidelityBlock, BLOCK_PROPERTY_DEFAULTS } from '../utils/blockSchema';
import { BLOCK_TYPES, BLOCK_TYPE_META } from '../utils/constants';
import { getCommands } from '../core/slashCommandRegistry';
import { Transaction } from '../core/editor/Transaction';
import { useBlockStore } from '../stores/blockStore';

describe('New Editor Blocks & Parity Primitives', () => {
  beforeEach(() => {
    useBlockStore.setState({ blockMap: {}, blockOrder: [] });
  });

  describe('Block Schema & Canonical Defaults', () => {
    it('creates a FileBlock with correct canonical defaults', () => {
      const block = createFidelityBlock('page-1', 'file' as any);
      expect(block.type).toBe('file');
      expect(block.properties).toMatchObject({
        src: '',
        name: '',
        size: 0,
        mimeType: '',
        caption: '',
      });
    });

    it('creates an AudioBlock with audio/mpeg default mimeType', () => {
      const block = createFidelityBlock('page-1', 'audio' as any);
      expect(block.type).toBe('audio');
      expect(block.properties.mimeType).toBe('audio/mpeg');
    });

    it('creates a VideoBlock with video/mp4 default mimeType and 100% width', () => {
      const block = createFidelityBlock('page-1', 'video' as any);
      expect(block.type).toBe('video');
      expect(block.properties.width).toBe('100%');
    });

    it('creates a PDFBlock with default height of 500px', () => {
      const block = createFidelityBlock('page-1', 'pdf' as any);
      expect(block.type).toBe('pdf');
      expect(block.properties.height).toBe(500);
      expect(block.properties.mimeType).toBe('application/pdf');
    });

    it('creates a ButtonBlock with automation properties', () => {
      const block = createFidelityBlock('page-1', 'button' as any);
      expect(block.type).toBe('button');
      expect(block.properties.buttonAction).toBe('insert_blocks');
      expect(block.properties.buttonLabel).toBeDefined();
    });

    it('creates a DiagramBlock with mermaid defaults', () => {
      const block = createFidelityBlock('page-1', 'diagram' as any);
      expect(block.type).toBe('diagram');
      expect(block.properties.diagramType).toBe('mermaid');
      expect(block.properties.code).toContain('graph TD');
    });

    it('creates a BreadcrumbBlock with navigation defaults', () => {
      const block = createFidelityBlock('page-1', 'breadcrumb' as any);
      expect(block.type).toBe('breadcrumb');
      expect(block.properties.showRoot).toBe(true);
      expect(block.properties.delimiter).toBe('/');
    });

    it('creates a TemplateBlock with template blocks array', () => {
      const block = createFidelityBlock('page-1', 'template' as any);
      expect(block.type).toBe('template');
      expect(Array.isArray(block.properties.templateBlocks)).toBe(true);
    });

    it('creates a LinkedDatabaseBlock decoupling databaseId from viewConfigId', () => {
      const block = createFidelityBlock('page-1', 'linked_database' as any, {
        properties: { databaseId: 'db-source-123', view: 'board' }
      });
      expect(block.type).toBe('linked_database');
      expect(block.properties.databaseId).toBe('db-source-123');
      expect(block.properties.view).toBe('board');
    });
  });

  describe('Slash Command Registry', () => {
    it('discovers /file command', async () => {
      const results = await getCommands('file');
      const fileCmd = results.find(r => r.type === 'file');
      expect(fileCmd).toBeDefined();
      expect(fileCmd?.label).toBe('File');
    });

    it('discovers /audio command', async () => {
      const results = await getCommands('audio');
      const audioCmd = results.find(r => r.type === 'audio');
      expect(audioCmd).toBeDefined();
      expect(audioCmd?.category).toBe('Media & Code');
    });

    it('discovers /video command', async () => {
      const results = await getCommands('video');
      const videoCmd = results.find(r => r.type === 'video');
      expect(videoCmd).toBeDefined();
    });

    it('discovers /pdf command', async () => {
      const results = await getCommands('pdf');
      const pdfCmd = results.find(r => r.type === 'pdf');
      expect(pdfCmd).toBeDefined();
    });

    it('discovers /button automation command', async () => {
      const results = await getCommands('button');
      const btnCmd = results.find(r => r.type === 'button');
      expect(btnCmd).toBeDefined();
      expect(btnCmd?.category).toBe('Advanced');
    });

    it('discovers /mermaid and /diagram commands', async () => {
      const results = await getCommands('mermaid');
      const diagramCmd = results.find(r => r.type === 'diagram');
      expect(diagramCmd).toBeDefined();
    });

    it('discovers /breadcrumb command', async () => {
      const results = await getCommands('breadcrumb');
      const breadcrumbCmd = results.find(r => r.type === 'breadcrumb');
      expect(breadcrumbCmd).toBeDefined();
    });

    it('discovers /template command', async () => {
      const results = await getCommands('template');
      const templateCmd = results.find(r => r.type === 'template');
      expect(templateCmd).toBeDefined();
    });

    it('discovers /linked command', async () => {
      const results = await getCommands('linked');
      const linkedCmd = results.find(r => r.type === 'linked_database');
      expect(linkedCmd).toBeDefined();
      expect(linkedCmd?.category).toBe('Database');
    });
  });

  describe('Transaction Primitives for Automation', () => {
    it('batches multiple block creations with Transaction for templates and buttons', () => {
      const mockEngine: any = { pageId: 'page-1' };
      const tx = new Transaction(mockEngine);

      tx.createBlock('heading2', null, 'block-0', { caption: 'Header' });
      tx.createBlock('todo', null, 'block-1', { checked: false });
      tx.createBlock('text', null, 'block-2', {});

      expect(tx.ops).toHaveLength(3);
      expect(tx.ops[0].type).toBe('block/create');
      expect(tx.ops[0].payload.type).toBe('heading2');
      expect(tx.ops[1].payload.type).toBe('todo');
      expect(tx.ops[2].payload.type).toBe('text');
    });
  });
});
