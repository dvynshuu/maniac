import { create } from 'zustand';
import { db, extractWords } from '../db/database';
import { createBlock, createId, debounce, generateLexicalOrder } from '../utils/helpers';
import { content_sanitizer, sanitizeObject } from '../utils/sanitizer';
import { SecurityService } from '../utils/securityService';
import { useSecurityStore } from './securityStore';
import { useUIStore } from './uiStore';
import { invalidateStore } from '../core/derivedCache';

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
        content: b._isEncrypted && key ? 'Decrypting...' : b.content,
        // Prevent double-encryption bug: don't put encrypted string in properties field
        properties: b._isEncrypted && key ? {} : (b.properties || {})
      };
    });
    set({ blockMap: initialMap, blockOrder: initialOrder });
    invalidateStore('blockStore');

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

  /**
   * Get all recursive descendant block IDs.
   * Used for circular reparenting prevention.
   */
  getDescendants: (blockId) => {
    const { blockMap, blockOrder } = get();
    const descendants = [];
    const collect = (parentId) => {
      for (const id of blockOrder) {
        if (blockMap[id]?.parentId === parentId) {
          descendants.push(id);
          collect(id);
        }
      }
    };
    collect(blockId);
    return descendants;
  },
}));
