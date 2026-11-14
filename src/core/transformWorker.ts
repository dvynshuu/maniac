/**
 * ─── Performance Layer: Workerized Transforms ───────────────────
 * Offloads expensive CPU-bound transforms to a Web Worker.
 *
 * Currently handles:
 * - Full-text search indexing (word extraction + scoring)
 * - Markdown/HTML serialization for export
 * - Sort key generation for large batch operations
 * - JSON diff computation for undo/redo
 *
 * Uses a message-based API with promise resolution.
 */

import { detectCommunities as pureDetectCommunities } from '../utils/louvain';

export interface GraphLayoutResult {
  coordinates: Float32Array;
  nodeIds: string[];
  clusterMap: Record<string, string>;
}

export interface KnowledgeVelocityPayload {
  dayBlocks: number;
  weekBlocks: number;
  totalBlocks: number;
  totalRelations: number;
  weeklyTimestamps: number[];
  now: number;
}

export interface KnowledgeVelocityResult {
  velocity: number;
  dayBlocks: number;
  weekBlocks: number;
  totalBlocks: number;
  totalRelations: number;
  dailyActivity: number[];
  depthLevel: number;
}

// ─── Pure Fallback Implementations (used when Web Worker is unavailable) ───

export function pureLayoutGraph(
  nodes: Array<{ id: string }>,
  links: Array<{ source: string | { id: string }; target: string | { id: string } }>,
  width = 800,
  height = 600,
  iterations = 60
): GraphLayoutResult {
  if (!nodes || nodes.length === 0) {
    return {
      coordinates: new Float32Array(0),
      nodeIds: [],
      clusterMap: {}
    };
  }

  const clusterMap = pureDetectCommunities(nodes, links);
  const n = nodes.length;
  const nodeIndexMap = new Map<string, number>();
  const nodeIds = new Array<string>(n);

  for (let i = 0; i < n; i++) {
    const id = nodes[i].id;
    nodeIds[i] = id;
    nodeIndexMap.set(id, i);
  }

  const clusterGroups: Record<string, number[]> = {};
  for (let i = 0; i < n; i++) {
    const cid = clusterMap[nodeIds[i]] || 'default';
    if (!clusterGroups[cid]) clusterGroups[cid] = [];
    clusterGroups[cid].push(i);
  }

  const clusterIds = Object.keys(clusterGroups);
  const clusterCenters: Record<string, { x: number; y: number }> = {};
  const cx = width / 2;
  const cy = height / 2;
  const ringRadius = Math.min(width, height) * 0.32;

  if (clusterIds.length <= 1) {
    clusterCenters[clusterIds[0] || 'default'] = { x: cx, y: cy };
  } else {
    clusterIds.forEach((cid, idx) => {
      const angle = (idx / clusterIds.length) * 2 * Math.PI;
      clusterCenters[cid] = {
        x: cx + Math.cos(angle) * ringRadius,
        y: cy + Math.sin(angle) * ringRadius
      };
    });
  }

  const posX = new Float32Array(n);
  const posY = new Float32Array(n);
  const velX = new Float32Array(n);
  const velY = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const cid = clusterMap[nodeIds[i]] || 'default';
    const center = clusterCenters[cid] || { x: cx, y: cy };
    const goldenAngle = i * 2.399963229728653;
    const r = 10 + Math.sqrt(i) * 12;
    posX[i] = center.x + Math.cos(goldenAngle) * r;
    posY[i] = center.y + Math.sin(goldenAngle) * r;
  }

  const linkPairs: number[] = [];
  links.forEach(l => {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    const si = nodeIndexMap.get(s);
    const ti = nodeIndexMap.get(t);
    if (si !== undefined && ti !== undefined && si !== ti) {
      linkPairs.push(si, ti);
    }
  });

  const kRepulse = 750;
  const kSpring = 0.05;
  const targetDist = 45;
  const damping = 0.85;
  const numLinks = linkPairs.length / 2;
  const maxSpeed = 16;
  const maxRepulseDistSq = 35000;

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < n; i++) {
      const cid = clusterMap[nodeIds[i]] || 'default';
      const center = clusterCenters[cid] || { x: cx, y: cy };
      velX[i] += (center.x - posX[i]) * 0.006;
      velY[i] += (center.y - posY[i]) * 0.006;
      velX[i] += (cx - posX[i]) * 0.001;
      velY[i] += (cy - posY[i]) * 0.001;
    }

    for (let l = 0; l < numLinks; l++) {
      const s = linkPairs[l * 2];
      const t = linkPairs[l * 2 + 1];
      const dx = posX[t] - posX[s];
      const dy = posY[t] - posY[s];
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const force = (dist - targetDist) * kSpring;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      velX[s] += fx;
      velY[s] += fy;
      velX[t] -= fx;
      velY[t] -= fy;
    }

    for (let i = 0; i < n; i++) {
      const xi = posX[i];
      const yi = posY[i];
      let fx = 0;
      let fy = 0;
      for (let j = i + 1; j < n; j++) {
        const dx = xi - posX[j];
        const dy = yi - posY[j];
        const d2 = dx * dx + dy * dy + 1;
        if (d2 < maxRepulseDistSq) {
          const invD = 1 / Math.sqrt(d2);
          const repForce = (kRepulse / d2) * invD;
          const rfx = dx * repForce;
          const rfy = dy * repForce;
          fx += rfx;
          fy += rfy;
          velX[j] -= rfx;
          velY[j] -= rfy;
        }
      }
      velX[i] += fx;
      velY[i] += fy;
    }

    for (let i = 0; i < n; i++) {
      velX[i] *= damping;
      velY[i] *= damping;
      const speed = Math.sqrt(velX[i] * velX[i] + velY[i] * velY[i]);
      if (speed > maxSpeed) {
        velX[i] = (velX[i] / speed) * maxSpeed;
        velY[i] = (velY[i] / speed) * maxSpeed;
      }
      posX[i] += velX[i];
      posY[i] += velY[i];
    }
  }

  const coordinates = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    coordinates[i * 2] = posX[i];
    coordinates[i * 2 + 1] = posY[i];
  }

  return {
    coordinates,
    nodeIds,
    clusterMap
  };
}

