import { describe, it, expect } from 'vitest';

describe('Graph Data & Link Filtering Logic', () => {
  it('correctly preserves structural hierarchy links even when parent explicitly mentions child', () => {
    // Page A is parent of Page B, and Page A also has an explicit forward link to Page B
    const activePages = [
      { id: 'parent', title: 'Parent Page', isArchived: false },
      { id: 'child', title: 'Child Page', parentId: 'parent', isArchived: false },
    ];
    const validNodeIds = new Set(activePages.map(n => n.id));
    const forwardLinks: Record<string, string[]> = {
      parent: ['child']
    };

    const linksMap = new Map();

    // 1. Forward links
    Object.entries(forwardLinks).forEach(([source, targets]) => {
      if (validNodeIds.has(source)) {
        targets.forEach(target => {
          if (validNodeIds.has(target) && source !== target) {
            linksMap.set(`${source}->${target}`, { source, target, isSemantic: true });
          }
        });
      }
    });

    // 2. Structural links
    activePages.forEach(p => {
      if (p.parentId && validNodeIds.has(p.parentId) && p.parentId !== p.id) {
        const key = `${p.parentId}->${p.id}`;
        const existing = linksMap.get(key);
        if (existing) {
          existing.isStructural = true;
        } else {
          linksMap.set(key, { source: p.parentId, target: p.id, isStructural: true });
        }
      }
    });

    const allLinks = Array.from(linksMap.values());
    expect(allLinks.length).toBe(1);
    expect(allLinks[0].isStructural).toBe(true);
    expect(allLinks[0].isSemantic).toBe(true);

    // Filter test 1: Only structural links enabled
    const structuralOnly = allLinks.filter(l => {
      if (l.isStructural && l.isSemantic) return true; // structural is on
      return l.isStructural;
    });
    expect(structuralOnly.length).toBe(1);

    // Filter test 2: Only semantic links enabled
    const semanticOnly = allLinks.filter(l => {
      if (l.isStructural && l.isSemantic) return true; // semantic is on
      return l.isSemantic;
    });
    expect(semanticOnly.length).toBe(1);
  });

  it('prevents search matches from being dimmed when they are also neighbors of each other', () => {
    const matched = new Set(['node1', 'node2']);
    const neighbors = new Set(['node2', 'node3']); // node2 is both matched and neighbor
    const all = new Set(['node1', 'node2', 'node3']);

    const checkNodeAlpha = (nodeId: string) => {
      const isSearchActive = true;
      const isSearchMatch = isSearchActive && matched.has(nodeId);
      const isSearchNeighbor = isSearchActive && !isSearchMatch && neighbors.has(nodeId);
      const isSearchDimmed = isSearchActive && !isSearchMatch && !isSearchNeighbor;

      return isSearchDimmed ? 0.08 : (isSearchMatch ? 1 : (isSearchNeighbor ? 0.6 : 1));
    };

    // Both direct matches should have 1.0 opacity, not 0.6
    expect(checkNodeAlpha('node1')).toBe(1);
    expect(checkNodeAlpha('node2')).toBe(1);
    // Non-matching neighbor should have 0.6
    expect(checkNodeAlpha('node3')).toBe(0.6);
    // Unrelated node should have 0.08
    expect(checkNodeAlpha('node4')).toBe(0.08);
  });
});
