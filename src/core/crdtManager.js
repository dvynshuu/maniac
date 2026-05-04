import * as Y from 'yjs';
import { db } from '../db/database';
import { dispatch } from './commandBus';

// In-memory cache of Y.Docs per pageId
const _docs = new Map();

/**
 * Get or create a Y.Doc for a specific page.
 * Loads existing updates from IndexedDB in the background.
 */
export function getCrdtDoc(pageId) {
  if (_docs.has(pageId)) {
    return _docs.get(pageId);
  }

  const doc = new Y.Doc();
  _docs.set(pageId, doc);

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
    }
  });

  // Listen for local changes to persist and broadcast
  doc.on('update', (update, origin) => {
    if (origin === 'local-db' || origin === 'remote') return;
    dispatch({
      type: 'crdt/update',
      payload: { pageId, update }
    }).catch(e => console.error('[CRDT] Failed to dispatch update', e));
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
  const doc = getCrdtDoc(pageId);
  Y.applyUpdate(doc, update, 'remote');
}