export function pureComputeKnowledgeVelocity(payload: KnowledgeVelocityPayload): KnowledgeVelocityResult {
  const { dayBlocks, weekBlocks, totalBlocks, totalRelations, weeklyTimestamps, now } = payload;
  const dailyActivity = [0, 0, 0, 0, 0, 0, 0];
  const dayMs = 24 * 60 * 60 * 1000;

  if (Array.isArray(weeklyTimestamps)) {
    for (let i = 0; i < weeklyTimestamps.length; i++) {
      const ts = weeklyTimestamps[i];
      const daysAgo = Math.floor((now - ts) / dayMs);
      if (daysAgo >= 0 && daysAgo < 7) {
        dailyActivity[6 - daysAgo]++;
      }
    }
  }

  const maxActivity = Math.max(...dailyActivity, 1);
  const normalizedActivity = dailyActivity.map(count => Math.max(5, Math.round((count / maxActivity) * 100)));

  let depthLevel = 1;
  if (totalBlocks > 2000 && totalRelations > 200) depthLevel = 5;
  else if (totalBlocks > 500 && totalRelations > 50) depthLevel = 4;
  else if (totalBlocks > 100 && totalRelations > 10) depthLevel = 3;
  else if (totalBlocks > 50) depthLevel = 2;

  const velocity = Math.min(100, Math.round((dayBlocks * 5) + (weekBlocks * 0.5)));

  return {
    velocity,
    dayBlocks,
    weekBlocks,
    totalBlocks,
    totalRelations,
    dailyActivity: normalizedActivity,
    depthLevel
  };
}

