/**
 * ─── Core: Model Schemas ────────────────────────────────────────
 * Canonical domain entity definitions matching the consolidated MANIAC architecture.
 *
 * ONE Canonical Model:
 *  - Pages: pages(id, workspaceId, parentId, title, icon, coverImage, fullWidth, sortOrder, orderKey, isArchived, createdBy, createdAt, updatedAt, lastViewedAt, tombstonedAt?)
 *  - Blocks: blocks(id, pageId, parentId, type, sortOrder, orderKey, content, properties, richText, version, actorId, updatedLogical, createdAt, updatedAt, _isEncrypted?, *words?)
 *  - Database Rows: database_rows(id, blockId, createdAt, updatedAt)
 *  - Database Cells: database_cells(id, rowId, propertyId, blockId, value, createdAt, updatedAt)
 *  - Relations: relations(edgeId, fromEntity, fromId, toEntity, toId, relationType, metadata)
 *  - Operation Log: ops(opId, actorId, lamport, entityType, entityId, opType, payload, deps, createdAt)
 *  - Sync State: sync_state(peerId, lastAckLamport, cursor, health)
 */

import { nanoid } from 'nanoid';

export function createId() {
  return nanoid();
}

// ─── Entity Type Constants ──────────────────────────────────────

export const ENTITY_TYPES = {
  PAGE: 'page',
  BLOCK: 'block',
  RELATION: 'relation',
  DATABASE: 'database',
  DATABASE_ROW: 'database_row',
  DATABASE_CELL: 'database_cell',
  TRACKER: 'tracker',
  TRACKER_ENTRY: 'tracker_entry',
  OP: 'op',
  SYNC_STATE: 'sync_state',
};

// ─── Relation Types ─────────────────────────────────────────────

export const RELATION_TYPES = {
  MENTION: 'mention',
  BACKLINK: 'backlink',
  PARENT_CHILD: 'parent_child',
  DB_RELATION: 'db_relation',
  SYNCED_REF: 'synced_ref',
};

// ─── Page Schema ────────────────────────────────────────────────

export const PageSchema = {
  id: { type: 'string', required: true },
  workspaceId: { type: 'string', default: 'local' },
  parentId: { type: 'string', nullable: true },
  title: { type: 'string', default: '' },
  icon: { type: 'string', default: '📝' },
  coverImage: { type: 'string', nullable: true },
  fullWidth: { type: 'boolean', default: true },
  sortOrder: { type: 'string', required: true },
  orderKey: { type: 'string', required: true },
  isArchived: { type: 'boolean', default: false },
  createdBy: { type: 'string', default: 'local-actor' },
  createdAt: { type: 'number', required: true },
  updatedAt: { type: 'number', required: true },
  lastViewedAt: { type: 'number', required: true },
  tombstonedAt: { type: 'number', nullable: true },
};

// ─── Block Schema ───────────────────────────────────────────────

export const BlockSchema = {
  id: { type: 'string', required: true },
  pageId: { type: 'string', required: true },
  parentId: { type: 'string', nullable: true },
  type: { type: 'string', required: true },
  sortOrder: { type: 'string', required: true },      // Fractional / lexical sort key
  orderKey: { type: 'string', required: true },       // Alias for sortOrder
  content: { type: 'string', default: '' },          // Rich text HTML or plain text
  properties: { type: 'object', default: {} },       // Type-specific properties payload
  richText: { type: 'array', default: [] },          // Structured rich text spans
  version: { type: 'number', default: 1 },           // Monotonic version counter for sync
  actorId: { type: 'string', default: 'local-actor' },
  updatedLogical: { type: 'number', default: 0 },    // Lamport clock timestamp
  createdAt: { type: 'number', required: true },
  updatedAt: { type: 'number', required: true },
};

// ─── Database Row Schema ────────────────────────────────────────

export const DatabaseRowSchema = {
  id: { type: 'string', required: true },
  blockId: { type: 'string', required: true },
  createdAt: { type: 'number', required: true },
  updatedAt: { type: 'number', required: true },
};

// ─── Database Cell Schema ───────────────────────────────────────

