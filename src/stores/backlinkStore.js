/**
 * ─── Backlink Store ─────────────────────────────────────────────
 * First-class index of page-to-page relationships.
 * Scans block content for mention/backlink nodes and maintains
 * a bidirectional link graph.
 */

import { create } from 'zustand';
import { db } from '../db/database';

export const useBacklinkStore = create((set, get) => ({
  // Forward links: pageId → Set of target pageIds
  forwardLinks: {},
  // Backward links: pageId → Set of source pageIds
  backwardLinks: {},
  // Block-level index: targetPageId → [{ sourcePageId, blockId, snippet }]
  backlinkDetails: {},

  /**
   * Index a single block's content for mention/backlink nodes.
   * Extracts pageId references from data-page-id attributes.
   */
  indexBlock: (blockId, sourcePageId, content) => {
    if (!content || !sourcePageId) return;

    // Parse out mention and backlink references from HTML
    const mentionRegex = /data-page-id="([^"]+)"/g;
    const targets = new Set();
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      targets.add(match[1]);
    }

    const { forwardLinks, backwardLinks, backlinkDetails } = get();
    const newForward = { ...forwardLinks };
    const newBackward = { ...backwardLinks };
    const newDetails = { ...backlinkDetails };

    // Initialize sets if needed
    if (!newForward[sourcePageId]) newForward[sourcePageId] = new Set();

    // Remove old links from this block (clean re-index)
    // We track by blockId to allow incremental updates
    for (const [targetId, details] of Object.entries(newDetails)) {
      newDetails[targetId] = (details || []).filter(d => d.blockId !== blockId);
      if (newDetails[targetId].length === 0) delete newDetails[targetId];
    }

    // Add new links
    for (const targetId of targets) {
      newForward[sourcePageId].add(targetId);

      if (!newBackward[targetId]) newBackward[targetId] = new Set();
      newBackward[targetId].add(sourcePageId);

      if (!newDetails[targetId]) newDetails[targetId] = [];
      
      // Extract a text snippet from the content
      const snippet = content
        .replace(/<[^>]*>/g, '')
        .substring(0, 100)
        .trim();

      newDetails[targetId].push({
        sourcePageId,
        blockId,
        snippet,
      });
    }

    // Convert Sets for Zustand state (Sets don't trigger re-renders well)
    const serializedForward = {};
    for (const [k, v] of Object.entries(newForward)) {
      serializedForward[k] = [...v];
    }
    const serializedBackward = {};
    for (const [k, v] of Object.entries(newBackward)) {
      serializedBackward[k] = [...v];
    }

    set({
      forwardLinks: serializedForward,
      backwardLinks: serializedBackward,
      backlinkDetails: newDetails,
    });
  },

  /**
   * Get all pages that link TO a given page.
   */
  getBacklinks: (pageId) => {
    const { backwardLinks } = get();
    return backwardLinks[pageId] || [];
  },

  /**
   * Get all pages that a given page links TO.
   */
  getForwardLinks: (pageId) => {
    const { forwardLinks } = get();
    return forwardLinks[pageId] || [];
  },

  /**
   * Get detailed backlink info for a page.
   */
  getBacklinkDetails: (pageId) => {
    const { backlinkDetails } = get();
    return backlinkDetails[pageId] || [];
  },

  /**
   * Full re-index from all blocks in the database.
   * Called on app startup.
   */
  rebuildIndex: async () => {
    const blocks = await db.blocks.toArray();
    const store = get();

    // Reset state
    set({ forwardLinks: {}, backwardLinks: {}, backlinkDetails: {} });

    for (const block of blocks) {
      if (block.content && typeof block.content === 'string') {
        store.indexBlock(block.id, block.pageId, block.content);
      }
    }
  },
}));