export function pureScoreNextActions(todos: any[]): any[] {
  if (!Array.isArray(todos)) return [];
  return todos
    .filter(t => {
      if (t.properties?.checked) return false;
      const clean = (t.content || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
      return Boolean(clean);
    })
    .map(t => {
      const cleanContent = (t.content || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      let priority = 0;
      if (cleanContent.includes('!!!')) priority = 3;
      else if (cleanContent.includes('!!')) priority = 2;
      else if (cleanContent.includes('!')) priority = 1;

      return { ...t, content: cleanContent, priority };
    })
    .sort((a, b) => b.priority - a.priority || b.updatedAt - a.updatedAt)
    .slice(0, 10);
}

export function pureScoreForgetting(pages: any[], todos: any[]): { stalePages: any[]; abandonedTodos: any[] } {
  const stalePages = Array.isArray(pages) ? [...pages].sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0)) : [];
  const abandonedTodos = (Array.isArray(todos) ? todos : [])
    .filter(t => {
      if (t.properties?.checked) return false;
      const clean = (t.content || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
      return Boolean(clean);
    })
    .map(t => {
      const cleanContent = (t.content || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return { ...t, content: cleanContent };
    })
    .sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));

  return {
    stalePages,
    abandonedTodos
  };
}

// ─── Worker Code (inlined as Blob URL) ──────────────────────────

