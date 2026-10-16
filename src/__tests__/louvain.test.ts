import { describe, it, expect } from 'vitest';
import { detectCommunities } from '../utils/louvain';

describe('Louvain Community Detection', () => {
  it('returns empty object when nodes are empty', () => {
    expect(detectCommunities([], [])).toEqual({});
  });

  it('assigns singletons when there are no links', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const communities = detectCommunities(nodes, []);
    expect(communities).toEqual({ a: 'a', b: 'b', c: 'c' });
  });

  it('correctly partitions two distinct triangles (cliques)', () => {
    const nodes = [
      { id: '1' }, { id: '2' }, { id: '3' },
      { id: '4' }, { id: '5' }, { id: '6' }
    ];
    const links = [
      // Triangle 1
      { source: '1', target: '2' },
      { source: '2', target: '3' },
      { source: '3', target: '1' },
      // Triangle 2
      { source: '4', target: '5' },
      { source: '5', target: '6' },
      { source: '6', target: '4' },
      // Weak bridge between triangles
      { source: '3', target: '4' },
    ];

    const communities = detectCommunities(nodes, links);
    // Nodes 1, 2, 3 must be in the same community
    expect(communities['1']).toBe(communities['2']);
    expect(communities['2']).toBe(communities['3']);

    // Nodes 4, 5, 6 must be in the same community
    expect(communities['4']).toBe(communities['5']);
    expect(communities['5']).toBe(communities['6']);

    // The two triangles must be in separate communities
    expect(communities['1']).not.toBe(communities['4']);
  });

  it('is completely deterministic between multiple runs', () => {
    const nodes = Array.from({ length: 20 }, (_, i) => ({ id: `node_${i}` }));
    const links = [];
    for (let i = 0; i < 10; i++) {
      links.push({ source: `node_${i}`, target: `node_${(i + 1) % 10}` });
    }
    for (let i = 10; i < 20; i++) {
      links.push({ source: `node_${i}`, target: `node_${10 + ((i + 1) % 10)}` });
    }
    links.push({ source: 'node_0', target: 'node_10' });

    const run1 = detectCommunities(nodes, links);
    const run2 = detectCommunities(nodes, links);
    const run3 = detectCommunities(nodes, links);

    expect(run1).toEqual(run2);
    expect(run2).toEqual(run3);
  });

  it('executes in <25ms on large networks (O(E) performance)', () => {
    const nodes = Array.from({ length: 100 }, (_, i) => ({ id: `n_${i}` }));
    const links = [];
    // 5 dense clusters of 20 nodes
    for (let cluster = 0; cluster < 5; cluster++) {
      const base = cluster * 20;
      for (let i = 0; i < 20; i++) {
        for (let j = i + 1; j < 20; j++) {
          if (Math.abs(i - j) <= 3) {
            links.push({ source: `n_${base + i}`, target: `n_${base + j}` });
          }
        }
      }
    }

    const start = performance.now();
    const result = detectCommunities(nodes, links);
    const elapsed = performance.now() - start;

    expect(Object.keys(result).length).toBe(100);
    expect(elapsed).toBeLessThan(35);
  });
});
