import { create } from 'zustand';
import { db } from '../db/database';
import { createBlock, createId, debounce, generateLexicalOrder } from '../utils/helpers';
import { SecurityService } from '../utils/securityService';
import { useSecurityStore } from './securityStore';

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
    const password = useSecurityStore.getState().masterPassword;
    const blocksRaw = await db.blocks.where('pageId').equals(pageId).sortBy('sortOrder');
    
    const blocks = await Promise.all(blocksRaw.map(async b => {
      if (password && b._isEncrypted) {
        let content = b.content;
        let properties = b.properties;
        
        if (b.content) content = await SecurityService.decrypt(b.content, password) || '🔒 Decryption Failed';
        if (b.properties && typeof b.properties === 'string') {
          const decryptedProps = await SecurityService.decrypt(b.properties, password);
          try {
            properties = JSON.parse(decryptedProps);
          } catch (e) {
            properties = {};
          }
        }
        
        return { ...b, content, properties };
      }
      return b;
    }));

    set({ blocks });
  },

  setFocusBlock: (blockId) => {
    set({ focusBlockId: blockId });
  },

  addBlock: async (pageId, type = 'text', afterBlockId = null, content = '', properties = {}) => {
    const { blocks } = get();
    let sortOrder;

    if (afterBlockId) {
      const afterIndex = blocks.findIndex((b) => b.id === afterBlockId);
      if (afterIndex !== -1) {
        const prev = blocks[afterIndex].sortOrder;
        const next = blocks[afterIndex + 1]?.sortOrder || null;
        sortOrder = generateLexicalOrder(prev, next);
      }
    } else {
        // Add to beginning
        const next = blocks[0]?.sortOrder || null;
        sortOrder = generateLexicalOrder(null, next);
    }

    if (sortOrder === undefined) {
        // Fallback to end
        const last = blocks[blocks.length - 1]?.sortOrder || null;
        sortOrder = generateLexicalOrder(last, null);
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
    const prevBlock = blocks[index - 1];
    const prevPrev = blocks[index - 2]?.sortOrder || null;
    
    const newSortOrder = generateLexicalOrder(prevPrev, prevBlock.sortOrder);
    const now = Date.now();

    const newBlocks = [...blocks];
    newBlocks[index] = { ...current, sortOrder: newSortOrder, updatedAt: now };
    newBlocks.sort((a, b) => a.sortOrder.localeCompare(b.sortOrder));
    set({ blocks: newBlocks });

    await db.blocks.update(current.id, { sortOrder: newSortOrder, updatedAt: now });
  },

  moveBlockDown: async (blockId) => {
    const { blocks } = get();
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index >= blocks.length - 1) return;

    const current = blocks[index];
    const nextBlock = blocks[index + 1];
    const nextNext = blocks[index + 2]?.sortOrder || null;
    
    const newSortOrder = generateLexicalOrder(nextBlock.sortOrder, nextNext);
    const now = Date.now();

    const newBlocks = [...blocks];
    newBlocks[index] = { ...current, sortOrder: newSortOrder, updatedAt: now };
    newBlocks.sort((a, b) => a.sortOrder.localeCompare(b.sortOrder));
    set({ blocks: newBlocks });

    await db.blocks.update(current.id, { sortOrder: newSortOrder, updatedAt: now });
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
