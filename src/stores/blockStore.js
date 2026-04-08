import { create } from 'zustand';
import { db } from '../db/database';
import { createBlock } from '../utils/helpers';

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
        // Shift subsequent blocks
        const toUpdate = blocks.filter((b) => b.sortOrder >= sortOrder);
        for (const b of toUpdate) {
          await db.blocks.update(b.id, { sortOrder: b.sortOrder + 1 });
        }
      }
    }

    const block = createBlock(pageId, type, { content, properties, sortOrder });
    await db.blocks.add(block);
    await get().loadBlocks(pageId);
    set({ focusBlockId: block.id });
    return block;
  },

  updateBlock: async (blockId, updates) => {
    await db.blocks.update(blockId, { ...updates, updatedAt: Date.now() });
    const { blocks } = get();
    if (blocks.length > 0) {
      await get().loadBlocks(blocks[0].pageId);
    }
  },

  deleteBlock: async (blockId) => {
    const { blocks } = get();
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    await db.blocks.delete(blockId);

    // Focus previous block
    if (blockIndex > 0) {
      set({ focusBlockId: blocks[blockIndex - 1].id });
    }

    await get().loadBlocks(block.pageId);
  },

  moveBlockUp: async (blockId) => {
    const { blocks } = get();
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index <= 0) return;

    const current = blocks[index];
    const prev = blocks[index - 1];

    await db.blocks.update(current.id, { sortOrder: prev.sortOrder });
    await db.blocks.update(prev.id, { sortOrder: current.sortOrder });
    await get().loadBlocks(current.pageId);
  },

  moveBlockDown: async (blockId) => {
    const { blocks } = get();
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index >= blocks.length - 1) return;

    const current = blocks[index];
    const next = blocks[index + 1];

    await db.blocks.update(current.id, { sortOrder: next.sortOrder });
    await db.blocks.update(next.id, { sortOrder: current.sortOrder });
    await get().loadBlocks(current.pageId);
  },

  changeBlockType: async (blockId, newType) => {
    const block = await db.blocks.get(blockId);
    if (!block) return;

    const properties = { ...block.properties };
    if (newType === 'todo') {
      properties.checked = properties.checked ?? false;
    }
    if (newType === 'code') {
      properties.language = properties.language ?? 'javascript';
    }
    if (newType === 'callout') {
      properties.emoji = properties.emoji ?? '💡';
    }

    await db.blocks.update(blockId, { type: newType, properties, updatedAt: Date.now() });
    await get().loadBlocks(block.pageId);
  },
}));
