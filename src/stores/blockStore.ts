import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { db } from '../db/database';
import { SecurityService } from '../utils/securityService';
import { useSecurityStore } from './securityStore';
import { invalidateStore } from '../core/derivedCache';
import { Block } from '../types/block';
import { compareSortOrder } from '../utils/helpers';
import { getNextEditableBlockId } from '../utils/editorBlockNavigation';
import { scheduleIdleBacklinkIndex } from './backlinkStore';

/**
 * Safely resolve a block's properties from raw DB data.
 * Handles: plain object, encrypted string, null, undefined.
 */
function resolveProperties(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    if (SecurityService.isEncrypted(raw)) {
      return {}; // Encrypted string — return empty, decryption will fill it later
    }
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return {};
}

export interface BlockStore {
  blocks: Record<string, Block>;
  blockMap: Record<string, Block>;
  blockOrder: string[];
  focusBlockId: string | null;
  focusPosition: 'start' | 'end' | number;
  prewarmedBlockId: string | null;
  navigationDirection: 'up' | 'down';
  lastLoadId: number;

  getBlocks: () => Block[];
  getBlock: (id: string) => Block | undefined;
  loadBlocks: (pageId: string | null) => Promise<void>;
  setFocusBlock: (blockId: string | null, position?: 'start' | 'end' | number, direction?: 'up' | 'down') => void;
  getDescendants: (blockId: string) => string[];
}

export const useBlockStore = create<BlockStore>()(
  subscribeWithSelector((set, get) => ({
    blocks: {},
    blockMap: {},
    blockOrder: [],
    focusBlockId: null,
    focusPosition: 'end',
    prewarmedBlockId: null,
    navigationDirection: 'down',
    lastLoadId: 0,

    getBlocks: () => {
      const { blockMap, blockOrder } = get();
      return blockOrder.map(id => blockMap[id]).filter(Boolean);
    },

    getBlock: (id) => get().blockMap[id] ?? get().blocks[id],

    loadBlocks: async (pageId) => {
      if (!pageId) {
        set({ blockMap: {}, blocks: {}, blockOrder: [], focusBlockId: null, prewarmedBlockId: null });
        return;
      }
      const loadId = (get().lastLoadId || 0) + 1;
      set({ lastLoadId: loadId });

    try {
      const key = useSecurityStore.getState().derivedKey;
      const blocksRaw = await db.blocks.where('pageId').equals(pageId).toArray();
      blocksRaw.sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));

      const initialMap: Record<string, Block> = {};
      const initialOrder: string[] = [];
      const needsDecryption: any[] = [];

      blocksRaw.forEach(b => {
        initialOrder.push(b.id);
        const encrypted = !!(b._isEncrypted && key);
        initialMap[b.id] = {
          ...b,
          content: (encrypted && SecurityService.isEncrypted(b.content)) ? '' : (b.content || ''),
          properties: (encrypted && SecurityService.isEncrypted(b.properties)) ? {} : resolveProperties(b.properties),
          _isDecrypting: encrypted,
        } as Block;
        if (encrypted) needsDecryption.push(b);
      });

      // Stale load guard
      if (get().lastLoadId !== loadId) return;

      set({ blockMap: initialMap, blocks: initialMap, blockOrder: initialOrder });
      invalidateStore('blockStore');
      invalidateStore('headings');
      invalidateStore('synced');

      // Decrypt encrypted blocks in background
      if (needsDecryption.length > 0 && key) {
        const decryptOne = async (b: any): Promise<Block> => {
          let content = b.content || '';
          let properties = b.properties;

          try {
            if (b.content && typeof b.content === 'string') {
              if (SecurityService.isEncrypted(b.content)) {
                const dec = await SecurityService.decrypt(b.content, key);
                if (dec != null) content = dec;
              } else {
                content = b.content;
              }
            }
          } catch {
            content = '🔒 Decryption Failed';
          }

          try {
            if (typeof properties === 'string' && properties.length > 0) {
              if (SecurityService.isEncrypted(properties)) {
                const decProps = await SecurityService.decrypt(properties, key);
                if (decProps != null) {
                  properties = JSON.parse(decProps);
                } else {
                  properties = {};
                }
              } else {
                try { properties = JSON.parse(properties); } catch { properties = {}; }
              }
            } else if (typeof properties === 'object' && properties !== null) {
              // Already an object — no decryption needed (edge case: mixed state)
            } else {
              properties = {};
            }
          } catch {
            properties = {};
          }

          return { ...b, content, properties, _isDecrypting: false } as Block;
        };

        // Process in small batches to keep UI responsive
        const BATCH = 10;
        const allDecrypted: Block[] = [];

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
              if (newMap[b.id] && (newMap[b.id] as any)._isDecrypting) {
                newMap[b.id] = b;
                changed = true;
              }
            });
            return changed ? { blockMap: newMap, blocks: newMap } : state;
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

  setFocusBlock: (blockId, position = 'end', direction = 'down') => {
    let prewarmed: string | null = null;
    if (blockId) {
      const { blockOrder, blockMap } = get();
      prewarmed = getNextEditableBlockId(blockId, direction, blockOrder, blockMap);
      if (!prewarmed) {
        prewarmed = getNextEditableBlockId(blockId, direction === 'down' ? 'up' : 'down', blockOrder, blockMap);
      }
    }
    set({
      focusBlockId: blockId,
      focusPosition: position,
      prewarmedBlockId: prewarmed,
      navigationDirection: direction,
    });
  },

  /**
   * Get all recursive descendant block IDs.
   * Used for circular reparenting prevention.
   */
  getDescendants: (blockId) => {
    const { blockMap, blockOrder } = get();
    const childMap = new Map<string, string[]>();
    for (const id of blockOrder) {
      const parentId = blockMap[id]?.parentId;
      if (parentId) {
        if (!childMap.has(parentId)) childMap.set(parentId, []);
        childMap.get(parentId)!.push(id);
      }
    }
    const descendants: string[] = [];
    const collect = (parentId: string) => {
      const children = childMap.get(parentId);
      if (children) {
        for (const childId of children) {
          descendants.push(childId);
          collect(childId);
        }
      }
    };
    collect(blockId);
    return descendants;
  },
})));

