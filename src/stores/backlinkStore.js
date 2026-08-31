/**
 * ─── Backlink Store ─────────────────────────────────────────────
 * First-class index of page-to-page relationships.
 * Scans block content for mention/backlink nodes and maintains
 * a bidirectional link graph using an inverted block map for O(1) updates.
 */

import { create } from 'zustand';
import { db } from '../db/database';

// Inverted index for O(1) block target lookups: blockId -> Set<targetPageId>
const _blockTargets = new Map();

export const useBacklinkStore = create((set, get) => ({
  // Forward links: pageId → string[] of target pageIds
  forwardLinks: {},
  // Backward links: pageId → string[] of source pageIds
  backwardLinks: {},
  // Block-level index: targetPageId → [{ sourcePageId, blockId, snippet }]
  backlinkDetails: {},

  /**
   * Index a single block's content for mention/backlink nodes.
   * Extracts pageId references from data-page-id attributes using an inverted map.
   */
  indexBlock: (blockId, sourcePageId, content) => {
    if (!content || !sourcePageId) return;

    // Parse out mention and backlink references from HTML
    const mentionRegex = /data-page-id="([^"]+)"/g;
    const newTargets = new Set();
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      if (match[1] && match[1] !== sourcePageId) {
        newTargets.add(match[1]);
      }
    }

    const prevTargets = _blockTargets.get(blockId) || new Set();

    const { forwardLinks, backwardLinks, backlinkDetails } = get();
    let forwardChanged = false;
    let backwardChanged = false;
    let detailsChanged = false;

    const newForward = { ...forwardLinks };
    const newBackward = { ...backwardLinks };
    const newDetails = { ...backlinkDetails };

    // 1. Remove stale targets only for targets previously linked by this block (O(k))
    for (const oldTarget of prevTargets) {
      if (!newTargets.has(oldTarget)) {
        // Remove from details
        if (newDetails[oldTarget]) {
          newDetails[oldTarget] = newDetails[oldTarget].filter(d => d.blockId !== blockId);
          if (newDetails[oldTarget].length === 0) delete newDetails[oldTarget];
          detailsChanged = true;
        }

        // Check if any other block in sourcePageId still links to oldTarget
        const hasOtherLink = Object.values(newDetails[oldTarget] || []).some(
          d => d.sourcePageId === sourcePageId
        );
        if (!hasOtherLink) {
          if (newForward[sourcePageId]) {
            newForward[sourcePageId] = newForward[sourcePageId].filter(id => id !== oldTarget);
            forwardChanged = true;
          }
          if (newBackward[oldTarget]) {
            newBackward[oldTarget] = newBackward[oldTarget].filter(id => id !== sourcePageId);
            backwardChanged = true;
          }
        }
      }
    }

    // 2. Add or update new targets (O(k))
    if (newTargets.size > 0) {
      const snippet = content
        .replace(/<[^>]*>/g, '')
        .substring(0, 100)
        .trim();

      for (const targetId of newTargets) {
        // Update forward links
        const currentForward = newForward[sourcePageId] || [];
        if (!currentForward.includes(targetId)) {
          newForward[sourcePageId] = [...currentForward, targetId];
          forwardChanged = true;
        }

        // Update backward links
        const currentBackward = newBackward[targetId] || [];
        if (!currentBackward.includes(sourcePageId)) {
          newBackward[targetId] = [...currentBackward, sourcePageId];
          backwardChanged = true;
        }

        // Update details
        const currentDetails = newDetails[targetId] || [];
        const existingIdx = currentDetails.findIndex(d => d.blockId === blockId);
        const detailEntry = { sourcePageId, blockId, snippet };

        if (existingIdx >= 0) {
          if (currentDetails[existingIdx].snippet !== snippet) {
            newDetails[targetId] = [
              ...currentDetails.slice(0, existingIdx),
              detailEntry,
              ...currentDetails.slice(existingIdx + 1)
            ];
            detailsChanged = true;
          }
        } else {
          newDetails[targetId] = [...currentDetails, detailEntry];
          detailsChanged = true;
        }
      }
    }

    _blockTargets.set(blockId, newTargets);

    if (forwardChanged || backwardChanged || detailsChanged) {
      set({
        forwardLinks: forwardChanged ? newForward : forwardLinks,
        backwardLinks: backwardChanged ? newBackward : backwardLinks,
        backlinkDetails: detailsChanged ? newDetails : backlinkDetails,
      });
    }
  },

  /**
   * Remove a block's links when deleted.
   */
  removeBlockLinks: (blockId) => {
    const prevTargets = _blockTargets.get(blockId);
    if (!prevTargets || prevTargets.size === 0) return;

    const { backlinkDetails } = get();
    const newDetails = { ...backlinkDetails };
    let changed = false;

    for (const targetId of prevTargets) {
      if (newDetails[targetId]) {
        newDetails[targetId] = newDetails[targetId].filter(d => d.blockId !== blockId);
        if (newDetails[targetId].length === 0) delete newDetails[targetId];
        changed = true;
      }
    }

    _blockTargets.delete(blockId);
    if (changed) {
      set({ backlinkDetails: newDetails });
    }
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
   * Called on app startup with a single atomic state update.
   */
  rebuildIndex: async () => {
    _blockTargets.clear();
    const blocks = await db.blocks.toArray();

    const forwardLinks = {};
    const backwardLinks = {};
    const backlinkDetails = {};
    const mentionRegex = /data-page-id="([^"]+)"/g;

    for (const block of blocks) {
      const content = block.content;
      const sourcePageId = block.pageId;
      if (!content || !sourcePageId || typeof content !== 'string') continue;
      if (content.startsWith('menc:')) continue;

      const newTargets = new Set();
      let match;
      mentionRegex.lastIndex = 0;
      while ((match = mentionRegex.exec(content)) !== null) {
        if (match[1] && match[1] !== sourcePageId) {
          newTargets.add(match[1]);
        }
      }

      if (newTargets.size > 0) {
        _blockTargets.set(block.id, newTargets);
        const snippet = content
          .replace(/<[^>]*>/g, '')
          .substring(0, 100)
          .trim();

        for (const targetId of newTargets) {
          if (!forwardLinks[sourcePageId]) forwardLinks[sourcePageId] = [];
          if (!forwardLinks[sourcePageId].includes(targetId)) {
            forwardLinks[sourcePageId].push(targetId);
          }

          if (!backwardLinks[targetId]) backwardLinks[targetId] = [];
          if (!backwardLinks[targetId].includes(sourcePageId)) {
            backwardLinks[targetId].push(sourcePageId);
          }

          if (!backlinkDetails[targetId]) backlinkDetails[targetId] = [];
          backlinkDetails[targetId].push({
            sourcePageId,
            blockId: block.id,
            snippet
          });
        }
      }
    }

    // Single atomic state update to prevent UI startup thrashing
    set({ forwardLinks, backwardLinks, backlinkDetails });
  },
}));