const WORKER_CODE = `
  // ─── Worker: Transform Engine ─────────────────────────────────

  // Full-text word extraction with frequency scoring
  function extractAndScoreWords(htmlContent) {
    // Strip HTML tags
    const text = htmlContent.replace(/<[^>]*>/g, ' ');
    // Normalize whitespace + extract words
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\\s\\u00C0-\\u024F]/g, ' ')
      .split(/\\s+/)
      .filter(w => w.length > 1 && w.length < 50);

    // Compute frequency map
    const freq = {};
    for (const w of words) {
      freq[w] = (freq[w] || 0) + 1;
    }

    // Return unique words sorted by frequency desc
    const unique = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
    return { words: unique, frequencies: freq, totalWords: words.length };
  }

  // Markdown serialization from block data
  function blocksToMarkdown(blocks) {
    const lines = [];
    for (const block of blocks) {
      const content = (block.content || '').replace(/<[^>]*>/g, '');
      switch (block.type) {
        case 'heading1': lines.push('# ' + content); break;
        case 'heading2': lines.push('## ' + content); break;
        case 'heading3': lines.push('### ' + content); break;
        case 'todo':
          lines.push((block.properties?.checked ? '- [x] ' : '- [ ] ') + content);
          break;
        case 'bullet': lines.push('- ' + content); break;
        case 'numbered': lines.push('1. ' + content); break;
        case 'quote': lines.push('> ' + content); break;
        case 'code': lines.push('\\x60\\x60\\x60' + (block.properties?.language || '') + '\\n' + content + '\\n\\x60\\x60\\x60'); break;
        case 'divider': lines.push('---'); break;
        default: lines.push(content); break;
      }
    }
    return lines.join('\\n\\n');
  }

  // Batch sort key generation
  function generateBatchSortKeys(count) {
    const BASE = 'abcdefghijklmnopqrstuvwxyz';
    const keys = [];
    const step = BASE.length / (count + 1);
    for (let i = 1; i <= count; i++) {
      const pos = Math.min(Math.floor(step * i), BASE.length - 1);
      let key = BASE[pos];
      while (keys.includes(key)) {
        key += BASE[Math.floor(Math.random() * BASE.length)];
      }
      keys.push(key);
    }
    return keys;
  }

  // Shallow JSON diff for undo snapshots
  function computeDiff(before, after) {
    const changes = {};
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    for (const key of allKeys) {
      const bVal = JSON.stringify(before?.[key]);
      const aVal = JSON.stringify(after?.[key]);
      if (bVal !== aVal) {
        changes[key] = { before: before?.[key], after: after?.[key] };
      }
    }
    return changes;
  }

  // Pure Louvain Community Detection algorithm for graphs
  function detectCommunities(nodes, links) {
    if (!nodes || nodes.length === 0) return {};
    const nodeIds = nodes.map(n => n.id);
    const communities = {};
    const adj = {};
    const degrees = {};

    nodeIds.forEach(id => {
      communities[id] = id;
      adj[id] = {};
      degrees[id] = 0;
    });

    links.forEach(link => {
      const s = typeof link.source === 'object' ? link.source.id : link.source;
      const t = typeof link.target === 'object' ? link.target.id : link.target;
      if (adj[s] !== undefined && adj[t] !== undefined && s !== t) {
        adj[s][t] = (adj[s][t] || 0) + 1;
        adj[t][s] = (adj[t][s] || 0) + 1;
      }
    });

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

    if (doubleM === 0) return communities;

    const commTotWeights = {};
    nodeIds.forEach(id => {
      commTotWeights[id] = degrees[id];
    });

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
        if (k_i === 0) continue;

        const currentComm = communities[nodeId];
        const neighbors = adj[nodeId];
        const commWeights = {};
        for (const neighborId in neighbors) {
          const neighborComm = communities[neighborId];
          commWeights[neighborComm] = (commWeights[neighborComm] || 0) + neighbors[neighborId];
        }

        commTotWeights[currentComm] = (commTotWeights[currentComm] || 0) - k_i;
        const k_i_current = commWeights[currentComm] || 0;
        const sigma_current = commTotWeights[currentComm] || 0;
        let bestGain = k_i_current - (sigma_current * k_i) / doubleM;
        let bestComm = currentComm;

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

        communities[nodeId] = bestComm;
        commTotWeights[bestComm] = (commTotWeights[bestComm] || 0) + k_i;
        if (bestComm !== currentComm) {
          improvement = true;
        }
      }
    }
    return communities;
  }

  // ─── Force-Directed Layout & Louvain Graph Pre-computation ──────
  function layoutGraph(nodes, links, width, height, iterations) {
    width = width || 800;
    height = height || 600;
    iterations = iterations || 60;

    if (!nodes || nodes.length === 0) {
      return {
        coordinates: new Float32Array(0),
        nodeIds: [],
        clusterMap: {}
      };
    }

    const clusterMap = detectCommunities(nodes, links);
    const n = nodes.length;
    const nodeIndexMap = new Map();
    const nodeIds = new Array(n);

    for (let i = 0; i < n; i++) {
      const id = nodes[i].id;
      nodeIds[i] = id;
      nodeIndexMap.set(id, i);
    }

    const clusterGroups = {};
    for (let i = 0; i < n; i++) {
      const cid = clusterMap[nodeIds[i]] || 'default';
      if (!clusterGroups[cid]) clusterGroups[cid] = [];
      clusterGroups[cid].push(i);
    }

    const clusterIds = Object.keys(clusterGroups);
    const clusterCenters = {};
    const cx = width / 2;
    const cy = height / 2;
    const ringRadius = Math.min(width, height) * 0.32;

    if (clusterIds.length <= 1) {
      clusterCenters[clusterIds[0] || 'default'] = { x: cx, y: cy };
    } else {
      clusterIds.forEach((cid, idx) => {
        const angle = (idx / clusterIds.length) * 2 * Math.PI;
        clusterCenters[cid] = {
          x: cx + Math.cos(angle) * ringRadius,
          y: cy + Math.sin(angle) * ringRadius
        };
      });
    }

    const posX = new Float32Array(n);
    const posY = new Float32Array(n);
    const velX = new Float32Array(n);
    const velY = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const cid = clusterMap[nodeIds[i]] || 'default';
      const center = clusterCenters[cid] || { x: cx, y: cy };
      const goldenAngle = i * 2.399963229728653;
      const r = 10 + Math.sqrt(i) * 12;
      posX[i] = center.x + Math.cos(goldenAngle) * r;
      posY[i] = center.y + Math.sin(goldenAngle) * r;
    }

    const linkPairs = [];
    links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      const si = nodeIndexMap.get(s);
      const ti = nodeIndexMap.get(t);
      if (si !== undefined && ti !== undefined && si !== ti) {
        linkPairs.push(si, ti);
      }
    });

    const kRepulse = 750;
    const kSpring = 0.05;
    const targetDist = 45;
    const damping = 0.85;
    const numLinks = linkPairs.length / 2;
    const maxSpeed = 16;
    const maxRepulseDistSq = 35000;

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < n; i++) {
        const cid = clusterMap[nodeIds[i]] || 'default';
        const center = clusterCenters[cid] || { x: cx, y: cy };
        velX[i] += (center.x - posX[i]) * 0.006;
        velY[i] += (center.y - posY[i]) * 0.006;
        velX[i] += (cx - posX[i]) * 0.001;
        velY[i] += (cy - posY[i]) * 0.001;
      }

      for (let l = 0; l < numLinks; l++) {
        const s = linkPairs[l * 2];
        const t = linkPairs[l * 2 + 1];
        const dx = posX[t] - posX[s];
        const dy = posY[t] - posY[s];
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const force = (dist - targetDist) * kSpring;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        velX[s] += fx;
        velY[s] += fy;
        velX[t] -= fx;
        velY[t] -= fy;
      }

      for (let i = 0; i < n; i++) {
        const xi = posX[i];
        const yi = posY[i];
        let fx = 0;
        let fy = 0;
        for (let j = i + 1; j < n; j++) {
          const dx = xi - posX[j];
          const dy = yi - posY[j];
          const d2 = dx * dx + dy * dy + 1;
          if (d2 < maxRepulseDistSq) {
            const invD = 1 / Math.sqrt(d2);
            const repForce = (kRepulse / d2) * invD;
            const rfx = dx * repForce;
            const rfy = dy * repForce;
            fx += rfx;
            fy += rfy;
            velX[j] -= rfx;
            velY[j] -= rfy;
          }
        }
        velX[i] += fx;
        velY[i] += fy;
      }

      for (let i = 0; i < n; i++) {
        velX[i] *= damping;
        velY[i] *= damping;
        const speed = Math.sqrt(velX[i] * velX[i] + velY[i] * velY[i]);
        if (speed > maxSpeed) {
          velX[i] = (velX[i] / speed) * maxSpeed;
          velY[i] = (velY[i] / speed) * maxSpeed;
        }
        posX[i] += velX[i];
        posY[i] += velY[i];
      }
    }

    const coordinates = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      coordinates[i * 2] = posX[i];
      coordinates[i * 2 + 1] = posY[i];
    }

    return {
      coordinates,
      nodeIds,
      clusterMap
    };
  }

  // ─── Knowledge Velocity Scoring ───────────────────────────────
  function computeKnowledgeVelocity(payload) {
    const { dayBlocks, weekBlocks, totalBlocks, totalRelations, weeklyTimestamps, now } = payload;
    const dailyActivity = [0, 0, 0, 0, 0, 0, 0];
    const dayMs = 24 * 60 * 60 * 1000;

    if (Array.isArray(weeklyTimestamps)) {
      for (let i = 0; i < weeklyTimestamps.length; i++) {
        const ts = weeklyTimestamps[i];
        const daysAgo = Math.floor((now - ts) / dayMs);
        if (daysAgo >= 0 && daysAgo < 7) {
          dailyActivity[6 - daysAgo]++;
        }
      }
    }

    const maxActivity = Math.max(...dailyActivity, 1);
    const normalizedActivity = dailyActivity.map(count => Math.max(5, Math.round((count / maxActivity) * 100)));

    let depthLevel = 1;
    if (totalBlocks > 2000 && totalRelations > 200) depthLevel = 5;
    else if (totalBlocks > 500 && totalRelations > 50) depthLevel = 4;
    else if (totalBlocks > 100 && totalRelations > 10) depthLevel = 3;
    else if (totalBlocks > 50) depthLevel = 2;

    const velocity = Math.min(100, Math.round((dayBlocks * 5) + (weekBlocks * 0.5)));

    return {
      velocity,
      dayBlocks,
      weekBlocks,
      totalBlocks,
      totalRelations,
      dailyActivity: normalizedActivity,
      depthLevel
    };
  }

  // ─── Next Actions Scoring ─────────────────────────────────────
  function scoreNextActions(todos) {
    if (!Array.isArray(todos)) return [];
    return todos
      .filter(t => {
        if (t.properties && t.properties.checked) return false;
        const clean = (t.content || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
        return Boolean(clean);
      })
      .map(t => {
        const cleanContent = (t.content || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\\s+/g, ' ')
          .trim();

        let priority = 0;
        if (cleanContent.includes('!!!')) priority = 3;
        else if (cleanContent.includes('!!')) priority = 2;
        else if (cleanContent.includes('!')) priority = 1;

        return { ...t, content: cleanContent, priority };
      })
      .sort((a, b) => b.priority - a.priority || b.updatedAt - a.updatedAt)
      .slice(0, 10);
  }

  // ─── Forgetting & Stale Content Scoring ────────────────────────
  function scoreForgetting(pages, todos) {
    const stalePages = Array.isArray(pages) ? [...pages].sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0)) : [];
    const abandonedTodos = (Array.isArray(todos) ? todos : [])
      .filter(t => {
        if (t.properties && t.properties.checked) return false;
        const clean = (t.content || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
        return Boolean(clean);
      })
      .map(t => {
        const cleanContent = (t.content || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\\s+/g, ' ')
          .trim();
        return { ...t, content: cleanContent };
      })
      .sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));

    return {
      stalePages,
      abandonedTodos
    };
  }

  // ─── Message Handler ──────────────────────────────────────────

  self.onmessage = function(e) {
    const { id, type, payload } = e.data;
    let result;
    const transferables = [];

    try {
      switch (type) {
        case 'extractWords':
          result = extractAndScoreWords(payload.content);
          break;
        case 'toMarkdown':
          result = blocksToMarkdown(payload.blocks);
          break;
        case 'batchSortKeys':
          result = generateBatchSortKeys(payload.count);
          break;
        case 'computeDiff':
          result = computeDiff(payload.before, payload.after);
          break;
        case 'detectCommunities':
          result = detectCommunities(payload.nodes, payload.links);
          break;
        case 'layoutGraph':
          result = layoutGraph(payload.nodes, payload.links, payload.width, payload.height, payload.iterations);
          if (result && result.coordinates && result.coordinates.buffer instanceof ArrayBuffer) {
            transferables.push(result.coordinates.buffer);
          }
          break;
        case 'computeKnowledgeVelocity':
          result = computeKnowledgeVelocity(payload);
          break;
        case 'scoreNextActions':
          result = scoreNextActions(payload.todos);
          break;
        case 'scoreForgetting':
          result = scoreForgetting(payload.pages, payload.todos);
          break;
        default:
          throw new Error('Unknown transform type: ' + type);
      }

      if (transferables.length > 0) {
        self.postMessage({ id, result, error: null }, transferables);
      } else {
        self.postMessage({ id, result, error: null });
      }
    } catch (err) {
      self.postMessage({ id, result: null, error: err.message });
    }
  };
`;

