import { create } from 'zustand';

export interface SelectionState {
  anchorBlockId: string | null;
  focusBlockId: string | null;
  anchorOffset: number;
  focusOffset: number;
  isCollapsed: boolean;
  setSelection: (selection: Partial<SelectionState>) => void;
  clearSelection: () => void;
  isBlockSelected: (blockId: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
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

  isBlockSelected: (blockId: string) => {
    const { anchorBlockId, focusBlockId } = get();
    if (!anchorBlockId || !focusBlockId) return false;
    return blockId === anchorBlockId || blockId === focusBlockId;
  }
}));
