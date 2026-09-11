import Dexie from 'dexie';
import { SecurityService } from '../utils/securityService';
import { useSecurityStore } from '../stores/securityStore';

export const db = new Dexie('ManiacDB');

db.version(1).stores({
  pages: 'id, parentId, title, sortOrder, isArchived, createdAt, updatedAt',
  blocks: 'id, pageId, type, sortOrder, createdAt, updatedAt',
  database_rows: 'id, blockId, createdAt, updatedAt',
  trackers: 'id, name, createdAt, updatedAt',
  tracker_entries: 'id, trackerId, createdAt, updatedAt',
});

db.version(2).stores({
  blocks: 'id, pageId, type, sortOrder, createdAt, updatedAt, *words',
  database_cells: 'id, rowId, propertyId, blockId, createdAt, updatedAt',
}).upgrade(tx => {
  return tx.blocks.toCollection().modify(block => {
    if (!block._isEncrypted && block.content) {
      const text = block.content.replace(/<[^>]*>/g, ' ').toLowerCase();
      block.words = [...new Set(text.split(/[\s\W]+/).filter(w => w.length > 1))];
    } else {
      block.words = [];
    }
  });
});

db.version(3).stores({
  blobs: 'hash, createdAt',
});

db.version(4).stores({
  pages: 'id, parentId, title, sortOrder, isArchived, createdAt, updatedAt, lastViewedAt',
  blocks: 'id, pageId, type, sortOrder, createdAt, updatedAt, lastViewedAt, *words',
});

db.version(5).stores({
  blocks: 'id, pageId, parentId, type, sortOrder, createdAt, updatedAt, lastViewedAt, *words',
}).upgrade(tx => {
  return tx.blocks.toCollection().modify(block => {
    if (block.parentId === undefined) {
      block.parentId = null;
    }
  });
});

db.version(6).stores({
  operations: '++seq, id, actorId, entityType, entityId, timestamp, [entityType+entityId]',
  permissions: '++id, entityType, entityId, actorId, [entityType+entityId+actorId]',
});

// ─── Version 7: Target Data Model Design ────────────────────────
// Adds all tables to support the Notion-level architecture:
//   pages, blocks, block_props, richtext_docs, relations,
//   databases, db_rows, db_cells, ops, sync_state
// ─── Version 9: Comprehensive Schema Restoration ────────────────
// Restores all essential tables for the full application suite.
db.version(9).stores({
  pages: 'id, workspaceId, parentId, title, sortOrder, isArchived, createdBy, createdAt, updatedAt, tombstonedAt, lastViewedAt',
  blocks: 'id, pageId, parentId, type, orderKey, propsRef, richTextRef, version, actorId, updatedAt, updatedLogical, *words',
  block_props: 'blockId, jsonSchemaVersion',
  richtext_docs: 'docId',
  relations: 'edgeId, fromId, toId, relationType, [fromEntity+fromId], [toEntity+toId]',
  database_defs: 'dbId, schemaVersion, name',
  db_rows: 'rowId, dbId, orderKey, version, actorId',
  db_cells: '[rowId+propertyId], rowId, propertyId, valueType, version',
  ops: 'opId, actorId, lamport, entityType, entityId, opType, createdAt, [entityType+entityId], [actorId+lamport]',
  sync_state: 'peerId, health',
  
  // Storage & Assets
  blobs: 'hash, createdAt',
  
  // Tracker System
  trackers: 'id, name, createdAt, updatedAt',
  tracker_entries: 'id, trackerId, createdAt, updatedAt',
  
  // Security & Legacy Ops
  permissions: '++id, entityType, entityId, actorId, [entityType+entityId+actorId]',
  operations: '++seq, id, actorId, entityType, entityId, timestamp, [entityType+entityId]',
}).upgrade(tx => {
  // Ensure all entities have basic logical/physical timestamps
  const now = Date.now();
  tx.table('blocks').toCollection().modify(b => {
    if (!b.updatedAt) b.updatedAt = now;
    if (b.version === undefined) b.version = 1;
  });
});

db.version(10).stores({
  crdt_updates: '++id, pageId, timestamp'
});

db.version(11).stores({
  notifications: 'id, type, title, desc, isRead, createdAt'
});