// ─── Worker Manager ─────────────────────────────────────────────

let _worker: Worker | null = null;
let _messageId = 0;
const _pending = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

function getWorker(): Worker {
  if (!_worker) {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    _worker = new Worker(url);

    _worker.onmessage = (e: MessageEvent) => {
      const { id, result, error } = e.data;
      const handler = _pending.get(id);
      if (handler) {
        _pending.delete(id);
        if (error) handler.reject(new Error(error));
        else handler.resolve(result);
      }
    };

    _worker.onerror = (err: ErrorEvent) => {
      console.error('[TransformWorker] Worker error:', err);
      // Reject all pending
      for (const [id, handler] of _pending) {
        handler.reject(err);
        _pending.delete(id);
      }
    };
  }
  return _worker;
}

/**
 * Send a transform job to the worker.
 */
function postTransform(type: string, payload: any, transferables?: Transferable[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++_messageId;
    _pending.set(id, { resolve, reject });
    if (transferables && transferables.length > 0) {
      getWorker().postMessage({ id, type, payload }, transferables);
    } else {
      getWorker().postMessage({ id, type, payload });
    }

    // Timeout after 10s
    setTimeout(() => {
      if (_pending.has(id)) {
        _pending.delete(id);
        reject(new Error(`Transform "${type}" timed out`));
      }
    }, 10000);
  });
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Extract and score words from HTML content in a worker.
 */
