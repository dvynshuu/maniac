/**
 * ─── Observability ──────────────────────────────────────────────
 * Lightweight instrumentation using the browser Performance API.
 * Provides structured tracing, event logging, and slow-op detection.
 */

const IS_DEV = import.meta.env?.DEV ?? false;
const SLOW_OP_THRESHOLD_MS = 100;
const MAX_EVENT_LOG = 200;

export interface EventLogEntry {
  name: string;
  data: any;
  timestamp: number;
}

export interface SlowOpEvent {
  name: string;
  duration: number;
  timestamp: number;
}

const _eventLog: EventLogEntry[] = [];
const _slowOpCallbacks = new Set<(event: SlowOpEvent) => void>();

export async function trace<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
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
        const slowEvent: SlowOpEvent = { name, duration, timestamp: Date.now() };
        if (IS_DEV) {
          console.warn(`[Perf] Slow operation: ${name} took ${duration.toFixed(1)}ms`, slowEvent);
        }
        _slowOpCallbacks.forEach(cb => {
          try { cb(slowEvent); } catch {}
        });
      }
    } catch {
      // Ignore
    }
    try {
      performance.clearMarks(markStart);
      performance.clearMarks(markEnd);
      performance.clearMeasures(measureName);
    } catch {}
  }
}

export function traceSync<T>(name: string, fn: () => T): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    if (duration > SLOW_OP_THRESHOLD_MS) {
      const slowEvent: SlowOpEvent = { name, duration, timestamp: Date.now() };
      if (IS_DEV) {
        console.warn(`[Perf] Slow sync operation: ${name} took ${duration.toFixed(1)}ms`);
      }
      _slowOpCallbacks.forEach(cb => {
        try { cb(slowEvent); } catch {}
      });
    }
  }
}

export function event(name: string, data: any = {}): void {
  const entry: EventLogEntry = {
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

export function getEventLog(): EventLogEntry[] {
  return [..._eventLog];
}

export function clearEventLog(): void {
  _eventLog.length = 0;
}

export function onSlowOp(callback: (event: SlowOpEvent) => void): () => void {
  _slowOpCallbacks.add(callback);
  return () => _slowOpCallbacks.delete(callback);
}

export function getTraces(): { name: string; duration: number; startTime: number }[] {
  return performance.getEntriesByType('measure')
    .filter(e => e.name.startsWith('maniac:'))
    .map(e => ({
      name: e.name.replace('maniac:', ''),
      duration: e.duration,
      startTime: e.startTime,
    }));
}
