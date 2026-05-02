import { create } from 'zustand';
import { db, extractWords } from '../db/database';
import { createBlock, createId, debounce, generateLexicalOrder } from '../utils/helpers';
import { content_sanitizer, sanitizeObject } from '../utils/sanitizer';
import { SecurityService } from '../utils/securityService';
import { useSecurityStore } from './securityStore';
import { useUIStore } from './uiStore';
import { invalidateStore } from '../core/derivedCache';

/**
 * Safely resolve a block's properties from raw DB data.
 * Handles: plain object, encrypted string, null, undefined.
 */
function resolveProperties(raw, isEncrypted) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  // If it's a string but the block isn't marked encrypted, try to JSON.parse it
  if (typeof raw === 'string' && !isEncrypted) {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  // Encrypted string — return empty, decryption will fill it later
  return {};
}

export const useBlockStore = create((set, get) => ({
  blockMap: {},
  blockOrder: [],
  focusBlockId: null,
  lastLoadId: 0,

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
    const loadId = (get().lastLoadId || 0) + 1;
    set({ lastLoadId: loadId });

    try {
      const key = useSecurityStore.getState().derivedKey;
      const blocksRaw = await db.blocks.where('pageId').equals(pageId).sortBy('sortOrder');

      const initialMap = {};
      const initialOrder = [];
      const needsDecryption = [];

      blocksRaw.forEach(b => {
        initialOrder.push(b.id);
        const encrypted = !!(b._isEncrypted && key);
        initialMap[b.id] = {
          ...b,
          content: encrypted ? '' : (b.content || ''),
          properties: encrypted ? {} : resolveProperties(b.properties, false),
          _isDecrypting: encrypted,
        };
        if (encrypted) needsDecryption.push(b);
      });

      // Stale load guard
      if (get().lastLoadId !== loadId) return;

      set({ blockMap: initialMap, blockOrder: initialOrder });
      invalidateStore('blockStore');

      // Decrypt encrypted blocks in background
      if (needsDecryption.length > 0 && key) {
        const decryptOne = async (b) => {
          let content = b.content || '';
          let properties = b.properties;

          try {
            if (b.content && typeof b.content === 'string') {
              const dec = await SecurityService.decrypt(b.content, key);
              if (dec != null) content = dec;
            }
          } catch {
            content = '🔒 Decryption Failed';
          }

          try {
            if (typeof properties === 'string' && properties.length > 0) {
              const decProps = await SecurityService.decrypt(properties, key);
              if (decProps != null) {
                properties = JSON.parse(decProps);
              } else {
                properties = {};
              }
            } else if (typeof properties === 'object' && properties !== null) {
              // Already an object — no decryption needed (edge case: mixed state)
            } else {
              properties = {};
            }
          } catch {
            properties = {};
          }

          return { ...b, content, properties, _isDecrypting: false };
        };

        // Process in small batches to keep UI responsive
        const BATCH = 10;
        const allDecrypted = [];

        for (let i = 0; i < needsDecryption.length; i += BATCH) {
          if (get().lastLoadId !== loadId) return; // stale

          const batch = needsDecryption.slice(i, i + BATCH);
          const decBatch = await Promise.all(batch.map(decryptOne));
          allDecrypted.push(...decBatch);

          // Incremental UI update
          set(state => {
            if (state.lastLoadId !== loadId) return state;
            const newMap = { ...state.blockMap };
            let changed = false;
            decBatch.forEach(b => {
              if (newMap[b.id] && newMap[b.id]._isDecrypting) {
                newMap[b.id] = b;
                changed = true;
              }
            });
            return changed ? { blockMap: newMap } : state;
          });

          // Yield to main thread
          if (i + BATCH < needsDecryption.length) {
            await new Promise(r => setTimeout(r, 0));
          }
        }
      }
    } catch (error) {
      console.error('[blockStore] loadBlocks failed:', error);
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
