import Dexie, { type Table } from 'dexie';
import { useSecurityStore } from '../stores/securityStore';
import type { Block, Page, DatabaseRow, DatabaseCell, Tracker, TrackerEntry } from '../types';

export interface RelationEdge {
  edgeId: string;
  fromEntity?: string;
  fromId: string;
  toEntity?: string;
  toId: string;
  relationType: string;
  metadata?: Record<string, any>;
}

export interface OpRecord {
  opId: string;
  actorId: string;
  lamport: number;
  entityType: string;
  entityId: string;
  opType: string;
  createdAt: number;
  payload?: any;
  deps?: any[];
}

export interface OperationRecord {
  id: string;
  actorId: string;
  entityType: string;
  entityId: string;
  op?: string;
  payload?: any;
  prevPayload?: any;
  timestamp: number;
  lamport?: number;
  meta?: Record<string, any>;
  seq?: number;
  [key: string]: any;
}

export interface SyncStateRecord {
  peerId: string;
  health: string;
  lastAckLamport?: number;
  cursor?: string | null;
}

export interface BlobRecord {
  hash: string;
  createdAt: number;
  blob?: Blob | any;
  mimeType?: string;
  size?: number;
  data?: any;
}

export interface PermissionRecord {
  id?: number;
  entityType: string;
  entityId: string;
  actorId: string;
}

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  desc: string;
  isRead: boolean;
  createdAt: number;
}

export interface CrdtUpdateRecord {
  id?: number | string;
  pageId: string;
  update?: any;
  timestamp: number;
  isSnapshot?: boolean;
}

export class ManiacDexie extends Dexie {
  pages!: Table<Page, string>;
  blocks!: Table<Block, string>;
  database_rows!: Table<DatabaseRow, string>;
  database_cells!: Table<DatabaseCell, string>;
  relations!: Table<RelationEdge, string>;
  ops!: Table<OpRecord, string>;
  operations!: Table<OperationRecord, number>;
  sync_state!: Table<SyncStateRecord, string>;
  crdt_updates!: Table<CrdtUpdateRecord, any>;
  blobs!: Table<BlobRecord, string>;
  trackers!: Table<Tracker, string>;
  tracker_entries!: Table<TrackerEntry, string>;
  permissions!: Table<PermissionRecord, number>;
  notifications!: Table<NotificationRecord, string>;

  constructor() {
    super('ManiacDB');
  }
}

export const db = new ManiacDexie();

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
  return tx.table('blocks').toCollection().modify((block: any) => {
    if (!block._isEncrypted && block.content) {
      const text = block.content.replace(/<[^>]*>/g, ' ').toLowerCase();
      block.words = [...new Set(text.split(/[\s\W]+/).filter((w: string) => w.length > 1))];
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
  return tx.table('blocks').toCollection().modify((block: any) => {
    if (block.parentId === undefined) {
      block.parentId = null;
    }
  });
});

db.version(6).stores({
  operations: '++seq, id, actorId, entityType, entityId, timestamp, [entityType+entityId]',
  permissions: '++id, entityType, entityId, actorId, [entityType+entityId+actorId]',
});

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
  blobs: 'hash, createdAt',
  trackers: 'id, name, createdAt, updatedAt',
  tracker_entries: 'id, trackerId, createdAt, updatedAt',
  permissions: '++id, entityType, entityId, actorId, [entityType+entityId+actorId]',
  operations: '++seq, id, actorId, entityType, entityId, timestamp, [entityType+entityId]',
}).upgrade(tx => {
  const now = Date.now();
  tx.table('blocks').toCollection().modify((b: any) => {
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

db.version(12).stores({
  pages: 'id, workspaceId, parentId, title, sortOrder, orderKey, isArchived, createdBy, createdAt, updatedAt, tombstonedAt, lastViewedAt',
  blocks: 'id, pageId, parentId, type, sortOrder, orderKey, [pageId+sortOrder], version, actorId, updatedAt, updatedLogical, *words',
  database_rows: 'id, blockId, createdAt, updatedAt',
  database_cells: 'id, rowId, propertyId, blockId, createdAt, updatedAt',
  relations: 'edgeId, fromId, toId, relationType, [fromEntity+fromId], [toEntity+toId]',
  ops: 'opId, actorId, lamport, entityType, entityId, opType, createdAt, [entityType+entityId], [actorId+lamport]',
  operations: '++seq, id, actorId, entityType, entityId, timestamp, [entityType+entityId]',
  sync_state: 'peerId, health',
  crdt_updates: '++id, pageId, timestamp',
  blobs: 'hash, createdAt',
  trackers: 'id, name, createdAt, updatedAt',
  tracker_entries: 'id, trackerId, createdAt, updatedAt',
  permissions: '++id, entityType, entityId, actorId, [entityType+entityId+actorId]',
  notifications: 'id, type, title, desc, isRead, createdAt'
}).upgrade(tx => {
  const now = Date.now();
  return tx.table('blocks').toCollection().modify((b: any) => {
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

export const extractWords = (content: any): string[] => {
  if (!content) return [];
  const text = typeof content === 'string' ? content.replace(/<[^>]*>/g, ' ').toLowerCase() : '';
  return [...new Set(text.split(/[\s\W]+/).filter((w: string) => w.length > 1))];
};

db.blocks.hook('creating', (primKey, obj: any) => {
  const key = useSecurityStore.getState().derivedKey;
  if (!key && obj.content) {
    obj.words = extractWords(obj.content);
  }
});

db.blocks.hook('updating', (mods: any, primKey, obj: any) => {
  const key = useSecurityStore.getState().derivedKey;
  if (!key && mods.content !== undefined) {
    mods.words = extractWords(mods.content);
  }
});

export async function seedDefaultData(): Promise<void> {
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
        type: 'heading1' as const,
        content: 'Welcome to Maniac 🧠',
        properties: {},
        sortOrder: 'a',
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'text' as const,
        content: 'Turn chaos into a system. Your local-first workspace for thoughts, tasks, and tracking.',
        properties: {},
        sortOrder: 'b',
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'callout' as const,
        content: 'Type / to insert different block types. Use the sidebar to create pages.',
        properties: { emoji: '💡' },
        sortOrder: 'c',
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'heading2' as const,
        content: 'Features',
        properties: {},
        sortOrder: 'd',
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'todo' as const,
        content: 'Create nested pages for organizing your thoughts',
        properties: { checked: false },
        sortOrder: 'e',
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'todo' as const,
        content: 'Use custom trackers to build mini-databases',
        properties: { checked: false },
        sortOrder: 'f',
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'todo' as const,
        content: 'Press Cmd+K to open the command palette',
        properties: { checked: false },
        sortOrder: 'g',
      },
      {
        id: nanoid(),
        pageId: gettingStartedId,
        type: 'heading1' as const,
        content: 'Getting Started 🚀',
        properties: {},
        sortOrder: 'a',
      },
      {
        id: nanoid(),
        pageId: gettingStartedId,
        type: 'text' as const,
        content: 'Start by creating a new page from the sidebar, then add blocks using the / command.',
        properties: {},
        sortOrder: 'b',
      },
      {
        id: nanoid(),
        pageId: gettingStartedId,
        type: 'quote' as const,
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

    await db.blocks.bulkAdd(seedBlocks as any);
  }
}