export function workerExtractWords(content: string): Promise<{ words: string[]; frequencies: Record<string, number>; totalWords: number }> {
  return postTransform('extractWords', { content });
}

/**
 * Convert blocks to Markdown in a worker.
 */
export function workerToMarkdown(blocks: any[]): Promise<string> {
  return postTransform('toMarkdown', { blocks });
}

/**
 * Generate batch sort keys in a worker.
 */
export function workerBatchSortKeys(count: number): Promise<string[]> {
  return postTransform('batchSortKeys', { count });
}

/**
 * Compute a JSON diff between two objects in a worker.
 */
export function workerComputeDiff(before: any, after: any): Promise<Record<string, any>> {
  return postTransform('computeDiff', { before, after });
}

function isWorkerSupported(): boolean {
  if (typeof Worker === 'undefined') return false;
  if ((Worker as any).name === 'MockWorker') return false;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') return false;
  if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return false;
  }
  return true;
}

/**
 * Offload Louvain Community Detection to worker to keep the main thread fluid.
 */
export async function workerDetectCommunities(
  nodes: Array<{ id: string }>,
  links: Array<{ source: string | { id: string }; target: string | { id: string } }>
): Promise<Record<string, string>> {
  if (!isWorkerSupported()) {
    return pureDetectCommunities(nodes, links);
  }
  try {
    return await postTransform('detectCommunities', { nodes, links });
  } catch (err) {
    console.warn('[TransformWorker] Falling back to synchronous detectCommunities:', err);
    return pureDetectCommunities(nodes, links);
  }
}

