import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set, get) => ({
      sidebarOpen: true,
  sidebarWidth: 280,
  commandPaletteOpen: false,
  contextMenu: null,
  modal: null,
  expandedPages: {},
  lastVisitedPageId: null,
  onboardingStatus: {
    pagesCreated: false,
    blocksCreated: false,
    trackersAdded: false,
    isComplete: false,
  },
  pendingRestoreData: null,
  notionImportModalOpen: false,
  toasts: [],
  isSaving: false,
  selectedPageIds: [],

  openNotionImport: () => set({ notionImportModalOpen: true }),
  closeNotionImport: () => set({ notionImportModalOpen: false }),

  setSelectedPages: (ids) => set({ selectedPageIds: ids }),
  selectAllPages: (allIds) => set({ selectedPageIds: allIds }),
  clearSelectedPages: () => set({ selectedPageIds: [] }),
  togglePageSelection: (id) => set((state) => ({
    selectedPageIds: state.selectedPageIds.includes(id) 
      ? state.selectedPageIds.filter(i => i !== id)
      : [...state.selectedPageIds, id]
  })),

  setLastVisitedPageId: (id) => set({ lastVisitedPageId: id }),
  
  addToast: (message, type = 'info', action = null) => {
    const id = Math.random().toString(36).substr(2, 9);
    set(s => ({ toasts: [...s.toasts, { id, message, type, action }] }));
    setTimeout(() => get().removeToast(id), 5000);
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  setIsSaving: (isSaving) => set({ isSaving }),
  
  updateOnboarding: (milestone) => set((s) => {
    const newStatus = { ...s.onboardingStatus, [milestone]: true };
    if (newStatus.pagesCreated && newStatus.blocksCreated && newStatus.trackersAdded) {
      newStatus.isComplete = true;
    }
    return { onboardingStatus: newStatus };
  }),

  setPendingRestoreData: (data) => set({ pendingRestoreData: data }),
  clearPendingRestoreData: () => set({ pendingRestoreData: null }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(200, Math.min(480, width)) }),

  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  setContextMenu: (menu) => set({ contextMenu: menu }),
  closeContextMenu: () => set({ contextMenu: null }),

  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),

  togglePageExpanded: (pageId) =>
    set((s) => ({
      expandedPages: {
        ...s.expandedPages,
        [pageId]: !s.expandedPages[pageId],
      },
    })),

  setPageExpanded: (pageId, expanded) =>
    set((s) => ({
      expandedPages: {
        ...s.expandedPages,
        [pageId]: expanded,
      },
    })),
    }),
    {
      name: 'maniac-ui-store',
      partialize: (state) => ({ 
        sidebarOpen: state.sidebarOpen, 
        sidebarWidth: state.sidebarWidth, 
        expandedPages: state.expandedPages,
        lastVisitedPageId: state.lastVisitedPageId,
        onboardingStatus: state.onboardingStatus
      })
    }
  )
);
