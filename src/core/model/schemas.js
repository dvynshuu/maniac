/**
 * ─── Core: Model Schemas ────────────────────────────────────────
 * Canonical entity definitions matching the target data model.
 *
 * Target tables:
 *  pages(id, workspaceId, parentId, title, icon, cover, createdBy, createdAt, updatedAt, tombstonedAt?)
 *  blocks(id, pageId, parentId, type, orderKey, propsRef, richTextRef, version, actorId, updatedLogical)
 *  block_props(blockId, jsonSchemaVersion, payload)
 *  richtext_docs(docId, crdtState, plainTextIndex, marksIndex)
 *  relations(edgeId, fromEntity, fromId, toEntity, toId, relationType, metadata)
 *  databases(dbId, schemaVersion, name, propertyDefs)
 *  db_rows(rowId, dbId, orderKey, version, actorId)
 *  db_cells(rowId, propertyId, value, valueType, version)
 *  ops(opId, actorId, lamport, entityType, entityId, opType, payload, deps, createdAt)
 *  sync_state(peerId, lastAckLamport, cursor, health)
 */

// ─── Entity Type Constants ──────────────────────────────────────

export const ENTITY_TYPES = {
  PAGE: 'page',
  BLOCK: 'block',
  BLOCK_PROPS: 'block_props',
  RICHTEXT_DOC: 'richtext_doc',
  RELATION: 'relation',
  DATABASE: 'database',
  DB_ROW: 'db_row',
  DB_CELL: 'db_cell',
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

// ─── Page ───────────────────────────────────────────────────────

export const PageSchema = {
  id: { type: 'string', required: true },
  workspaceId: { type: 'string', default: 'local' },
  parentId: { type: 'string', nullable: true },
  title: { type: 'string', default: '' },
  icon: { type: 'string', default: '📝' },
  cover: { type: 'string', nullable: true },
  createdBy: { type: 'string', default: 'local-actor' },
  createdAt: { type: 'number', required: true },
  updatedAt: { type: 'number', required: true },
  tombstonedAt: { type: 'number', nullable: true },
};

// ─── Block ──────────────────────────────────────────────────────

export const BlockSchema = {
  id: { type: 'string', required: true },
  pageId: { type: 'string', required: true },
  parentId: { type: 'string', nullable: true },
  type: { type: 'string', required: true },
  orderKey: { type: 'string', required: true },     // fractional/lexical sort key
  propsRef: { type: 'string', nullable: true },      // FK → block_props.blockId
  richTextRef: { type: 'string', nullable: true },   // FK → richtext_docs.docId
  version: { type: 'number', default: 0 },           // monotonic version counter
  actorId: { type: 'string', default: 'local-actor' },
  updatedLogical: { type: 'number', default: 0 },    // Lamport timestamp
};

// ─── Block Props ────────────────────────────────────────────────

export const BlockPropsSchema = {
  blockId: { type: 'string', required: true },       // PK
  jsonSchemaVersion: { type: 'number', default: 1 },
  payload: { type: 'object', default: {} },          // Arbitrary JSON (checked, emoji, language, etc.)
};

// ─── Rich Text Document ─────────────────────────────────────────

export const RichTextDocSchema = {
  docId: { type: 'string', required: true },         // PK
  crdtState: { type: 'string', nullable: true },     // Serialized Y.js/Automerge state
  plainTextIndex: { type: 'string', default: '' },   // Extracted plain text for search
  marksIndex: { type: 'string', default: '' },       // Serialized mark positions (bold, italic, etc.)
};

// ─── Relation Edge ──────────────────────────────────────────────

export const RelationSchema = {
  edgeId: { type: 'string', required: true },
  fromEntity: { type: 'string', required: true },    // 'page' | 'block' | 'database'
  fromId: { type: 'string', required: true },
  toEntity: { type: 'string', required: true },
  toId: { type: 'string', required: true },
  relationType: { type: 'string', required: true },  // See RELATION_TYPES
  metadata: { type: 'object', default: {} },
};

// ─── Database ───────────────────────────────────────────────────

export const DatabaseDefSchema = {
  dbId: { type: 'string', required: true },
  schemaVersion: { type: 'number', default: 1 },
  name: { type: 'string', default: '' },
  propertyDefs: { type: 'object', default: [] },     // Array of property definitions
};

// ─── Database Row ───────────────────────────────────────────────

export const DbRowSchema = {
  rowId: { type: 'string', required: true },
  dbId: { type: 'string', required: true },
  orderKey: { type: 'string', required: true },
  version: { type: 'number', default: 0 },
  actorId: { type: 'string', default: 'local-actor' },
};

// ─── Database Cell ──────────────────────────────────────────────

export const DbCellSchema = {
  rowId: { type: 'string', required: true },         // Composite key: rowId + propertyId
  propertyId: { type: 'string', required: true },
  value: { type: 'any' },
  valueType: { type: 'string', default: 'text' },    // 'text', 'number', 'date', 'select', etc.
  version: { type: 'number', default: 0 },
};

// ─── Operation Log ──────────────────────────────────────────────

export const OpSchema = {
  opId: { type: 'string', required: true },
  actorId: { type: 'string', required: true },
  lamport: { type: 'number', required: true },       // Lamport clock for causal ordering
  entityType: { type: 'string', required: true },
  entityId: { type: 'string', required: true },
  opType: { type: 'string', required: true },        // CREATE, UPDATE, DELETE, MOVE
  payload: { type: 'object', default: {} },
  deps: { type: 'array', default: [] },              // Array of opIds this op depends on
  createdAt: { type: 'number', required: true },
};

// ─── Sync State ─────────────────────────────────────────────────

export const SyncStateSchema = {
  peerId: { type: 'string', required: true },
  lastAckLamport: { type: 'number', default: 0 },
  cursor: { type: 'string', nullable: true },        // Replication cursor / bookmark
  health: { type: 'string', default: 'unknown' },    // 'healthy', 'degraded', 'offline'
};

// ─── Factory Functions ──────────────────────────────────────────

import { createId } from '../ids/identity.js';

export function createPage(overrides = {}) {
  const now = Date.now();
  return {
    id: createId(),
    workspaceId: 'local',
    parentId: null,
    title: '',
    icon: '📝',
    cover: null,
    createdBy: 'local-actor',
    createdAt: now,
    updatedAt: now,
    tombstonedAt: null,
    ...overrides,
  };
}

export function createBlock(pageId, type = 'text', overrides = {}) {
  const id = createId();
  const now = Date.now();
  return {
    id,
    pageId,
    parentId: null,
    type,
    orderKey: 'm',
    propsRef: id,           // Same id — 1:1 with block_props
    richTextRef: id,        // Same id — 1:1 with richtext_docs
    version: 0,
    actorId: 'local-actor',
    updatedLogical: 0,
    ...overrides,
  };
}

export function createBlockProps(blockId, payload = {}) {
  return {
    blockId,
    jsonSchemaVersion: 1,
    payload,
  };
}

export function createRichTextDoc(docId, plainText = '') {
  return {
    docId,
    crdtState: null,
    plainTextIndex: plainText,
    marksIndex: '',
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

export function createDatabaseDef(name = '', propertyDefs = []) {
  return {
    dbId: createId(),
    schemaVersion: 1,
    name,
    propertyDefs,
  };
}

export function createDbRow(dbId, orderKey = 'm') {
  return {
    rowId: createId(),
    dbId,
    orderKey,
    version: 0,
    actorId: 'local-actor',
  };
}

export function createDbCell(rowId, propertyId, value = '', valueType = 'text') {
  return {
    rowId,
    propertyId,
    value,
    valueType,
    version: 0,
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
    health: 'unknown',
  };
}
