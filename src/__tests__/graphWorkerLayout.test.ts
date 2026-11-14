import { describe, it, expect } from 'vitest';
import {
  pureLayoutGraph,
  workerLayoutGraph,
  pureComputeKnowledgeVelocity,
  workerComputeKnowledgeVelocity,
  pureScoreNextActions,
  workerScoreNextActions,
  pureScoreForgetting,
  workerScoreForgetting
} from '../core/transformWorker';

describe('Performance Layer: Workerized Graph Layout & Intelligence Scoring', () => {
  describe('Graph Layout & Community Offloading (Float32Array Transfer)', () => {
    it('returns empty typed Float32Array when nodes are empty', async () => {
      const res = await workerLayoutGraph([], []);
      expect(res.coordinates).toBeInstanceOf(Float32Array);
      expect(res.coordinates.length).toBe(0);
      expect(res.nodeIds).toEqual([]);
      expect(res.clusterMap).toEqual({});
    });

    it('returns valid Float32Array coordinates for singleton nodes without links', async () => {
      const nodes = [{ id: 'pageA' }, { id: 'pageB' }, { id: 'pageC' }];
      const res = await workerLayoutGraph(nodes, [], 800, 600, 30);

      expect(res.coordinates).toBeInstanceOf(Float32Array);
      expect(res.coordinates.length).toBe(6); // 3 nodes * 2 (x, y)
      expect(res.nodeIds).toEqual(['pageA', 'pageB', 'pageC']);
      expect(res.clusterMap).toEqual({ pageA: 'pageA', pageB: 'pageB', pageC: 'pageC' });

      // All coordinates must be valid finite numbers
      for (let i = 0; i < res.coordinates.length; i++) {
        expect(Number.isFinite(res.coordinates[i])).toBe(true);
      }
    });

    it('clusters densely connected cliques closer together than distant clusters', async () => {
      const nodes = [
        { id: 'c1_a' }, { id: 'c1_b' }, { id: 'c1_c' },
        { id: 'c2_a' }, { id: 'c2_b' }, { id: 'c2_c' }
      ];
      const links = [
        // Cluster 1
        { source: 'c1_a', target: 'c1_b' },
        { source: 'c1_b', target: 'c1_c' },
        { source: 'c1_c', target: 'c1_a' },
        // Cluster 2
        { source: 'c2_a', target: 'c2_b' },
        { source: 'c2_b', target: 'c2_c' },
        { source: 'c2_c', target: 'c2_a' }
      ];

      const res = pureLayoutGraph(nodes, links, 800, 600, 60);

      // Louvain communities check
      expect(res.clusterMap['c1_a']).toBe(res.clusterMap['c1_b']);
      expect(res.clusterMap['c2_a']).toBe(res.clusterMap['c2_b']);
      expect(res.clusterMap['c1_a']).not.toBe(res.clusterMap['c2_a']);

      // Compute intra-cluster vs inter-cluster Euclidean distances
      const getPos = (id: string) => {
        const idx = res.nodeIds.indexOf(id);
        return { x: res.coordinates[idx * 2], y: res.coordinates[idx * 2 + 1] };
      };

      const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
      };

      const intraClusterDist = dist(getPos('c1_a'), getPos('c1_b'));
      const interClusterDist = dist(getPos('c1_a'), getPos('c2_a'));

      // Nodes within cluster 1 should be closer to each other than to nodes in cluster 2
      expect(intraClusterDist).toBeLessThan(interClusterDist);
    });
  });

  describe('Workerized Knowledge Velocity Scoring', () => {
    it('computes 7-day activity array, depth level and velocity score', async () => {
      const now = 1700000000000;
      const dayMs = 24 * 60 * 60 * 1000;
      const weeklyTimestamps = [
        now - 1 * dayMs, // 1 day ago (slot index 5)
        now - 1 * dayMs, // 1 day ago (slot index 5)
        now - 3 * dayMs, // 3 days ago (slot index 3)
        now - 6 * dayMs, // 6 days ago (slot index 0)
      ];

      const res = await workerComputeKnowledgeVelocity({
        dayBlocks: 5,
        weekBlocks: 20,
        totalBlocks: 600,
        totalRelations: 60,
        weeklyTimestamps,
        now
      });

      expect(res.dailyActivity.length).toBe(7);
      // Slot 5 should have higher activity than slot 3 or 0
      expect(res.dailyActivity[5]).toBe(100);
      expect(res.dailyActivity[3]).toBe(50);
      expect(res.depthLevel).toBe(4); // totalBlocks > 500 && totalRelations > 50
      expect(res.velocity).toBe(35); // Math.round(5 * 5 + 20 * 0.5)
    });
  });

  describe('Workerized Next Actions Task Prioritization', () => {
    it('strips HTML, extracts priority flags and sorts by urgency', async () => {
      const rawTodos = [
        { id: '1', content: '<p>Low priority task</p>', properties: { checked: false }, updatedAt: 100 },
        { id: '2', content: '<p>Checked task</p>', properties: { checked: true }, updatedAt: 200 },
        { id: '3', content: '<div><strong>Critical bug!</strong> !!!</div>', properties: { checked: false }, updatedAt: 300 },
        { id: '4', content: '<span>Medium urgent !!</span>', properties: { checked: false }, updatedAt: 400 },
        { id: '5', content: '   ', properties: { checked: false }, updatedAt: 500 },
      ];

      const res = await workerScoreNextActions(rawTodos);

      expect(res.length).toBe(3); // checked and empty excluded
      expect(res[0].id).toBe('3'); // priority 3 (!!!)
      expect(res[0].priority).toBe(3);
      expect(res[0].content).toBe('Critical bug! !!!');

      expect(res[1].id).toBe('4'); // priority 2 (!!)
      expect(res[1].priority).toBe(2);

      expect(res[2].id).toBe('1'); // priority 0
      expect(res[2].priority).toBe(0);
      expect(res[2].content).toBe('Low priority task');
    });
  });

  describe('Workerized Forgetting & Stale Content Scoring', () => {
    it('cleans HTML and sorts stale pages and abandoned todos by updatedAt ascending', async () => {
      const pages = [
        { id: 'p2', title: 'Page Newer', updatedAt: 2000 },
        { id: 'p1', title: 'Page Older', updatedAt: 1000 },
      ];
      const todos = [
        { id: 't2', content: '<b>Todo Newer</b>', properties: { checked: false }, updatedAt: 5000 },
        { id: 't1', content: '<span>Todo Older</span>', properties: { checked: false }, updatedAt: 3000 },
        { id: 't3', content: 'Done todo', properties: { checked: true }, updatedAt: 1000 },
      ];

      const res = await workerScoreForgetting(pages, todos);

      // Stale pages sorted oldest first
      expect(res.stalePages.map(p => p.id)).toEqual(['p1', 'p2']);
      // Abandoned todos sorted oldest first, checked excluded
      expect(res.abandonedTodos.map(t => t.id)).toEqual(['t1', 't2']);
      expect(res.abandonedTodos[0].content).toBe('Todo Older');
    });
  });
});