/**
 * Offload Louvain Community Detection and Force-Directed Layout Simulation
 * to worker. Returns typed Float32Array coordinates for zero-overhead transfer.
 */
export async function workerLayoutGraph(
  nodes: Array<{ id: string }>,
  links: Array<{ source: string | { id: string }; target: string | { id: string } }>,
  width = 800,
  height = 600,
  iterations = 60
): Promise<GraphLayoutResult> {
  if (!isWorkerSupported()) {
    return pureLayoutGraph(nodes, links, width, height, iterations);
  }
  try {
    return await postTransform('layoutGraph', { nodes, links, width, height, iterations });
  } catch (err) {
    console.warn('[TransformWorker] Falling back to pureLayoutGraph:', err);
    return pureLayoutGraph(nodes, links, width, height, iterations);
  }
}

/**
 * Offload Knowledge Velocity, 7-day activity windowing, and depth calculation to worker.
 */
export async function workerComputeKnowledgeVelocity(payload: KnowledgeVelocityPayload): Promise<KnowledgeVelocityResult> {
  if (!isWorkerSupported()) {
    return pureComputeKnowledgeVelocity(payload);
  }
  try {
    return await postTransform('computeKnowledgeVelocity', payload);
  } catch (err) {
    console.warn('[TransformWorker] Falling back to pureComputeKnowledgeVelocity:', err);
    return pureComputeKnowledgeVelocity(payload);
  }
}

/**
 * Offload Next Actions task priority extraction and scoring to worker.
 */
export async function workerScoreNextActions(todos: any[]): Promise<any[]> {
  if (!isWorkerSupported()) {
    return pureScoreNextActions(todos);
  }
  try {
    return await postTransform('scoreNextActions', { todos });
  } catch (err) {
    console.warn('[TransformWorker] Falling back to pureScoreNextActions:', err);
    return pureScoreNextActions(todos);
  }
}

/**
 * Offload stale pages and abandoned todos scoring to worker.
 */
export async function workerScoreForgetting(pages: any[], todos: any[]): Promise<{ stalePages: any[]; abandonedTodos: any[] }> {
  if (!isWorkerSupported()) {
    return pureScoreForgetting(pages, todos);
  }
  try {
    return await postTransform('scoreForgetting', { pages, todos });
  } catch (err) {
    console.warn('[TransformWorker] Falling back to pureScoreForgetting:', err);
    return pureScoreForgetting(pages, todos);
  }
}

/**
 * Terminate the worker (cleanup).
 */
export function terminateWorker(): void {
  if (_worker) {
    _worker.terminate();
    _worker = null;
    _pending.clear();
  }
}
