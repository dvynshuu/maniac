import { db, extractWords } from '../db/database';
import { SecurityService } from '../utils/securityService';

// State
let derivedKey = null;
let hmacKey = null;

// Word HMAC Cache (LRU) to eliminate thousands of redundant crypto sign calls
const HMAC_CACHE_MAX = 5000;
const hmacWordCache = new Map();

async function getOrComputeHmacWord(word, key) {
  if (hmacWordCache.has(word)) {
    const cached = hmacWordCache.get(word);
    hmacWordCache.delete(word);
    hmacWordCache.set(word, cached);
    return cached;
  }

  const hash = await SecurityService.hmacWord(word, key);
  if (hash) {
    if (hmacWordCache.size >= HMAC_CACHE_MAX) {
      const oldestKey = hmacWordCache.keys().next().value;
      hmacWordCache.delete(oldestKey);
    }
    hmacWordCache.set(word, hash);
  }
  return hash;
}

// Batching queue
let pendingQueue = new Map(); // table -> Map<id, { op, payload }>
let flushTimer = null;
const FLUSH_INTERVAL = 300; // ms
let flushCounter = 0;

// Cross-tab broadcast channel
const channel = new BroadcastChannel('maniac-sync');

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'INIT_KEYS') {
    if (derivedKey !== payload.derivedKey || hmacKey !== payload.hmacKey) {
      hmacWordCache.clear();
    }
    derivedKey = payload.derivedKey;
    hmacKey = payload.hmacKey;
    return;
  }

  if (type === 'ENQUEUE_OP') {
    const { op } = payload;
    enqueueOperation(op);
  }
  
  if (type === 'FORCE_FLUSH') {
    await flushQueue();
  }
};

function enqueueOperation(operation) {
  const { entityType, entityId, op, payload, meta } = operation;
  
  // 1. Enqueue the opLog append only for domain entities (block, page), not raw CRDT keystrokes
  if (entityType === 'block' || entityType === 'BLOCK' || entityType === 'page' || entityType === 'PAGE') {
    if (!pendingQueue.has('operations')) pendingQueue.set('operations', new Map());
    pendingQueue.get('operations').set(operation.id || `${Date.now()}-${Math.random()}`, { op: 'create', payload: operation });
  }

  // 2. Determine target table for the actual entity
  let table = null;
  if (entityType === 'block' || entityType === 'BLOCK') table = 'blocks';
  else if (entityType === 'page' || entityType === 'PAGE') table = 'pages';
  else if (entityType === 'CRDT') table = 'crdt_updates';

  if (!table) {
    scheduleFlush();
    return;
  }

  if (!pendingQueue.has(table)) {
    pendingQueue.set(table, new Map());
  }

  const tableQueue = pendingQueue.get(table);

  const opUpper = String(op).toUpperCase();

  if (opUpper === 'DELETE') {
    tableQueue.set(entityId, { op: opUpper, meta });
  } else if (opUpper === 'UPDATE' || opUpper === 'REORDER' || opUpper === 'CHANGE_TYPE') {
    if (tableQueue.has(entityId)) {
      const existing = tableQueue.get(entityId);
      if (existing.op === 'DELETE') {
        // If it was deleted, an update is ignored
      } else {
        tableQueue.set(entityId, { op: existing.op, payload: { ...existing.payload, ...payload }, meta: { ...existing.meta, ...meta } });
      }
    } else {
      tableQueue.set(entityId, { op: opUpper, payload: { ...payload }, meta });
    }
  } else if (opUpper === 'CREATE' || opUpper === 'CRDT_UPDATE') {
    tableQueue.set(entityId, { op: opUpper, payload: { ...payload }, meta });
  }

  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushQueue();
  }, FLUSH_INTERVAL);
}

async function encryptForDB(data, isBlock) {
  const dbObj = { ...data };

  if (derivedKey) {
    if (isBlock) {
      if (dbObj.content !== undefined && typeof dbObj.content === 'string') {
        if (!SecurityService.isEncrypted(dbObj.content)) {
          if (hmacKey) {
            const words = extractWords(dbObj.content);
            const hashed = await Promise.all(words.map(w => getOrComputeHmacWord(w, hmacKey)));
            dbObj.words = hashed.filter(Boolean);
          } else {
            dbObj.words = [];
          }
          if (dbObj.content.length > 0) {
            dbObj.content = await SecurityService.encrypt(dbObj.content, derivedKey);
          }
        }
      }
      if (dbObj.properties !== undefined) {
        if (typeof dbObj.properties === 'object' && dbObj.properties !== null) {
          dbObj.properties = await SecurityService.encrypt(JSON.stringify(dbObj.properties), derivedKey);
        } else if (typeof dbObj.properties === 'string' && !SecurityService.isEncrypted(dbObj.properties)) {
          dbObj.properties = await SecurityService.encrypt(dbObj.properties, derivedKey);
        }
      }
    } else {
      if (dbObj.title !== undefined && typeof dbObj.title === 'string') {
        if (!SecurityService.isEncrypted(dbObj.title)) {
          dbObj.title = await SecurityService.encrypt(dbObj.title, derivedKey);
        }
      }
    }
    dbObj._isEncrypted = true;
  } else {
    if (isBlock && dbObj.content !== undefined && typeof dbObj.content === 'string') {
      dbObj.words = extractWords(dbObj.content);
    }
  }

  return dbObj;
}

