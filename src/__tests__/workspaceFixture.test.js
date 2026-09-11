import { describe, it, expect, beforeEach } from 'vitest';
import '../core/commandHandlers';
import { commandBus } from '../core/commandBus';
import { useBlockStore } from '../stores/blockStore';
import { usePageStore } from '../stores/pageStore';
import { isCanonicalBlock, isCanonicalPage } from '../core/model/schemas';
import { generateLexicalOrder } from '../utils/helpers';
import { db } from '../db/database';

describe('Workspace Fixture & Full Lifecycle Integration', () => {
  beforeEach(async () => {
    commandBus.clearHistory();
    useBlockStore.setState({ blockMap: {}, blockOrder: [] });
    usePageStore.setState({ pages: [], archivedPages: [] });
    await db.pages.clear();
    await db.blocks.clear();
  });

  it('constructs a nested workspace hierarchy and verifies schema integrity', async () => {
    // 1. Create Root "Workspace Home"
    const homePage = await commandBus.dispatch({
      type: 'page/create',
      payload: { id: 'home-root', title: 'Workspace Home', icon: '🏠', parentId: null }
    });
    expect(homePage.id).toBe('home-root');
    expect(isCanonicalPage(homePage)).toBe(true);

    // 2. Create Child Page: "Engineering Roadmap"
    const roadmapPage = await commandBus.dispatch({
      type: 'page/create',
      payload: { id: 'eng-roadmap', title: 'Engineering Roadmap', icon: '🚀', parentId: 'home-root' }
    });
    expect(roadmapPage.parentId).toBe('home-root');
    expect(isCanonicalPage(roadmapPage)).toBe(true);

    // 3. Create Child Page: "Sprint Retrospective"
    const retroPage = await commandBus.dispatch({
      type: 'page/create',
      payload: { id: 'sprint-retro', title: 'Sprint Retrospective', icon: '📋', parentId: 'home-root' }
    });
    expect(retroPage.parentId).toBe('home-root');

    // 4. Populate "Engineering Roadmap" with blocks
    const b1 = await commandBus.dispatch({
      type: 'block/create',
      payload: { id: 'b-h1', pageId: 'eng-roadmap', type: 'heading1', content: 'Q3 Objectives' }
    });
    const b2 = await commandBus.dispatch({
      type: 'block/create',
      payload: { id: 'b-callout', pageId: 'eng-roadmap', type: 'callout', content: 'Production hardening in progress' }
    });
    const b3 = await commandBus.dispatch({
      type: 'block/create',
      payload: { id: 'b-todo-1', pageId: 'eng-roadmap', type: 'todo', content: 'Unify Command Bus', properties: { checked: true } }
    });
    const b4 = await commandBus.dispatch({
      type: 'block/create',
      payload: { id: 'b-todo-2', pageId: 'eng-roadmap', type: 'todo', content: 'Pass all unit tests', properties: { checked: false } }
    });

    // Verify all blocks are canonical
    for (const b of [b1, b2, b3, b4]) {
      expect(isCanonicalBlock(b)).toBe(true);
      expect(b.version).toBe(1);
    }

    // 5. Verify ordering and sorting
    const blockStore = useBlockStore.getState();
    expect(blockStore.blockOrder).toEqual(['b-h1', 'b-callout', 'b-todo-1', 'b-todo-2']);

    // 6. Test Lexical Reordering: insert a new block between b1 and b2
    const betweenSortOrder = generateLexicalOrder(b1.sortOrder, b2.sortOrder);
    const bInserted = await commandBus.dispatch({
      type: 'block/create',
      payload: {
        id: 'b-inserted',
        pageId: 'eng-roadmap',
        type: 'text',
        content: 'Inserted between heading and callout',
        afterBlockId: 'b-h1'
      }
    });

    const updatedOrder = useBlockStore.getState().blockOrder;
    expect(updatedOrder.indexOf('b-h1')).toBeLessThan(updatedOrder.indexOf('b-inserted'));
    expect(updatedOrder.indexOf('b-inserted')).toBeLessThan(updatedOrder.indexOf('b-callout'));

    // 7. Move "Sprint Retrospective" page to be a subpage of "Engineering Roadmap"
    await commandBus.dispatch({
      type: 'page/move',
      payload: { pageId: 'sprint-retro', newParentId: 'eng-roadmap' }
    });

    const movedPage = usePageStore.getState().pages.find(p => p.id === 'sprint-retro');
    expect(movedPage.parentId).toBe('eng-roadmap');

    // 8. Delete "Engineering Roadmap" and verify cascade in pageStore
    await commandBus.dispatch({
      type: 'page/delete',
      payload: { pageId: 'eng-roadmap' }
    });

    const remainingPages = usePageStore.getState().pages;
    // Both eng-roadmap and its child sprint-retro should be deleted
    expect(remainingPages.some(p => p.id === 'eng-roadmap')).toBe(false);
    expect(remainingPages.some(p => p.id === 'sprint-retro')).toBe(false);
    expect(remainingPages.some(p => p.id === 'home-root')).toBe(true);
  });
});
