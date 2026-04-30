import { create } from 'zustand';
import { db, extractWords } from '../db/database';
import { createBlock, createId, debounce, generateLexicalOrder } from '../utils/helpers';
import { content_sanitizer, sanitizeObject } from '../utils/sanitizer';
import { SecurityService } from '../utils/securityService';
import { useSecurityStore } from './securityStore';
import { useUIStore } from './uiStore';
import { useUndoStore } from './undoStore';

// Helper for debouncing Dexie writes per block ID
const debouncedWrites = new Map();

const encryptBlockForDB = async (blockOrUpdates, isUpdate = false) => {
  const key = useSecurityStore.getState().derivedKey;
  const hmacKey = useSecurityStore.getState().hmacKey;
  const dbObj = { ...blockOrUpdates };

  if (!key && dbObj.content !== undefined) {
    dbObj.words = extractWords(dbObj.content);
  } else if (key) {
    if (hmacKey && dbObj.content !== undefined) {
      const words = extractWords(dbObj.content);
      const hashedWords = await Promise.all(words.map(w => SecurityService.hmacWord(w, hmacKey)));
      dbObj.words = hashedWords.filter(Boolean);
    } else if (dbObj.content !== undefined) {
      dbObj.words = [];
    }

    if (dbObj.content) {
      dbObj.content = await SecurityService.encrypt(dbObj.content, key);
    }
    if (dbObj.properties !== undefined) {
      dbObj.properties = await SecurityService.encrypt(JSON.stringify(dbObj.properties), key);
    }
    
    if (dbObj.content !== undefined || dbObj.properties !== undefined) {
      dbObj._isEncrypted = true;
    }
  }
  return dbObj;
};

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

    // Optimistic fast load: Render immediately with raw (encrypted) content or placeholders
    const initialMap = {};
    const initialOrder = [];
    blocksRaw.forEach(b => {
      initialOrder.push(b.id);
      initialMap[b.id] = { 
        ...b, 
        content: b._isEncrypted && key ? 'Decrypting...' : b.content 
      };
    });
    set({ blockMap: initialMap, blockOrder: initialOrder });

    if (key) {
      const decryptFn = async (b, k) => {
        if (b._isEncrypted) {
          let content = b.content;
          let properties = b.properties;

          if (b.content) {
             try { content = await SecurityService.decrypt(b.content, k); } 
             catch { content = '🔒 Decryption Failed'; }
          }
          if (b.properties && typeof b.properties === 'string') {
            try {
              const decryptedProps = await SecurityService.decrypt(b.properties, k);
              properties = JSON.parse(decryptedProps);
            } catch {
              properties = {};
            }
          }
          return { ...b, content, properties };
        }
        return b;
      };

      const { batchDecrypt } = await import('../utils/cryptoWorker');

      const onProgress = (currentDecrypted) => {
         // Update blockMap incrementally so user sees progress
         const newMap = { ...get().blockMap };
         currentDecrypted.forEach(b => {
            if (newMap[b.id]) newMap[b.id] = b;
         });
         set({ blockMap: newMap });
      };

      const fullyDecrypted = await batchDecrypt(blocksRaw, key, decryptFn, 20, onProgress);
      
      const finalMap = { ...get().blockMap };
      fullyDecrypted.forEach(b => { finalMap[b.id] = b; });
      set({ blockMap: finalMap });
    }
  },

  setFocusBlock: (blockId) => {
    set({ focusBlockId: blockId });
  },

  addBlock: async (pageId, type = 'text', afterBlockId = null, content = '', properties = {}, parentId = undefined) => {
    const { blockMap, blockOrder } = get();
    let sortOrder;

    // Inherit parentId from afterBlockId if undefined
    let resolvedParentId = parentId;
    if (resolvedParentId === undefined && afterBlockId) {
      resolvedParentId = blockMap[afterBlockId]?.parentId || null;
    } else if (resolvedParentId === undefined) {
      resolvedParentId = null;
    }

    // Filter siblings that share the same parentId
    const siblings = blockOrder.filter(id => (blockMap[id]?.parentId || null) === resolvedParentId);

    if (afterBlockId) {
      const afterIndex = siblings.indexOf(afterBlockId);
      if (afterIndex !== -1) {
        const prevId = siblings[afterIndex];
        const nextId = siblings[afterIndex + 1];
        const prev = blockMap[prevId]?.sortOrder || null;
        const next = nextId ? blockMap[nextId]?.sortOrder : null;
        sortOrder = generateLexicalOrder(prev, next);
      }
    } 
    
    if (sortOrder === undefined) {
      // Add to end of siblings
      const lastId = siblings[siblings.length - 1];
      const last = lastId ? blockMap[lastId]?.sortOrder : null;
      sortOrder = generateLexicalOrder(last, null);
    }

    const safeContent = content_sanitizer(content);
    const safeProperties = sanitizeObject(properties) || {};

    const block = createBlock(pageId, type, { content: safeContent, properties: safeProperties, sortOrder, parentId: resolvedParentId });

    // Optimistic insert
    const newBlockMap = { ...get().blockMap, [block.id]: block };
    const allBlocks = [...get().getBlocks(), block];
    allBlocks.sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));

    set({
      blockMap: newBlockMap,
      blockOrder: allBlocks.map(b => b.id),
      focusBlockId: block.id
    });

    const dbBlock = await encryptBlockForDB(block, false);
    await db.blocks.add(dbBlock);
    useUIStore.getState().updateOnboarding('blocksCreated');
    return block;
  },

  updateBlock: async (blockId, updates) => {
    // Strip functions and non-serializable objects (fixes Dexie DataCloneError: function nop() {})
    const safeUpdates = JSON.parse(JSON.stringify(updates));
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
        const dbUpd = await encryptBlockForDB({ ...upd, updatedAt: Date.now() }, true);
        await db.blocks.update(id, dbUpd);
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
          const dbBlock = await encryptBlockForDB(snapshot.block, false);
          await db.blocks.add(dbBlock);
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

    const dbUpd = await encryptBlockForDB({ sortOrder: newSortOrder, updatedAt: now }, true);
    await db.blocks.update(current.id, dbUpd);
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

    const dbUpd = await encryptBlockForDB({ sortOrder: newSortOrder, updatedAt: now }, true);
    await db.blocks.update(current.id, dbUpd);
  },

  changeBlockType: async (blockId, newType) => {
    const { blockMap } = get();
    const block = blockMap[blockId];
    if (!block) return;

    const properties = { ...block.properties };
    if (newType === 'todo') properties.checked = properties.checked ?? false;
    if (newType === 'code') properties.language = properties.language ?? 'javascript';
    if (newType === 'callout') {
      properties.emoji = properties.emoji ?? '💡';
      properties.color = properties.color ?? 'default';
    }
    if (newType === 'toggle') {
      properties.expanded = properties.expanded ?? true;
      properties.childContent = properties.childContent ?? '';
    }
    if (newType === 'embed') {
      properties.url = properties.url ?? '';
      properties.caption = properties.caption ?? '';
    }
    if (newType === 'bullet' || newType === 'numbered') {
      properties.depth = properties.depth ?? 0;
    }

    const now = Date.now();
    set(s => ({
      blockMap: { ...s.blockMap, [blockId]: { ...block, type: newType, properties, updatedAt: now } }
    }));

    const dbUpd = await encryptBlockForDB({ type: newType, properties, updatedAt: now }, true);
    await db.blocks.update(blockId, dbUpd);
  },
}));
