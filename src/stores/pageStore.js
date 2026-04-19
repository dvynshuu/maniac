import { create } from 'zustand';
import { db } from '../db/database';
import { createPage, createId, debounce, generateLexicalOrder } from '../utils/helpers';
import { SecurityService } from '../utils/securityService';
import { useSecurityStore } from './securityStore';
import { useUIStore } from './uiStore';

export const usePageStore = create((set, get) => ({
  pages: [],
  archivedPages: [],
  currentPageId: null,

  // Full load — only on app init & page navigation
  loadPages: async () => {
    const key = useSecurityStore.getState().derivedKey;
    const allPagesRaw = await db.pages.toArray();
    
    const allPages = await Promise.all(allPagesRaw.map(async p => {
      if (key && p._isEncrypted && p.title) {
        const decrypted = await SecurityService.decrypt(p.title, key);
        return { ...p, title: decrypted || '🔒 Decryption Failed' };
      }
      return p;
    }));

    set({ 
      pages: allPages.filter(p => !p.isArchived),
      archivedPages: allPages.filter(p => p.isArchived)
    });
  },

  setCurrentPage: (pageId) => {
    set({ currentPageId: pageId });
  },

  addPage: async (parentId = null) => {
    const { pages } = get();
    const siblings = pages.filter((p) => p.parentId === parentId).sort((a, b) => (a.sortOrder || '').localeCompare(b.sortOrder || ''));
    const lastSibling = siblings[siblings.length - 1];
    const sortOrder = generateLexicalOrder(lastSibling?.sortOrder || null, null);
    
    const page = createPage({
      parentId,
      sortOrder,
    });
    // Optimistic update
    set(s => ({ pages: [...s.pages, page] }));
    await db.pages.add(page);
    useUIStore.getState().updateOnboarding('pagesCreated');
    return page;
  },

  updatePage: async (id, updates) => {
    const now = Date.now();
    // Optimistic update
    set(s => ({
      pages: s.pages.map(p => p.id === id ? { ...p, ...updates, updatedAt: now } : p),
      archivedPages: s.archivedPages.map(p => p.id === id ? { ...p, ...updates, updatedAt: now } : p),
    }));
    await db.pages.update(id, { ...updates, updatedAt: now });
  },

  deletePage: async (id) => {
    // Recursively collect all descendant IDs
    const collectIds = (parentId) => {
      const children = get().pages.filter(p => p.parentId === parentId);
      let ids = [parentId];
      for (const child of children) {
        ids = [...ids, ...collectIds(child.id)];
      }
      return ids;
    };
    const idsToDelete = collectIds(id);
    
    // Optimistic update
    set(s => ({
      pages: s.pages.filter(p => !idsToDelete.includes(p.id)),
      archivedPages: s.archivedPages.filter(p => !idsToDelete.includes(p.id)),
    }));
    
    // Background Dexie cleanup
    for (const delId of idsToDelete) {
      await db.blocks.where('pageId').equals(delId).delete();
      await db.pages.delete(delId);
    }
  },

  archivePage: async (id) => {
    const now = Date.now();
    const page = get().pages.find(p => p.id === id);
    if (!page) return;
    
    const archivedPage = { ...page, isArchived: true, updatedAt: now };
    
    set(s => ({
      pages: s.pages.filter(p => p.id !== id),
      archivedPages: [...s.archivedPages, archivedPage],
      currentPageId: s.currentPageId === id ? null : s.currentPageId,
    }));
    
    await db.pages.update(id, { isArchived: true, updatedAt: now });
  },

  restorePage: async (id) => {
    const now = Date.now();
    const page = get().archivedPages.find(p => p.id === id);
    if (!page) return;
    
    const restoredPage = { ...page, isArchived: false, updatedAt: now };
    
    set(s => ({
      archivedPages: s.archivedPages.filter(p => p.id !== id),
      pages: [...s.pages, restoredPage],
    }));
    
    await db.pages.update(id, { isArchived: false, updatedAt: now });
  },

  movePage: async (pageId, newParentId) => {
    if (pageId === newParentId) return;
    const now = Date.now();
    set(s => ({
      pages: s.pages.map(p => p.id === pageId ? { ...p, parentId: newParentId, updatedAt: now } : p),
    }));
    await db.pages.update(pageId, { parentId: newParentId, updatedAt: now });
  },

  reorderPage: async (pageId, newSortOrder) => {
    const now = Date.now();
    set(s => ({
      pages: s.pages.map(p => p.id === pageId ? { ...p, sortOrder: newSortOrder, updatedAt: now } : p),
    }));
    await db.pages.update(pageId, { sortOrder: newSortOrder, updatedAt: now });
  },

  // ---- New Features ----

  toggleFavorite: async (id) => {
    const page = get().pages.find(p => p.id === id);
    if (!page) return;
    const now = Date.now();
    const newFav = !page.isFavorite;
    set(s => ({
      pages: s.pages.map(p => p.id === id ? { ...p, isFavorite: newFav, updatedAt: now } : p),
    }));
    await db.pages.update(id, { isFavorite: newFav, updatedAt: now });
  },

  duplicatePage: async (id) => {
    const page = get().pages.find(p => p.id === id);
    if (!page) return null;
    
    const newPageId = createId();
    const now = Date.now();
    const newPage = {
      ...page,
      id: newPageId,
      title: `${page.title || 'Untitled'} (copy)`,
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
    };
    
    // Copy all blocks
    const blocks = await db.blocks.where('pageId').equals(id).toArray();
    const newBlocks = blocks.map(b => ({
      ...b,
      id: createId(),
      pageId: newPageId,
      createdAt: now,
      updatedAt: now,
    }));

    // Optimistic update
    set(s => ({ pages: [...s.pages, newPage] }));
    
    await db.pages.add(newPage);
    if (newBlocks.length > 0) {
      await db.blocks.bulkAdd(newBlocks);
    }
    
    return newPage;
  },
}));
