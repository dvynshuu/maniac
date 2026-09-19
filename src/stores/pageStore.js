import { create } from 'zustand';
import { db } from '../db/database';
import { createPage, createId, debounce, generateLexicalOrder } from '../utils/helpers';
import { SecurityService } from '../utils/securityService';
import { useSecurityStore } from './securityStore';
import { useUIStore } from './uiStore';
import { dispatch } from '../core/commandBus';

export const usePageStore = create((set, get) => ({
  pages: [],
  archivedPages: [],
  currentPageId: null,

  // Full load — only on app init & page navigation
  loadPages: async () => {
    const key = useSecurityStore.getState().derivedKey;
    const allPagesRaw = await db.pages.toArray();

    const unescapeTitle = (title) => {
      if (!title || typeof title !== 'string') return title;
      if (!title.includes('&')) return title;
      return title
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
    };

    // Auto-heal any persisted titles that had unescaped HTML entities
    allPagesRaw.forEach(p => {
      if (p.title && p.title.includes('&amp;')) {
        const cleaned = unescapeTitle(p.title);
        db.pages.update(p.id, { title: cleaned }).catch(() => {});
      }
    });

    // Optimistic initial load (encrypted titles will show raw or placeholders)
    set({
      pages: allPagesRaw.filter(p => !p.isArchived).map(p => ({
        ...p,
        title: unescapeTitle(p._isEncrypted && key ? 'Decrypting...' : p.title)
      })),
      archivedPages: allPagesRaw.filter(p => p.isArchived).map(p => ({
        ...p,
        title: unescapeTitle(p._isEncrypted && key ? 'Decrypting...' : p.title)
      }))
    });

    if (key) {
      const decryptFn = async (p, k) => {
        if (p._isEncrypted && p.title) {
          try {
             const decrypted = await SecurityService.decrypt(p.title, k);
             return { ...p, title: decrypted || '🔒 Decryption Failed' };
          } catch {
             return { ...p, title: '🔒 Decryption Failed' };
          }
        }
        return p;
      };

      const { batchDecrypt } = await import('../utils/cryptoWorker');
      
      const onProgress = (currentDecrypted) => {
         // Optionally, we could stream updates here.
         // For pages, usually the count is small enough that the final update is fast.
      };

      const allPages = await batchDecrypt(allPagesRaw, key, decryptFn, 50, onProgress);
      
      set({
        pages: allPages.filter(p => !p.isArchived).map(p => ({ ...p, title: unescapeTitle(p.title) })),
        archivedPages: allPages.filter(p => p.isArchived).map(p => ({ ...p, title: unescapeTitle(p.title) }))
      });
    }
  },

  setCurrentPage: (pageId) => {
    set({ currentPageId: pageId });
    if (pageId) get().touchPage(pageId);
  },

  touchPage: async (id) => {
    const now = Date.now();
    set(s => ({
      pages: s.pages.map(p => p.id === id ? { ...p, lastViewedAt: now } : p),
    }));
    await db.pages.update(id, { lastViewedAt: now });
  },

  addPage: async (parentId = null) => {
    return dispatch({
      type: 'page/create',
      payload: { parentId }
    });
  },

  ensureRowPage: async (rowId, databaseBlockId, title = '', icon = '📄') => {
    const { pages, archivedPages } = get();
    let page = pages.find(p => p.id === rowId) || archivedPages.find(p => p.id === rowId);
    if (page) return page;

    // Check DB in case pages state was not yet loaded or row was created elsewhere
    const existingDbPage = await db.pages.get(rowId);
    if (existingDbPage) {
      const key = useSecurityStore.getState().derivedKey;
      let existingTitle = existingDbPage.title;
      if (existingDbPage._isEncrypted && key && existingTitle) {
        try {
          existingTitle = await SecurityService.decrypt(existingTitle, key) || existingTitle;
        } catch { /* ignore */ }
      }
      const hydrated = { ...existingDbPage, title: existingTitle };
      set(s => ({
        pages: s.pages.some(p => p.id === rowId) ? s.pages : [...s.pages, hydrated]
      }));
      return hydrated;
    }

    return dispatch({
      type: 'page/create',
      payload: {
        id: rowId,
        parentId: databaseBlockId,
        title: title || 'Untitled Row',
        icon: icon || '📄',
        isDatabaseRow: true,
        databaseBlockId,
      }
    });
  },

  updatePage: async (id, updates) => {
    return dispatch({
      type: 'page/update',
      payload: { pageId: id, updates }
    });
  },

  deletePage: async (id) => {
    return dispatch({
      type: 'page/delete',
      payload: { pageId: id }
    });
  },

  bulkDeletePages: async (ids) => {
    for (const id of ids) {
      await dispatch({
        type: 'page/delete',
        payload: { pageId: id }
      });
    }
  },

  archivePage: async (id) => {
    const page = get().pages.find(p => p.id === id);
    const result = await dispatch({
      type: 'page/archive',
      payload: { pageId: id }
    });

    if (page) {
      import('./notificationStore').then(({ useNotificationStore }) => {
        useNotificationStore.getState().addNotification(
          'Page Archived',
          `"${page.title || 'Untitled'}" was moved to the archives.`,
          'info'
        );
      });
    }
    return result;
  },

  restorePage: async (id) => {
    const page = get().archivedPages.find(p => p.id === id);
    const result = await dispatch({
      type: 'page/restore',
      payload: { pageId: id }
    });

    if (page) {
      import('./notificationStore').then(({ useNotificationStore }) => {
        useNotificationStore.getState().addNotification(
          'Page Restored',
          `"${page.title || 'Untitled'}" was restored to your workspace.`,
          'info'
        );
      });
    }
    return result;
  },

  movePage: async (pageId, newParentId) => {
    return dispatch({
      type: 'page/move',
      payload: { pageId, newParentId }
    });
  },

  reorderPage: async (pageId, newSortOrder) => {
    return dispatch({
      type: 'page/reorder',
      payload: { pageId, newSortOrder }
    });
  },

  toggleFavorite: async (id) => {
    const page = get().pages.find(p => p.id === id);
    if (!page) return;
    return dispatch({
      type: 'page/update',
      payload: { pageId: id, updates: { isFavorite: !page.isFavorite } }
    });
  },

  duplicatePage: async (id) => {
    const page = get().pages.find(p => p.id === id);
    if (!page) return null;

    const newPage = await dispatch({
      type: 'page/create',
      payload: {
        parentId: page.parentId,
        title: `${page.title || 'Untitled'} (copy)`,
        icon: page.icon,
        coverImage: page.coverImage,
      }
    });

    if (newPage) {
      const blocks = await db.blocks.where('pageId').equals(id).toArray();
      blocks.sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));
      for (const b of blocks) {
        await dispatch({
          type: 'block/create',
          payload: {
            pageId: newPage.id,
            type: b.type,
            content: b.content,
            properties: { ...(b.properties || {}) },
            parentId: b.parentId,
          }
        });
      }
    }

    return newPage;
  },
}));
