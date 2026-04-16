import { create } from 'zustand';
import { db } from '../db/database';
import { createBlock, createId, debounce } from '../utils/helpers';

// Helper for debouncing Dexie writes per block ID
const debouncedWrites = new Map();

export const useBlockStore = create((set, get) => ({
  blocks: [],
  focusBlockId: null,

  loadBlocks: async (pageId) => {
    if (!pageId) {
      set({ blocks: [] });
      return;
    }
    const blocks = await db.blocks.where('pageId').equals(pageId).sortBy('sortOrder');
    set({ blocks });
  },

  setFocusBlock: (blockId) => {
    set({ focusBlockId: blockId });
  },

  addBlock: async (pageId, type = 'text', afterBlockId = null, content = '', properties = {}) => {
    const { blocks } = get();
    let sortOrder = blocks.length;

    if (afterBlockId) {
      const afterIndex = blocks.findIndex((b) => b.id === afterBlockId);
      if (afterIndex !== -1) {
        sortOrder = afterIndex + 1;
        // Shift subsequent blocks optimistically
        const updatedBlocks = blocks.map(b => {
          if (b.sortOrder >= sortOrder) {
            return { ...b, sortOrder: b.sortOrder + 1 };
          }
          return b;
        });
        
        // Background batch update for shifted blocks
        const shifted = updatedBlocks.filter(b => b.sortOrder > sortOrder);
        db.blocks.bulkPut(JSON.parse(JSON.stringify(shifted)));
        
        set({ blocks: updatedBlocks });
      }
    }

    const block = createBlock(pageId, type, { content, properties, sortOrder });
    
    // Optimistic insert
    const currentBlocks = get().blocks;
    const newBlocks = [...currentBlocks, block].sort((a, b) => a.sortOrder - b.sortOrder);
    set({ blocks: newBlocks, focusBlockId: block.id });
    
    await db.blocks.add(block);
    return block;
  },

  updateBlock: async (blockId, updates) => {
    const now = Date.now();
    // Optimistic update
    set(s => ({
      blocks: s.blocks.map(b => b.id === blockId ? { ...b, ...updates, updatedAt: now } : b),
    }));

    // Debounced persistence
    let debouncedFn = debouncedWrites.get(blockId);
    if (!debouncedFn) {
        debouncedFn = debounce((id, upd) => {
            db.blocks.update(id, { ...upd, updatedAt: Date.now() });
        }, 1000);
        debouncedWrites.set(blockId, debouncedFn);
    }
    debouncedFn(blockId, updates);
  },

  deleteBlock: async (blockId) => {
    const { blocks } = get();
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return;

    // Optimistic remove
    const newBlocks = blocks.filter(b => b.id !== blockId);
    const newFocus = blockIndex > 0 ? blocks[blockIndex - 1].id : null;
    set({ blocks: newBlocks, focusBlockId: newFocus });

    await db.blocks.delete(blockId);
    debouncedWrites.delete(blockId);
  },

  moveBlockUp: async (blockId) => {
    const { blocks } = get();
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index <= 0) return;

    const current = blocks[index];
    const prev = blocks[index - 1];
    const now = Date.now();

    const newBlocks = [...blocks];
    newBlocks[index] = { ...prev, sortOrder: current.sortOrder, updatedAt: now };
    newBlocks[index - 1] = { ...current, sortOrder: prev.sortOrder, updatedAt: now };
    newBlocks.sort((a, b) => a.sortOrder - b.sortOrder);
    set({ blocks: newBlocks });

    await db.blocks.update(current.id, { sortOrder: prev.sortOrder, updatedAt: now });
    await db.blocks.update(prev.id, { sortOrder: current.sortOrder, updatedAt: now });
  },

  moveBlockDown: async (blockId) => {
    const { blocks } = get();
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index >= blocks.length - 1) return;

    const current = blocks[index];
    const next = blocks[index + 1];
    const now = Date.now();

    const newBlocks = [...blocks];
    newBlocks[index] = { ...next, sortOrder: current.sortOrder, updatedAt: now };
    newBlocks[index + 1] = { ...current, sortOrder: next.sortOrder, updatedAt: now };
    newBlocks.sort((a, b) => a.sortOrder - b.sortOrder);
    set({ blocks: newBlocks });

    await db.blocks.update(current.id, { sortOrder: next.sortOrder, updatedAt: now });
    await db.blocks.update(next.id, { sortOrder: current.sortOrder, updatedAt: now });
  },

  changeBlockType: async (blockId, newType) => {
    const { blocks } = get();
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const properties = { ...block.properties };
    if (newType === 'todo') properties.checked = properties.checked ?? false;
    if (newType === 'code') properties.language = properties.language ?? 'javascript';
    if (newType === 'callout') properties.emoji = properties.emoji ?? '💡';
    if (newType === 'toggle') {
      properties.expanded = properties.expanded ?? true;
      properties.childContent = properties.childContent ?? '';
    }

    const now = Date.now();
    set(s => ({
      blocks: s.blocks.map(b => b.id === blockId ? { ...b, type: newType, properties, updatedAt: now } : b),
    }));
    
    await db.blocks.update(blockId, { type: newType, properties, updatedAt: now });
  },
}));
