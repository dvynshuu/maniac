/**
 * Louvain Community Detection Algorithm (Phase 1 Heuristic)
 * 
 * Partitions a graph's nodes into communities by maximizing modularity.
 * This is a client-side implementation optimized for performance on graphs
 * typical of personal knowledge bases (hundreds of nodes).
 * 
 * @param {Array} nodes - Array of node objects, e.g. [{ id: 'page1', ... }]
 * @param {Array} links - Array of link objects, e.g. [{ source: 'page1', target: 'page2' }]
 * @returns {Object} A mapping of nodeId -> communityId
 */
export function detectCommunities(nodes, links) {
  if (!nodes || nodes.length === 0) return {};

  const nodeIds = nodes.map(n => n.id);
  const communities = {};
  
  // Each node starts in its own community
  nodeIds.forEach(id => {
    communities[id] = id;
  });

  // Build an adjacency list where weights represent the count of connections
  const adj = {};
  nodeIds.forEach(id => {
    adj[id] = {};
  });

  links.forEach(link => {
    // Links can have source/target as objects (if already processed by d3-force) or as raw IDs.
    const s = typeof link.source === 'object' ? link.source.id : link.source;
    const t = typeof link.target === 'object' ? link.target.id : link.target;
    
    // Only index links between valid nodes
    if (adj[s] !== undefined && adj[t] !== undefined) {
      // Avoid self-loops in adjacency weights to prevent modularity bias
      if (s !== t) {
        adj[s][t] = (adj[s][t] || 0) + 1;
        adj[t][s] = (adj[t][s] || 0) + 1;
      }
    }
  });

  // Calculate degrees (sum of weights of incident links) for each node
  const degrees = {};
  let doubleM = 0; // 2m (sum of all degrees / total link weight)
  
  nodeIds.forEach(id => {
    let deg = 0;
    for (const neighbor in adj[id]) {
      deg += adj[id][neighbor];
    }
    degrees[id] = deg;
    doubleM += deg;
  });

  // If there are no links in the entire graph, return default single-node communities
  if (doubleM === 0) {
    return communities;
  }

  // Modularity optimization loop (Phase 1 local moving)
  let improvement = true;
  let iterations = 0;
  const maxIterations = 15;

  while (improvement && iterations < maxIterations) {
    improvement = false;
    iterations++;

    // Shuffle nodes at each iteration to avoid order-dependent bias
    const shuffledNodes = [...nodeIds].sort(() => Math.random() - 0.5);

    shuffledNodes.forEach(nodeId => {
      const currentComm = communities[nodeId];
      const neighbors = adj[nodeId];
      const k_i = degrees[nodeId];
      
      // Node has no neighbors or is isolated, keep its own community
      if (k_i === 0) return;

      // Find weights from this node to each community
      const commWeights = {};
      for (const neighborId in neighbors) {
        const neighborComm = communities[neighborId];
        commWeights[neighborComm] = (commWeights[neighborComm] || 0) + neighbors[neighborId];
      }

      // Calculate total degree sum (Sigma_tot) for all communities
      const commTotWeights = {};
      nodeIds.forEach(id => {
        const comm = communities[id];
        commTotWeights[comm] = (commTotWeights[comm] || 0) + degrees[id];
      });

      let bestComm = currentComm;
      
      // Calculate the current gain relative to its current community.
      // If we isolate the node first, its gain in currentComm is:
      // k_i_in_current - (Sigma_tot_current_without_i * k_i) / 2m
      const k_i_in_current = commWeights[currentComm] || 0;
      const sigma_tot_current = commTotWeights[currentComm] || 0;
      const currentGain = k_i_in_current - ((sigma_tot_current - k_i) * k_i) / doubleM;

      let maxDeltaQ = 0; // We only move if the net gain delta is strictly positive

      for (const commStr in commWeights) {
        const comm = commStr;
        if (comm === currentComm) continue;

        const k_i_in_new = commWeights[comm] || 0;
        const sigma_tot_new = commTotWeights[comm] || 0;

        // The modularity gain when moving node i to community C_new is:
        // Gain_new = k_i_in_new - (Sigma_tot_new * k_i) / 2m
        const newGain = k_i_in_new - (sigma_tot_new * k_i) / doubleM;
        
        // Net modularity delta: Gain_new - Gain_current
        const deltaQ = newGain - currentGain;

        if (deltaQ > maxDeltaQ) {
          maxDeltaQ = deltaQ;
          bestComm = comm;
        }
      }

      if (bestComm !== currentComm) {
        communities[nodeId] = bestComm;
        improvement = true;
      }
    });
  }

  return communities;
}
