import { describe, it, expect, beforeEach } from 'vitest';
import '../core/commandHandlers'; // registers all handlers
import { commandBus } from '../core/commandBus';
import { useBlockStore } from '../stores/blockStore';
import { usePageStore } from '../stores/pageStore';

describe('Command Bus & Command Handlers Pipeline', () => {
  beforeEach(() => {
    commandBus.clearHistory();
    useBlockStore.setState({
      blockMap: {},
      blockOrder: [],
      activePageId: null,
      focusBlockId: null
    });
    usePageStore.setState({
      pages: [],
      archivedPages: [],
      currentPageId: null
    });
  });

  describe('Block Commands', () => {
    it('dispatches block/create: creates block optimistically with canonical fields and records undo', async () => {
      const createdBlock = await commandBus.dispatch({
        type: 'block/create',
        payload: {
          id: 'test-block-1',
          pageId: 'page-100',
          type: 'text',
          content: 'Hello World'
        }
      });

      expect(createdBlock).toBeDefined();
      expect(createdBlock.id).toBe('test-block-1');
      expect(createdBlock.version).toBe(1);
      expect(createdBlock.sortOrder).toBeDefined();
      expect(createdBlock.orderKey).toBe(createdBlock.sortOrder);

      // Verify optimistic store projection
      const store = useBlockStore.getState();
      expect(store.blockMap['test-block-1']).toBeDefined();
      expect(store.blockMap['test-block-1'].content).toBe('Hello World');
      expect(store.blockOrder).toContain('test-block-1');

      // Verify undo stack
      expect(commandBus.canUndo()).toBe(true);
      expect(commandBus.getUndoStack()).toHaveLength(1);
    });

    it('dispatches block/update: increments version monotonically and updates updatedLogical', async () => {
      // 1. Create initial block
      await commandBus.dispatch({
        type: 'block/create',
        payload: {
          id: 'b-update-1',
          pageId: 'p-1',
          type: 'text',
          content: 'Initial text'
        }
      });

      const initialBlock = useBlockStore.getState().blockMap['b-update-1'];
      expect(initialBlock.version).toBe(1);

      // 2. Dispatch update
      await commandBus.dispatch({
        type: 'block/update',
        payload: {
          blockId: 'b-update-1',
          updates: {
            content: 'Updated content'
          }
        }
      });

      const updatedBlock = useBlockStore.getState().blockMap['b-update-1'];
      expect(updatedBlock.content).toBe('Updated content');
      expect(updatedBlock.version).toBe(2);
      expect(updatedBlock.updatedLogical).toBeGreaterThanOrEqual(initialBlock.updatedLogical);
    });

    it('dispatches block/delete and successfully undoes and redoes the deletion', async () => {
      await commandBus.dispatch({
        type: 'block/create',
        payload: {
          id: 'b-del-1',
          pageId: 'p-1',
          type: 'todo',
          content: 'Finish sprint'
        }
      });

      expect(useBlockStore.getState().blockMap['b-del-1']).toBeDefined();

      // Delete
      await commandBus.dispatch({
        type: 'block/delete',
        payload: { blockId: 'b-del-1' }
      });

      expect(useBlockStore.getState().blockMap['b-del-1']).toBeUndefined();
      expect(useBlockStore.getState().blockOrder).not.toContain('b-del-1');

      // Undo deletion
      await commandBus.undo();
      expect(useBlockStore.getState().blockMap['b-del-1']).toBeDefined();
      expect(useBlockStore.getState().blockMap['b-del-1'].content).toBe('Finish sprint');
      expect(useBlockStore.getState().blockOrder).toContain('b-del-1');

      // Redo deletion
      await commandBus.redo();
      expect(useBlockStore.getState().blockMap['b-del-1']).toBeUndefined();
    });
  });

  describe('Page Commands', () => {
    it('dispatches page/create: creates page optimistically and updates store', async () => {
      await commandBus.dispatch({
        type: 'page/create',
        payload: {
          id: 'page-project-1',
          title: 'Project Roadmap',
          icon: '🗺️'
        }
      });

      const pages = usePageStore.getState().pages;
      expect(pages).toHaveLength(1);
      expect(pages[0].id).toBe('page-project-1');
      expect(pages[0].title).toBe('Project Roadmap');
      expect(pages[0].icon).toBe('🗺️');
      expect(pages[0].version).toBe(1);
      expect(pages[0].orderKey).toBe(pages[0].sortOrder);
    });

    it('dispatches page/update: updates title, icon, and version', async () => {
      await commandBus.dispatch({
        type: 'page/create',
        payload: {
          id: 'p-upd-1',
          title: 'Initial Title'
        }
      });

      await commandBus.dispatch({
        type: 'page/update',
        payload: {
          id: 'p-upd-1',
          updates: {
            title: 'Refined Title',
            icon: '✨'
          }
        }
      });

      const page = usePageStore.getState().pages.find(p => p.id === 'p-upd-1');
      expect(page.title).toBe('Refined Title');
      expect(page.icon).toBe('✨');
      expect(page.version).toBe(2);
    });

    it('dispatches page/archive and page/restore with full undo/redo cycle', async () => {
      await commandBus.dispatch({
        type: 'page/create',
        payload: { id: 'p-arch-1', title: 'Old Draft' }
      });

      expect(usePageStore.getState().pages.some(p => p.id === 'p-arch-1')).toBe(true);
      expect(usePageStore.getState().archivedPages.some(p => p.id === 'p-arch-1')).toBe(false);

      // Archive
      await commandBus.dispatch({
        type: 'page/archive',
        payload: { id: 'p-arch-1' }
      });

      expect(usePageStore.getState().pages.some(p => p.id === 'p-arch-1')).toBe(false);
      expect(usePageStore.getState().archivedPages.some(p => p.id === 'p-arch-1')).toBe(true);

      // Restore
      await commandBus.dispatch({
        type: 'page/restore',
        payload: { id: 'p-arch-1' }
      });

      expect(usePageStore.getState().pages.some(p => p.id === 'p-arch-1')).toBe(true);
      expect(usePageStore.getState().archivedPages.some(p => p.id === 'p-arch-1')).toBe(false);

      // Undo restore -> should be back in archivedPages
      await commandBus.undo();
      expect(usePageStore.getState().pages.some(p => p.id === 'p-arch-1')).toBe(false);
      expect(usePageStore.getState().archivedPages.some(p => p.id === 'p-arch-1')).toBe(true);
    });
  });
});