// Guarantee that s.blocks and s.blockMap are always identical references
const _originalBlockStoreSetState = useBlockStore.setState;
useBlockStore.setState = (partial: any, replace?: any) => {
  if (typeof partial === 'function') {
    return _originalBlockStoreSetState((state: any) => {
      const next = partial(state);
      if (next && next.blockMap && !next.blocks) {
        next.blocks = next.blockMap;
      } else if (next && next.blocks && !next.blockMap) {
        next.blockMap = next.blocks;
      }
      return next;
    }, replace);
  }
  if (partial && partial.blockMap && !partial.blocks) {
    partial.blocks = partial.blockMap;
  } else if (partial && partial.blocks && !partial.blockMap) {
    partial.blockMap = partial.blocks;
  }
  return _originalBlockStoreSetState(partial, replace);
};

// Performance listener: tracks fine-grained changes to invalidate derived caches
useBlockStore.subscribe((state, prevState) => {
  invalidateStore('blockStore');

  // Structural changes (insert, delete, reorder) invalidate both
  if (state.blockOrder !== prevState.blockOrder) {
    invalidateStore('headings');
    invalidateStore('synced');
    return;
  }

  // Content or property updates: check whether headings or synced blocks were touched
  if (state.blockMap !== prevState.blockMap) {
    let headingChanged = false;
    let syncedChanged = false;

    // Fast O(1) path: if the user is typing in the focused block, inspect it directly
    const focusId = state.focusBlockId;
    if (focusId && state.blockMap[focusId] !== prevState.blockMap[focusId]) {
      const cur = state.blockMap[focusId];
      const prev = prevState.blockMap[focusId];
      if (cur) {
        if (!prev || cur.type !== prev.type) {
          headingChanged = true;
          syncedChanged = true;
        } else {
          const isHeading =
            cur.type === 'heading1' ||
            cur.type === 'heading2' ||
            cur.type === 'heading3' ||
            cur.type === 'toggle_heading1' ||
            cur.type === 'toggle_heading2' ||
            cur.type === 'toggle_heading3';
          if (isHeading && (cur.content !== prev.content || cur.properties?.level !== prev.properties?.level)) {
            headingChanged = true;
          }
          const isSynced = cur.type === 'synced_block' || cur.type === 'synced_reference';
          if (isSynced && (cur.properties?.sourceBlockId !== prev.properties?.sourceBlockId || cur.properties?.isOriginal !== prev.properties?.isOriginal)) {
            syncedChanged = true;
          }
        }
        if (cur.content !== prev?.content && cur.pageId) {
          scheduleIdleBacklinkIndex(cur.id, cur.pageId, cur.content, 350);
        }
      }
    } else {
      // Fallback for batch updates or un-focused mutations
      for (const id of state.blockOrder) {
        const cur = state.blockMap[id];
        const prev = prevState.blockMap[id];
        if (cur !== prev) {
          if (!cur || !prev) {
            headingChanged = true;
            syncedChanged = true;
            break;
          }
          if (cur.type !== prev.type) {
            headingChanged = true;
            syncedChanged = true;
            break;
          }
          const isHeading =
            cur.type === 'heading1' ||
            cur.type === 'heading2' ||
            cur.type === 'heading3' ||
            cur.type === 'toggle_heading1' ||
            cur.type === 'toggle_heading2' ||
            cur.type === 'toggle_heading3';
          if (isHeading && (cur.content !== prev.content || cur.properties?.level !== prev.properties?.level)) {
            headingChanged = true;
          }
          const isSynced = cur.type === 'synced_block' || cur.type === 'synced_reference';
          if (isSynced && (cur.properties?.sourceBlockId !== prev.properties?.sourceBlockId || cur.properties?.isOriginal !== prev.properties?.isOriginal)) {
            syncedChanged = true;
          }
          if (cur.content !== prev.content && cur.pageId) {
            scheduleIdleBacklinkIndex(cur.id, cur.pageId, cur.content, 350);
          }
        }
      }
    }

    if (headingChanged) invalidateStore('headings');
    if (syncedChanged) invalidateStore('synced');
  }
});
