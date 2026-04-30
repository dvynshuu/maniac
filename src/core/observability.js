/**
 * ─── Observability ──────────────────────────────────────────────
 * Lightweight instrumentation using the browser Performance API.
 * Provides structured tracing, event logging, and slow-op detection.
 */

// ─── Configuration ──────────────────────────────────────────────

const IS_DEV = import.meta.env?.DEV ?? false;
const SLOW_OP_THRESHOLD_MS = 100;
const MAX_EVENT_LOG = 200;

// ─── Internal State ─────────────────────────────────────────────

const _eventLog = [];
const _slowOpCallbacks = new Set();

// ─── Tracing ────────────────────────────────────────────────────

/**
 * Wraps an async or sync function with performance marks.
 * Returns the function's result.
 *
 * @param {string} name - Trace name (e.g. 'command:block/create')
 * @param {Function} fn - The function to trace
 * @returns {Promise<any>} The function's return value
 */
export async function trace(name, fn) {
  const markStart = `maniac:${name}:start`;
  const markEnd = `maniac:${name}:end`;
  const measureName = `maniac:${name}`;

  performance.mark(markStart);
  try {
    const result = await fn();
    return result;
  } finally {
    performance.mark(markEnd);
    try {
      performance.measure(measureName, markStart, markEnd);
      const entries = performance.getEntriesByName(measureName, 'measure');
      const duration = entries[entries.length - 1]?.duration ?? 0;

      if (duration > SLOW_OP_THRESHOLD_MS) {
        const slowEvent = { name, duration, timestamp: Date.now() };
        if (IS_DEV) {
          console.warn(`[Perf] Slow operation: ${name} took ${duration.toFixed(1)}ms`, slowEvent);
        }
        _slowOpCallbacks.forEach(cb => {
          try { cb(slowEvent); } catch {}
        });
      }
    } catch {
      // Performance API may not support measure in all contexts
    }
    // Clean up marks to prevent memory leaks
    try {
      performance.clearMarks(markStart);
      performance.clearMarks(markEnd);
      performance.clearMeasures(measureName);
    } catch {}
  }
}

/**
 * Synchronous trace variant for hot paths that can't be async.
 */
export function traceSync(name, fn) {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    if (duration > SLOW_OP_THRESHOLD_MS) {
      const slowEvent = { name, duration, timestamp: Date.now() };
      if (IS_DEV) {
        console.warn(`[Perf] Slow sync operation: ${name} took ${duration.toFixed(1)}ms`);
      }
      _slowOpCallbacks.forEach(cb => {
        try { cb(slowEvent); } catch {}
      });
    }
  }
}

// ─── Structured Events ─────────────────────────────────────────

/**
 * Log a structured event for debugging and instrumentation.
 *
 * @param {string} name - Event name (e.g. 'command:dispatched', 'block:rendered')
 * @param {object} data - Event payload
 */
export function event(name, data = {}) {
  const entry = {
    name,
    data,
    timestamp: Date.now(),
  };

  _eventLog.push(entry);
  if (_eventLog.length > MAX_EVENT_LOG) {
    _eventLog.splice(0, _eventLog.length - MAX_EVENT_LOG);
  }

  if (IS_DEV) {
    console.debug(`[Event] ${name}`, data);
  }
}

/**
 * Get the recent event log.
 */
export function getEventLog() {
  return [..._eventLog];
}

/**
 * Clear the event log.
 */
export function clearEventLog() {
  _eventLog.length = 0;
}

// ─── Slow Operation Detection ───────────────────────────────────

/**
 * Register a callback for when an operation exceeds the threshold.
 * Returns an unsubscribe function.
 */
export function onSlowOp(callback) {
  _slowOpCallbacks.add(callback);
  return () => _slowOpCallbacks.delete(callback);
}

/**
 * Get all recent performance traces from the Performance API.
 */
export function getTraces() {
  return performance.getEntriesByType('measure')
    .filter(e => e.name.startsWith('maniac:'))
    .map(e => ({
      name: e.name.replace('maniac:', ''),
      duration: e.duration,
      startTime: e.startTime,
    }));
}
