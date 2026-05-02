import { create } from 'zustand';

/**
 * ─── Selection Store ───────────────────────────────────────────
 * Single authoritative source for editor selection and cursor.
 * Tracks:
 *  - anchorBlockId: ID of the block where selection starts
 *  - focusBlockId: ID of the block where selection ends
 *  - anchorOffset: Offset within the anchor block content
 *  - focusOffset: Offset within the focus block content
 *  - range: Browser Selection Range or custom Range object
 */
export const useSelectionStore = create((set, get) => ({
  anchorBlockId: null,
  focusBlockId: null,
  anchorOffset: 0,
  focusOffset: 0,
  isCollapsed: true,

  setSelection: (selection) => {
    set({
      ...selection,
      isCollapsed: selection.anchorBlockId === selection.focusBlockId && 
                   selection.anchorOffset === selection.focusOffset
    });
  },

  clearSelection: () => {
    set({
      anchorBlockId: null,
      focusBlockId: null,
      anchorOffset: 0,
      focusOffset: 0,
      isCollapsed: true
    });
  },

  // Helper to check if a block is part of the selection
  isBlockSelected: (blockId) => {
    const { anchorBlockId, focusBlockId } = get();
    if (!anchorBlockId || !focusBlockId) return false;
    // For now, simple check for single block selection or boundary blocks
    return blockId === anchorBlockId || blockId === focusBlockId;
  }
}));
