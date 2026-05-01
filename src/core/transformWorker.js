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

let _worker = null;
let _messageId = 0;
const _pending = new Map(); // id → { resolve, reject }

function getWorker() {
  if (!_worker) {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    _worker = new Worker(url);

    _worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const handler = _pending.get(id);
      if (handler) {
        _pending.delete(id);
        if (error) handler.reject(new Error(error));
        else handler.resolve(result);
      }
    };

    _worker.onerror = (err) => {
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
 * @param {string} type - Transform type
 * @param {object} payload - Data for the transform
 * @returns {Promise<any>} Transform result
 */
function postTransform(type, payload) {
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
 * @param {string} content - HTML content
 * @returns {Promise<{ words: string[], frequencies: object, totalWords: number }>}
 */
export function workerExtractWords(content) {
  return postTransform('extractWords', { content });
}

/**
 * Convert blocks to Markdown in a worker.
 * @param {Array} blocks - Block objects
 * @returns {Promise<string>} Markdown string
 */
export function workerToMarkdown(blocks) {
  return postTransform('toMarkdown', { blocks });
}

/**
 * Generate batch sort keys in a worker.
 * @param {number} count - Number of keys to generate
 * @returns {Promise<string[]>} Array of sort keys
 */
export function workerBatchSortKeys(count) {
  return postTransform('batchSortKeys', { count });
}

/**
 * Compute a JSON diff between two objects in a worker.
 * @param {object} before - Previous state
 * @param {object} after - Current state
 * @returns {Promise<object>} Diff object
 */
export function workerComputeDiff(before, after) {
  return postTransform('computeDiff', { before, after });
}

/**
 * Terminate the worker (cleanup).
 */
export function terminateWorker() {
  if (_worker) {
    _worker.terminate();
    _worker = null;
    _pending.clear();
  }
}
