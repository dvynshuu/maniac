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

  // ─── Message Handler ──────────────────────────────────────────

  self.onmessage = function(e) {
    const { id, type, payload } = e.data;
    let result;

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
        default:
          throw new Error('Unknown transform type: ' + type);
      }

      self.postMessage({ id, result, error: null });
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
function postTransform(type: string, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++_messageId;
    _pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, type, payload });

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

/**
 * Offload Louvain Community Detection to worker to keep the main thread fluid.
 */
export async function workerDetectCommunities(
  nodes: Array<{ id: string }>,
  links: Array<{ source: string | { id: string }; target: string | { id: string } }>
): Promise<Record<string, string>> {
  if (typeof Worker === 'undefined') {
    const { detectCommunities } = await import('../utils/louvain');
    return detectCommunities(nodes, links);
  }
  try {
    return await postTransform('detectCommunities', { nodes, links });
  } catch (err) {
    console.warn('[TransformWorker] Falling back to synchronous detectCommunities:', err);
    const { detectCommunities } = await import('../utils/louvain');
    return detectCommunities(nodes, links);
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
