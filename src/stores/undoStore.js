import { create } from 'zustand';

const MAX_UNDO = 50;

export const useUndoStore = create((set, get) => ({
  undoStack: [],
  redoStack: [],
  _lastAction: null,

  // Push a snapshot before mutation
  pushUndo: (snapshot) => {
    set(s => ({
      undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), snapshot],
      redoStack: [], // clear redo on new action
    }));
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return null;
    const last = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, last],
    });
    return last;
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return null;
    const last = redoStack[redoStack.length - 1];
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, last],
    });
    return last;
  },

  clear: () => set({ undoStack: [], redoStack: [] }),
}));