export const DatabaseCellSchema = {
  id: { type: 'string', required: true },
  rowId: { type: 'string', required: true },
  propertyId: { type: 'string', required: true },
  blockId: { type: 'string', required: true },
  value: { type: 'any' },
  createdAt: { type: 'number', required: true },
  updatedAt: { type: 'number', required: true },
};

// ─── Relation Edge Schema ───────────────────────────────────────

export const RelationSchema = {
  edgeId: { type: 'string', required: true },
  fromEntity: { type: 'string', required: true },
  fromId: { type: 'string', required: true },
  toEntity: { type: 'string', required: true },
  toId: { type: 'string', required: true },
  relationType: { type: 'string', required: true },
  metadata: { type: 'object', default: {} },
};

// ─── Operation Log Schema ───────────────────────────────────────

export const OpSchema = {
  opId: { type: 'string', required: true },
  actorId: { type: 'string', required: true },
  lamport: { type: 'number', required: true },
  entityType: { type: 'string', required: true },
  entityId: { type: 'string', required: true },
  opType: { type: 'string', required: true },
  payload: { type: 'object', default: {} },
  deps: { type: 'array', default: [] },
  createdAt: { type: 'number', required: true },
};

// ─── Sync State Schema ──────────────────────────────────────────

export const SyncStateSchema = {
  peerId: { type: 'string', required: true },
  lastAckLamport: { type: 'number', default: 0 },
  cursor: { type: 'string', nullable: true },
  health: { type: 'string', default: 'healthy' },
};

// ─── Factory Functions ──────────────────────────────────────────

export function createPage(overrides = {}) {
  const now = Date.now();
  const sortOrder = overrides.sortOrder || overrides.orderKey || 'm';
  return {
    id: overrides.id || createId(),
    workspaceId: overrides.workspaceId || 'local',
    parentId: overrides.parentId !== undefined ? overrides.parentId : null,
    title: overrides.title || '',
    icon: overrides.icon || '📝',
    coverImage: overrides.coverImage !== undefined ? overrides.coverImage : null,
    fullWidth: overrides.fullWidth !== undefined ? overrides.fullWidth : true,
    sortOrder,
    orderKey: sortOrder,
    isArchived: !!overrides.isArchived,
    createdBy: overrides.createdBy || 'local-actor',
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    lastViewedAt: overrides.lastViewedAt || now,
    tombstonedAt: overrides.tombstonedAt || null,
    ...overrides,
    sortOrder,
    orderKey: sortOrder,
  };
}

export function createBlock(pageId, type = 'text', overrides = {}) {
  const now = Date.now();
  const sortOrder = overrides.sortOrder || overrides.orderKey || 'm';
  return {
    id: overrides.id || createId(),
    pageId,
    parentId: overrides.parentId !== undefined ? overrides.parentId : null,
    type,
    content: overrides.content || '',
    properties: overrides.properties ? { ...overrides.properties } : {},
    richText: overrides.richText || [],
    sortOrder,
    orderKey: sortOrder,
    version: overrides.version !== undefined ? overrides.version : 1,
    actorId: overrides.actorId || 'local-actor',
    updatedLogical: overrides.updatedLogical !== undefined ? overrides.updatedLogical : now,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    ...overrides,
    sortOrder,
    orderKey: sortOrder,
  };
}

export function createDatabaseRow(blockId, overrides = {}) {
  const now = Date.now();
  return {
    id: overrides.id || createId(),
    blockId,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    ...overrides,
  };
}

export function createDatabaseCell(rowId, propertyId, blockId, value = '', overrides = {}) {
  const now = Date.now();
  return {
    id: overrides.id || `${rowId}_${propertyId}`,
    rowId,
    propertyId,
    blockId,
    value,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    ...overrides,
  };
}

export function createRelation(fromEntity, fromId, toEntity, toId, relationType, metadata = {}) {
  return {
    edgeId: createId(),
    fromEntity,
    fromId,
    toEntity,
    toId,
    relationType,
    metadata,
  };
}

