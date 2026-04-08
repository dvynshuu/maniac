import { create } from 'zustand';
import { db } from '../db/database';
import { createPage } from '../utils/helpers';

export const usePageStore = create((set, get) => ({
  pages: [],
  archivedPages: [],
  currentPageId: null,

  loadPages: async () => {
    const allPages = await db.pages.toArray();
    set({ 
      pages: allPages.filter(p => !p.isArchived),
      archivedPages: allPages.filter(p => p.isArchived)
    });
  },

  setCurrentPage: (pageId) => {
    set({ currentPageId: pageId });
  },

  restorePage: async (id) => {
    await db.pages.update(id, { isArchived: false, updatedAt: Date.now() });
    await get().loadPages();
  },

  addPage: async (parentId = null) => {
    const { pages } = get();
    const siblings = pages.filter((p) => p.parentId === parentId);
    const page = createPage({
      parentId,
      sortOrder: siblings.length,
    });
    await db.pages.add(page);
    await get().loadPages();
    return page;
  },

  updatePage: async (id, updates) => {
    await db.pages.update(id, { ...updates, updatedAt: Date.now() });
    await get().loadPages();
  },

  deletePage: async (id) => {
    // Recursively delete child pages
    const children = await db.pages.where('parentId').equals(id).toArray();
    for (const child of children) {
      await get().deletePage(child.id);
    }
    // Delete all blocks in this page
    await db.blocks.where('pageId').equals(id).delete();
    await db.pages.delete(id);
    await get().loadPages();
  },

  archivePage: async (id) => {
    await db.pages.update(id, { isArchived: true, updatedAt: Date.now() });
    const { currentPageId } = get();
    if (currentPageId === id) {
      set({ currentPageId: null });
    }
    await get().loadPages();
  },

  movePage: async (pageId, newParentId) => {
    if (pageId === newParentId) return;
    await db.pages.update(pageId, { parentId: newParentId, updatedAt: Date.now() });
    await get().loadPages();
  },

  reorderPage: async (pageId, newSortOrder) => {
    await db.pages.update(pageId, { sortOrder: newSortOrder, updatedAt: Date.now() });
    await get().loadPages();
  },
}));