async function flushQueue() {
  if (pendingQueue.size === 0) return;

  const snapshot = pendingQueue;
  pendingQueue = new Map();

  const transactions = [];
  const broadcastOps = []; // Collect ops to broadcast to other tabs

  try {
    for (const [table, map] of snapshot) {
      const isBlock = table === 'blocks';
      for (const [id, item] of map) {
        const { op, payload, meta } = item;

        transactions.push(async () => {
          const opUpper = String(op).toUpperCase();
          try {
            if (opUpper === 'DELETE') {
              await db[table].delete(id);
              if (meta?.source !== 'remote') {
                broadcastOps.push({ entityType: table === 'blocks' ? 'block' : 'page', entityId: id, op: 'delete', tabId: meta?.tabId });
              }
            } else if (opUpper === 'UPDATE' || opUpper === 'REORDER' || opUpper === 'CHANGE_TYPE') {
              let dbPayload = payload;
              if (table === 'blocks' || table === 'pages') {
                const existing = await db[table].get(id);
                if (existing) {
                  const merged = { ...existing, ...payload };
                  dbPayload = await encryptForDB(merged, isBlock);
                  await db[table].put(dbPayload);
                } else {
                  dbPayload = await encryptForDB(payload, isBlock);
                  await db[table].update(id, dbPayload);
                }
              } else {
                await db[table].update(id, dbPayload);
              }
              if (meta?.source !== 'remote') {
                broadcastOps.push({ entityType: table === 'blocks' ? 'block' : 'page', entityId: id, op: 'update', payload, tabId: meta?.tabId }); 
              }
            } else if (opUpper === 'CREATE') {
              const dbPayload = (table === 'blocks' || table === 'pages') ? await encryptForDB(payload, isBlock) : payload;
              await db[table].put(dbPayload);
              if (meta?.source !== 'remote') {
                broadcastOps.push({ entityType: table === 'blocks' ? 'block' : 'page', entityId: id, op: 'create', payload, tabId: meta?.tabId });
              }
            } else if (opUpper === 'CRDT_UPDATE') {
              await db[table].put({
                id: `${payload.pageId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                pageId: payload.pageId,
                update: payload.update,
                timestamp: Date.now()
              });
              if (meta?.source !== 'remote') {
                broadcastOps.push({ entityType: 'CRDT', entityId: payload.pageId, op: 'CRDT_UPDATE', payload, tabId: meta?.tabId });
              }
            }
          } catch (dbErr) {
            console.error(`[PersistenceWorker] DB error on table "${table}" (op: "${opUpper}", id: "${id}"):`, dbErr, payload);
            throw dbErr;
          }
        });
      }
    }

    // Execute in a single Dexie transaction for atomicity
    const tableNames = Array.from(snapshot.keys());
    await db.transaction('rw', tableNames.map(t => db[t]), async () => {
      for (const t of transactions) {
        await t();
      }
    });

    // Broadcast AFTER successful commit
    for (const op of broadcastOps) {
      const { tabId: origTabId, ...opData } = op;
      channel.postMessage({
        type: 'OP_COMMITTED',
        operation: { ...opData, meta: { source: 'worker', timestamp: Date.now() } },
        tabId: origTabId || 'worker-tab',
        timestamp: Date.now()
      });
    }

    self.postMessage({ type: 'FLUSH_COMPLETE', timestamp: Date.now() });

    // Periodically prune operations table to keep last 500 records and prevent disk bloat
    flushCounter++;
    if (flushCounter % 20 === 0) {
      db.operations.count().then(count => {
        if (count > 600) {
          const excess = count - 500;
          return db.operations.limit(excess).primaryKeys().then(keys => {
            if (keys.length > 0) return db.operations.bulkDelete(keys);
          });
        }
      }).catch(() => {});
    }

  } catch (error) {
    console.error('[PersistenceWorker] Flush failed:', error?.name, error?.message, error?.stack, error);
    self.postMessage({ type: 'FLUSH_ERROR', error: error?.message || 'Unknown error' });
    // Put items back into the queue
    for (const [table, map] of snapshot) {
      if (!pendingQueue.has(table)) pendingQueue.set(table, new Map());
      const currentQueue = pendingQueue.get(table);
      for (const [id, data] of map) {
        if (!currentQueue.has(id)) currentQueue.set(id, data);
      }
    }
  }
}