export function createOp(actorId, lamport, entityType, entityId, opType, payload = {}, deps = []) {
  return {
    opId: createId(),
    actorId,
    lamport,
    entityType,
    entityId,
    opType,
    payload,
    deps,
    createdAt: Date.now(),
  };
}

export function createSyncState(peerId) {
  return {
    peerId,
    lastAckLamport: 0,
    cursor: null,
    health: 'healthy',
  };
}

// ─── Normalization & Validation Helpers ──────────────────────────

export function normalizeBlock(raw, fallbackPageId = '') {
  if (!raw || typeof raw !== 'object') {
    return createBlock(fallbackPageId);
  }
  const now = Date.now();
  const sortOrder = String(raw.sortOrder || raw.orderKey || 'm');
  return {
    id: String(raw.id || createId()),
    pageId: String(raw.pageId || fallbackPageId),
    parentId: raw.parentId ? String(raw.parentId) : null,
    type: String(raw.type || 'text'),
    content: typeof raw.content === 'string' ? raw.content : '',
    properties: (raw.properties && typeof raw.properties === 'object' && !Array.isArray(raw.properties)) ? raw.properties : {},
    richText: Array.isArray(raw.richText) ? raw.richText : [],
    sortOrder,
    orderKey: sortOrder,
    version: typeof raw.version === 'number' ? raw.version : 1,
    actorId: String(raw.actorId || 'local-actor'),
    updatedLogical: typeof raw.updatedLogical === 'number' ? raw.updatedLogical : (raw.updatedAt || now),
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
    ...(raw._isEncrypted !== undefined ? { _isEncrypted: raw._isEncrypted } : {}),
    ...(Array.isArray(raw.words) ? { words: raw.words } : {}),
  };
}

export function normalizePage(raw) {
  if (!raw || typeof raw !== 'object') {
    return createPage();
  }
  const now = Date.now();
  const sortOrder = String(raw.sortOrder || raw.orderKey || 'm');
  return {
    id: String(raw.id || createId()),
    workspaceId: String(raw.workspaceId || 'local'),
    parentId: raw.parentId ? String(raw.parentId) : null,
    title: typeof raw.title === 'string' ? raw.title : '',
    icon: typeof raw.icon === 'string' ? raw.icon : '📝',
    coverImage: raw.coverImage ? String(raw.coverImage) : null,
    fullWidth: raw.fullWidth !== false,
    sortOrder,
    orderKey: sortOrder,
    isArchived: !!raw.isArchived,
    createdBy: String(raw.createdBy || 'local-actor'),
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
    lastViewedAt: typeof raw.lastViewedAt === 'number' ? raw.lastViewedAt : now,
    tombstonedAt: raw.tombstonedAt ? Number(raw.tombstonedAt) : null,
    ...(raw._isEncrypted !== undefined ? { _isEncrypted: raw._isEncrypted } : {}),
    ...(raw.isFavorite !== undefined ? { isFavorite: raw.isFavorite } : {}),
    ...(raw.isDatabaseRow !== undefined ? { isDatabaseRow: raw.isDatabaseRow, databaseBlockId: raw.databaseBlockId } : {}),
  };
}

export function validateBlock(block) {
  const errors = [];
  if (!block || typeof block !== 'object') {
    return { valid: false, errors: ['Block must be an object'] };
  }
  if (!block.id) errors.push('Missing block.id');
  if (!block.pageId) errors.push('Missing block.pageId');
  if (!block.type) errors.push('Missing block.type');
  if (!block.sortOrder) errors.push('Missing block.sortOrder');
  if (typeof block.version !== 'number') errors.push('block.version must be a number');
  return { valid: errors.length === 0, errors };
}

export function validatePage(page) {
  const errors = [];
  if (!page || typeof page !== 'object') {
    return { valid: false, errors: ['Page must be an object'] };
  }
  if (!page.id) errors.push('Missing page.id');
  if (!page.sortOrder) errors.push('Missing page.sortOrder');
  if (typeof page.title !== 'string') errors.push('page.title must be a string');
  return { valid: errors.length === 0, errors };
}

export function isCanonicalBlock(block) {
  return validateBlock(block).valid;
}

export function isCanonicalPage(page) {
  return validatePage(page).valid;
}

