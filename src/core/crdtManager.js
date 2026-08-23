import * as Y from 'yjs';
import { db } from '../db/database';
import { dispatch } from './commandBus';

// In-memory cache of Y.Docs per pageId
const _docs = new Map();
// Local update counters to trigger compaction
const _updateCounts = new Map();
const COMPACTION_THRESHOLD = 50;

/**
 * Compact all historical CRDT updates for a page into a single snapshot.
 */
export async function compactCrdtUpdates(pageId, doc, existingUpdates = null) {
  if (!pageId || !doc) return;
  try {
    const snapshot = Y.encodeStateAsUpdate(doc);
    const now = Date.now();
    const snapshotId = `${pageId}-snapshot-${now}`;
    
    const updatesToDelete = existingUpdates || await db.crdt_updates.where('pageId').equals(pageId).toArray();
    const idsToDelete = updatesToDelete.map(u => u.id).filter(Boolean);

    await db.transaction('rw', db.crdt_updates, async () => {
      if (idsToDelete.length > 0) {
        await db.crdt_updates.bulkDelete(idsToDelete);
      }
      await db.crdt_updates.put({
        id: snapshotId,
        pageId,
        update: snapshot,
        timestamp: now,
        isSnapshot: true,
      });
    });
    _updateCounts.set(pageId, 0);
    console.debug(`[CRDT] Compacted ${idsToDelete.length} updates for page "${pageId}" into a single snapshot.`);
  } catch (e) {
    console.warn('[CRDT] Compaction failed:', e);
  }
}

/**
 * Get or create a Y.Doc for a specific page.
 * Loads existing updates from IndexedDB in the background and compacts if needed.
 */
export function getCrdtDoc(pageId) {
  if (!pageId || typeof pageId !== 'string') {
    console.warn('[CRDT] getCrdtDoc called with invalid pageId:', pageId);
    return new Y.Doc(); // Return a throwaway doc to avoid crashes
  }

  if (_docs.has(pageId)) {
    return _docs.get(pageId);
  }

  const doc = new Y.Doc();
  _docs.set(pageId, doc);
  _updateCounts.set(pageId, 0);

  // Load existing updates from DB async
  db.crdt_updates.where('pageId').equals(pageId).sortBy('timestamp').then(updates => {
    if (updates.length > 0) {
      doc.transact(() => {
        updates.forEach(u => {
          try {
            Y.applyUpdate(doc, u.update, 'local-db');
          } catch (e) {
            console.error('[CRDT] Failed to apply update from DB', e);
          }
        });
      }, 'local-db');

      // If updates have accumulated, compact in the background
      if (updates.length >= COMPACTION_THRESHOLD) {
        compactCrdtUpdates(pageId, doc, updates);
      }
    }
  });

  // Listen for local changes to persist and broadcast
  doc.on('update', (update, origin) => {
    if (origin === 'local-db' || origin === 'remote') return;
    
    const count = (_updateCounts.get(pageId) || 0) + 1;
    _updateCounts.set(pageId, count);

    dispatch({
      type: 'crdt/update',
      payload: { pageId, update }
    }).catch(e => console.error('[CRDT] Failed to dispatch update', e));

    if (count >= COMPACTION_THRESHOLD) {
      // Defer compaction to not block typing
      setTimeout(() => compactCrdtUpdates(pageId, doc), 2000);
    }
  });

  return doc;
}

/**
 * Get the Y.XmlFragment for a specific block.
 */
export function getBlockFragment(pageId, blockId) {
  const doc = getCrdtDoc(pageId);
  return doc.getXmlFragment(`block-${blockId}`);
}

/**
 * Apply a remote update to a Y.Doc.
 */
export function applyRemoteUpdate(pageId, update) {
  if (!pageId || typeof pageId !== 'string') {
    console.warn('[CRDT] applyRemoteUpdate called with invalid pageId:', pageId);
    return;
  }
  const doc = getCrdtDoc(pageId);
  Y.applyUpdate(doc, update, 'remote');
}
