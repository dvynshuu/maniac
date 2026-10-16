/**
 * Louvain Community Detection Algorithm (Phase 1 Heuristic)
 * 
 * Partitions a graph's nodes into communities by maximizing modularity (Blondel et al.).
 * Client-side implementation with O(E) per iteration performance using incremental
 * community weight tracking and deterministic hub-first node ordering.
 * 
 * @param nodes - Array of node objects, e.g. [{ id: 'page1', ... }]
 * @param links - Array of link objects, e.g. [{ source: 'page1', target: 'page2' }]
 * @returns A mapping of nodeId -> communityId
 */
export function detectCommunities(
  nodes: Array<{ id: string }>,
  links: Array<{ source: string | { id: string }; target: string | { id: string } }>
): Record<string, string> {
  if (!nodes || nodes.length === 0) return {};

  const nodeIds = nodes.map(n => n.id);
  const communities: Record<string, string> = {};
  const adj: Record<string, Record<string, number>> = {};
  const degrees: Record<string, number> = {};

  // Each node starts in its own community
  nodeIds.forEach(id => {
    communities[id] = id;
    adj[id] = {};
    degrees[id] = 0;
  });

  // Build symmetric adjacency list (undirected graph representation)
  links.forEach(link => {
    const s = typeof link.source === 'object' ? link.source.id : link.source;
    const t = typeof link.target === 'object' ? link.target.id : link.target;

    if (adj[s] !== undefined && adj[t] !== undefined && s !== t) {
      adj[s][t] = (adj[s][t] || 0) + 1;
      adj[t][s] = (adj[t][s] || 0) + 1;
    }
  });

  // Calculate degrees and doubleM (2m = total edge weight sum)
  let doubleM = 0;
  nodeIds.forEach(id => {
    let deg = 0;
    const neighbors = adj[id];
    for (const neighbor in neighbors) {
      deg += neighbors[neighbor];
    }
    degrees[id] = deg;
    doubleM += deg;
  });

  // If there are no links, every node is an isolate in its own community
  if (doubleM === 0) {
    return communities;
  }

  // Incremental total community incident degrees: commId -> sum of degrees
  const commTotWeights: Record<string, number> = {};
  nodeIds.forEach(id => {
    commTotWeights[id] = degrees[id];
  });

  // Deterministic hub-first ordering: high-degree nodes seed clusters faster and stably
  const orderedNodes = [...nodeIds].sort((a, b) => (degrees[b] - degrees[a]) || a.localeCompare(b));

  let improvement = true;
  let iterations = 0;
  const maxIterations = 15;

  while (improvement && iterations < maxIterations) {
    improvement = false;
    iterations++;

    for (let i = 0; i < orderedNodes.length; i++) {
      const nodeId = orderedNodes[i];
      const k_i = degrees[nodeId];
      if (k_i === 0) continue; // Isolated node remains in its own singleton community

      const currentComm = communities[nodeId];
      const neighbors = adj[nodeId];

      // Aggregated incident weights from nodeId to each neighboring community
      const commWeights: Record<string, number> = {};
      for (const neighborId in neighbors) {
        const neighborComm = communities[neighborId];
        commWeights[neighborComm] = (commWeights[neighborComm] || 0) + neighbors[neighborId];
      }

      // Temporarily remove nodeId from its current community to compute net delta
      commTotWeights[currentComm] = (commTotWeights[currentComm] || 0) - k_i;

      // Current community score after removal
      const k_i_current = commWeights[currentComm] || 0;
      const sigma_current = commTotWeights[currentComm] || 0;
      let bestGain = k_i_current - (sigma_current * k_i) / doubleM;
      let bestComm = currentComm;

      // Evaluate candidate neighboring communities in O(degree(i))
      for (const candidateComm in commWeights) {
        if (candidateComm === currentComm) continue;

        const k_i_candidate = commWeights[candidateComm];
        const sigma_candidate = commTotWeights[candidateComm] || 0;
        const candidateGain = k_i_candidate - (sigma_candidate * k_i) / doubleM;

        if (candidateGain > bestGain + 1e-9) {
          bestGain = candidateGain;
          bestComm = candidateComm;
        }
      }

      // Re-insert nodeId into best community
      communities[nodeId] = bestComm;
      commTotWeights[bestComm] = (commTotWeights[bestComm] || 0) + k_i;

      if (bestComm !== currentComm) {
        improvement = true;
      }
    }
  }

  return communities;
}
