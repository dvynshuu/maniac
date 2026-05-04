import { db, extractWords } from '../db/database';
import { SecurityService } from '../utils/securityService';

// State
let derivedKey = null;
let hmacKey = null;

// Batching queue
let pendingQueue = new Map(); // table -> Map<id, { op, payload }>
let flushTimer = null;
const FLUSH_INTERVAL = 100; // ms

// Cross-tab broadcast channel
const channel = new BroadcastChannel('maniac-sync');

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'INIT_KEYS') {
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
  
  // 1. Enqueue the opLog append itself
  if (!pendingQueue.has('operations')) pendingQueue.set('operations', new Map());
  pendingQueue.get('operations').set(operation.id || Date.now().toString() + Math.random(), { op: 'create', payload: operation });

  // 2. Determine target table for the actual entity
  let table = null;
  if (entityType === 'BLOCK') table = 'blocks';
  else if (entityType === 'PAGE') table = 'pages';
  else if (entityType === 'CRDT') table = 'crdt_updates';

  if (!table) {
    scheduleFlush();
    return;
  }

  if (!pendingQueue.has(table)) {
    pendingQueue.set(table, new Map());
  }

  const tableQueue = pendingQueue.get(table);

  if (op === 'delete') {
    tableQueue.set(entityId, { op: 'delete', meta });
  } else if (op === 'update' || op === 'reorder' || op === 'change_type') {
    if (tableQueue.has(entityId)) {
      const existing = tableQueue.get(entityId);
      if (existing.op === 'delete') {
        // If it was deleted, an update is ignored
      } else {
        tableQueue.set(entityId, { op: existing.op, payload: { ...existing.payload, ...payload }, meta: { ...existing.meta, ...meta } });
      }
    } else {
      tableQueue.set(entityId, { op: 'update', payload: { ...payload }, meta });
    }
  } else if (op === 'create' || op === 'CRDT_UPDATE') {
    tableQueue.set(entityId, { op, payload: { ...payload }, meta });
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
        if (hmacKey) {
          const words = extractWords(dbObj.content);
          const hashed = await Promise.all(words.map(w => SecurityService.hmacWord(w, hmacKey)));
          dbObj.words = hashed.filter(Boolean);
        } else {
          dbObj.words = [];
        }
        if (dbObj.content.length > 0) {
          dbObj.content = await SecurityService.encrypt(dbObj.content, derivedKey);
        }
      }
      if (dbObj.properties !== undefined && typeof dbObj.properties === 'object' && dbObj.properties !== null) {
        dbObj.properties = await SecurityService.encrypt(JSON.stringify(dbObj.properties), derivedKey);
      }
    } else {
      if (dbObj.title !== undefined && typeof dbObj.title === 'string') {
        dbObj.title = await SecurityService.encrypt(dbObj.title, derivedKey);
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
        
        let dbPayload = payload;
        if (op !== 'delete' && (table === 'blocks' || table === 'pages')) {
          dbPayload = await encryptForDB(payload, isBlock);
        }

        transactions.push(async () => {
          if (op === 'delete') {
            await db[table].delete(id);
            if (meta?.source !== 'remote') {
              broadcastOps.push({ entityType: table === 'blocks' ? 'BLOCK' : 'PAGE', entityId: id, op: 'delete' });
            }
          } else if (op === 'update' || op === 'reorder' || op === 'change_type') {
            await db[table].update(id, dbPayload);
            if (meta?.source !== 'remote') {
              broadcastOps.push({ entityType: table === 'blocks' ? 'BLOCK' : 'PAGE', entityId: id, op: 'update', payload }); 
            }
          } else if (op === 'create') {
            await db[table].put(dbPayload);
            if (meta?.source !== 'remote') {
              broadcastOps.push({ entityType: table === 'blocks' ? 'BLOCK' : 'PAGE', entityId: id, op: 'create', payload });
            }
          } else if (op === 'CRDT_UPDATE') {
            await db[table].put({
              id: `${payload.pageId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              pageId: payload.pageId,
              update: payload.update,
              timestamp: Date.now()
            });
            if (meta?.source !== 'remote') {
              broadcastOps.push({ entityType: 'CRDT', entityId: payload.pageId, op: 'CRDT_UPDATE', payload });
            }
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
      // Need a random tab ID, can just use a fake one or let the channel handle it.
      channel.postMessage({
        type: 'OP_COMMITTED',
        operation: { ...op, meta: { source: 'worker', timestamp: Date.now() } },
        tabId: 'worker-tab',
        timestamp: Date.now()
      });
    }

  } catch (error) {
    console.error('[PersistenceWorker] Flush failed:', error);
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
