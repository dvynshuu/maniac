import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  sidebarOpen: true,
  sidebarWidth: 280,
  commandPaletteOpen: false,
  contextMenu: null,
  modal: null,
  expandedPages: {},

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
}));