// ─── Version 12: Canonical Architecture Consolidation ──────────
// Restores database_rows and database_cells, ensures blocks are indexed
// on sortOrder and [pageId+sortOrder], and syncs all canonical fields.
db.version(12).stores({
  pages: 'id, workspaceId, parentId, title, sortOrder, orderKey, isArchived, createdBy, createdAt, updatedAt, tombstonedAt, lastViewedAt',
  blocks: 'id, pageId, parentId, type, sortOrder, orderKey, [pageId+sortOrder], version, actorId, updatedAt, updatedLogical, *words',
  
  // Inline Relational Databases
  database_rows: 'id, blockId, createdAt, updatedAt',
  database_cells: 'id, rowId, propertyId, blockId, createdAt, updatedAt',
  
  // Relations and Knowledge Graph
  relations: 'edgeId, fromId, toId, relationType, [fromEntity+fromId], [toEntity+toId]',
  
  // Operations & Replication
  ops: 'opId, actorId, lamport, entityType, entityId, opType, createdAt, [entityType+entityId], [actorId+lamport]',
  operations: '++seq, id, actorId, entityType, entityId, timestamp, [entityType+entityId]',
  sync_state: 'peerId, health',
  crdt_updates: '++id, pageId, timestamp',
  
  // Assets & System
  blobs: 'hash, createdAt',
  trackers: 'id, name, createdAt, updatedAt',
  tracker_entries: 'id, trackerId, createdAt, updatedAt',
  permissions: '++id, entityType, entityId, actorId, [entityType+entityId+actorId]',
  notifications: 'id, type, title, desc, isRead, createdAt'
}).upgrade(tx => {
  const now = Date.now();
  return tx.table('blocks').toCollection().modify(b => {
    if (!b.sortOrder && b.orderKey) b.sortOrder = b.orderKey;
    if (!b.orderKey && b.sortOrder) b.orderKey = b.sortOrder;
    if (!b.sortOrder) b.sortOrder = 'm';
    if (!b.orderKey) b.orderKey = b.sortOrder;
    if (b.version === undefined) b.version = 1;
    if (!b.actorId) b.actorId = 'local-actor';
    if (b.updatedLogical === undefined) b.updatedLogical = b.updatedAt || now;
    if (!b.updatedAt) b.updatedAt = now;
  });
});

export const extractWords = (content) => {
  if (!content) return [];
  const text = typeof content === 'string' ? content.replace(/<[^>]*>/g, ' ').toLowerCase() : '';
  return [...new Set(text.split(/[\s\W]+/).filter(w => w.length > 1))];
};

// Encryption Hooks have been moved to the store level to prevent DataCloneError
// in Dexie 3+ updating hooks. See blockStore.js, pageStore.js, databaseStore.js.

// We still keep the synchronous hook for setting default words when unencrypted
db.blocks.hook('creating', (primKey, obj) => {
  const key = useSecurityStore.getState().derivedKey;
  if (!key && obj.content) {
    obj.words = extractWords(obj.content);
  }
});

db.blocks.hook('updating', (mods, primKey, obj) => {
  const key = useSecurityStore.getState().derivedKey;
  if (!key && mods.content !== undefined) {
    mods.words = extractWords(mods.content);
  }
});

// Seed default data on first launch
export async function seedDefaultData() {
  const pageCount = await db.pages.count();
  if (pageCount === 0) {
    const { nanoid } = await import('nanoid');
    const now = Date.now();
    const welcomePageId = nanoid();
    const gettingStartedId = nanoid();

    await db.pages.bulkAdd([
      {
        id: welcomePageId,
        workspaceId: 'local',
        parentId: null,
        title: 'Welcome to Maniac',
        icon: '🧠',
        coverImage: null,
        fullWidth: true,
        sortOrder: 'a',
        orderKey: 'a',
        isArchived: false,
        createdBy: 'local-actor',
        createdAt: now,
        updatedAt: now,
        lastViewedAt: now,
      },
      {
        id: gettingStartedId,
        workspaceId: 'local',
        parentId: welcomePageId,
        title: 'Getting Started',
        icon: '🚀',
        coverImage: null,
        fullWidth: true,
        sortOrder: 'a',
        orderKey: 'a',
        isArchived: false,
        createdBy: 'local-actor',
        createdAt: now,
        updatedAt: now,
        lastViewedAt: now,
      },
    ]);

    const seedBlocks = [
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'heading1',
        content: 'Welcome to Maniac 🧠',
        properties: {},
        sortOrder: 'a',
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'text',
        content: 'Turn chaos into a system. Your local-first workspace for thoughts, tasks, and tracking.',
        properties: {},
        sortOrder: 'b',
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'callout',
        content: 'Type / to insert different block types. Use the sidebar to create pages.',
        properties: { emoji: '💡' },
        sortOrder: 'c',
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'heading2',
        content: 'Features',
        properties: {},
        sortOrder: 'd',
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'todo',
        content: 'Create nested pages for organizing your thoughts',
        properties: { checked: false },
        sortOrder: 'e',
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'todo',
        content: 'Use custom trackers to build mini-databases',
        properties: { checked: false },
        sortOrder: 'f',
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'todo',
        content: 'Press Cmd+K to open the command palette',
        properties: { checked: false },
        sortOrder: 'g',
      },
      {
        id: nanoid(),
        pageId: gettingStartedId,
        type: 'heading1',
        content: 'Getting Started 🚀',
        properties: {},
        sortOrder: 'a',
      },
      {
        id: nanoid(),
        pageId: gettingStartedId,
        type: 'text',
        content: 'Start by creating a new page from the sidebar, then add blocks using the / command.',
        properties: {},
        sortOrder: 'b',
      },
      {
        id: nanoid(),
        pageId: gettingStartedId,
        type: 'quote',
        content: 'The best way to predict the future is to create it.',
        properties: {},
        sortOrder: 'c',
      },
    ].map(b => ({
      ...b,
      parentId: null,
      orderKey: b.sortOrder,
      version: 1,
      actorId: 'local-actor',
      updatedLogical: now,
      createdAt: now,
      updatedAt: now,
    }));

    await db.blocks.bulkAdd(seedBlocks);
  }
}
