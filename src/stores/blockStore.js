import { create } from 'zustand';
import { db } from '../db/database';
import { createBlock, createId, debounce, generateLexicalOrder } from '../utils/helpers';
import { content_sanitizer, sanitizeObject } from '../utils/sanitizer';
import { SecurityService } from '../utils/securityService';
import { useSecurityStore } from './securityStore';
import { useUIStore } from './uiStore';
import { useUndoStore } from './undoStore';

// Helper for debouncing Dexie writes per block ID
const debouncedWrites = new Map();

export const useBlockStore = create((set, get) => ({
  blockMap: {},
  blockOrder: [],
  focusBlockId: null,

  // Helper to get blocks array for backward compat if needed,
  // but we prefer using blockMap directly for O(1) lookups
  getBlocks: () => {
    const { blockMap, blockOrder } = get();
    return blockOrder.map(id => blockMap[id]).filter(Boolean);
  },

  getBlock: (id) => get().blockMap[id],

  loadBlocks: async (pageId) => {
    if (!pageId) {
      set({ blockMap: {}, blockOrder: [] });
      return;
    }
    const key = useSecurityStore.getState().derivedKey;
    const blocksRaw = await db.blocks.where('pageId').equals(pageId).sortBy('sortOrder');

    const blockMap = {};
    const blockOrder = [];

    const decryptedBlocks = await Promise.all(blocksRaw.map(async b => {
      if (key && b._isEncrypted) {
        let content = b.content;
        let properties = b.properties;

        if (b.content) content = await SecurityService.decrypt(b.content, key) || '🔒 Decryption Failed';
        if (b.properties && typeof b.properties === 'string') {
          const decryptedProps = await SecurityService.decrypt(b.properties, key);
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

    decryptedBlocks.forEach(b => {
      blockMap[b.id] = b;
      blockOrder.push(b.id);
    });

    set({ blockMap, blockOrder });
  },

  setFocusBlock: (blockId) => {
    set({ focusBlockId: blockId });
  },

  addBlock: async (pageId, type = 'text', afterBlockId = null, content = '', properties = {}) => {
    const { blockMap, blockOrder } = get();
    let sortOrder;

    if (afterBlockId) {
      const afterIndex = blockOrder.indexOf(afterBlockId);
      if (afterIndex !== -1) {
        const prevId = blockOrder[afterIndex];
        const nextId = blockOrder[afterIndex + 1];
        const prev = blockMap[prevId]?.sortOrder || null;
        const next = nextId ? blockMap[nextId]?.sortOrder : null;
        sortOrder = generateLexicalOrder(prev, next);
      }
    } else {
      // Add to beginning
      const nextId = blockOrder[0];
      const next = nextId ? blockMap[nextId]?.sortOrder : null;
      sortOrder = generateLexicalOrder(null, next);
    }

    if (sortOrder === undefined) {
      // Fallback to end
      const lastId = blockOrder[blockOrder.length - 1];
      const last = lastId ? blockMap[lastId]?.sortOrder : null;
      sortOrder = generateLexicalOrder(last, null);
    }

    const safeContent = content_sanitizer(content);
    const safeProperties = sanitizeObject(properties) || {};

    const block = createBlock(pageId, type, { content: safeContent, properties: safeProperties, sortOrder });

    // Optimistic insert
    const newBlockMap = { ...get().blockMap, [block.id]: block };
    const allBlocks = [...get().getBlocks(), block];
    allBlocks.sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));

    set({
      blockMap: newBlockMap,
      blockOrder: allBlocks.map(b => b.id),
      focusBlockId: block.id
    });

    await db.blocks.add(block);
    useUIStore.getState().updateOnboarding('blocksCreated');
    return block;
  },

  updateBlock: async (blockId, updates) => {
    const safeUpdates = { ...updates };
    if (safeUpdates.content !== undefined) safeUpdates.content = content_sanitizer(safeUpdates.content);
    if (safeUpdates.properties !== undefined) safeUpdates.properties = sanitizeObject(safeUpdates.properties);

    const now = Date.now();
    const currentBlock = get().blockMap[blockId];
    if (!currentBlock) return;

    // Optimistic update
    set(s => ({
      blockMap: { ...s.blockMap, [blockId]: { ...currentBlock, ...safeUpdates, updatedAt: now } }
    }));

    // Debounced persistence
    let debouncedFn = debouncedWrites.get(blockId);
    if (!debouncedFn) {
      debouncedFn = debounce(async (id, upd) => {
        useUIStore.getState().setIsSaving(true);
        await db.blocks.update(id, { ...upd, updatedAt: Date.now() });
        useUIStore.getState().setIsSaving(false);
      }, 1000);
      debouncedWrites.set(blockId, debouncedFn);
    }
    debouncedFn(blockId, safeUpdates);
  },

  deleteBlock: async (blockId) => {
    const { blockMap, blockOrder } = get();
    const blockIndex = blockOrder.indexOf(blockId);
    if (blockIndex === -1) return;

    const blockToDelete = blockMap[blockId];

    // Snapshot for undo
    useUndoStore.getState().pushUndo({
      type: 'DELETE_BLOCK',
      block: blockToDelete,
      index: blockIndex
    });

    // Optimistic remove
    const newBlockMap = { ...blockMap };
    delete newBlockMap[blockId];
    const newBlockOrder = blockOrder.filter(id => id !== blockId);
    const newFocus = blockIndex > 0 ? blockOrder[blockIndex - 1] : null;

    set({ blockMap: newBlockMap, blockOrder: newBlockOrder, focusBlockId: newFocus });

    await db.blocks.delete(blockId);
    debouncedWrites.delete(blockId);

    useUIStore.getState().addToast('Block deleted', 'info', {
      label: 'UNDO',
      onClick: async () => {
        const snapshot = useUndoStore.getState().undo();
        if (snapshot && snapshot.block) {
          await db.blocks.add(snapshot.block);
          get().loadBlocks(snapshot.block.pageId);
        }
      }
    });
  },

  moveBlockUp: async (blockId) => {
    const { blockMap, blockOrder } = get();
    const index = blockOrder.indexOf(blockId);
    if (index <= 0) return;

    const currentId = blockOrder[index];
    const prevId = blockOrder[index - 1];
    const prevPrevId = blockOrder[index - 2];

    const current = blockMap[currentId];
    const prevBlock = blockMap[prevId];
    const prevPrev = prevPrevId ? blockMap[prevPrevId]?.sortOrder : null;

    const newSortOrder = generateLexicalOrder(prevPrev, prevBlock.sortOrder);
    const now = Date.now();

    const updatedBlock = { ...current, sortOrder: newSortOrder, updatedAt: now };
    const newBlockMap = { ...blockMap, [currentId]: updatedBlock };

    const allBlocks = blockOrder.map(id => id === currentId ? updatedBlock : blockMap[id]);
    allBlocks.sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));

    set({ blockMap: newBlockMap, blockOrder: allBlocks.map(b => b.id) });

    await db.blocks.update(current.id, { sortOrder: newSortOrder, updatedAt: now });
  },

  moveBlockDown: async (blockId) => {
    const { blockMap, blockOrder } = get();
    const index = blockOrder.indexOf(blockId);
    if (index === -1 || index >= blockOrder.length - 1) return;

    const currentId = blockOrder[index];
    const nextId = blockOrder[index + 1];
    const nextNextId = blockOrder[index + 2];

    const current = blockMap[currentId];
    const nextBlock = blockMap[nextId];
    const nextNext = nextNextId ? blockMap[nextNextId]?.sortOrder : null;

    const newSortOrder = generateLexicalOrder(nextBlock.sortOrder, nextNext);
    const now = Date.now();

    const updatedBlock = { ...current, sortOrder: newSortOrder, updatedAt: now };
    const newBlockMap = { ...blockMap, [currentId]: updatedBlock };

    const allBlocks = blockOrder.map(id => id === currentId ? updatedBlock : blockMap[id]);
    allBlocks.sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));

    set({ blockMap: newBlockMap, blockOrder: allBlocks.map(b => b.id) });

    await db.blocks.update(current.id, { sortOrder: newSortOrder, updatedAt: now });
  },

  changeBlockType: async (blockId, newType) => {
    const { blockMap } = get();
    const block = blockMap[blockId];
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
      blockMap: { ...s.blockMap, [blockId]: { ...block, type: newType, properties, updatedAt: now } }
    }));

    await db.blocks.update(blockId, { type: newType, properties, updatedAt: now });
  },
}));
