/**
 * ─── Core: Model Schemas ────────────────────────────────────────
 * Canonical entity definitions for the Maniac ecosystem.
 */

export const ENTITY_TYPES = {
  PAGE: 'page',
  BLOCK: 'block',
  DATABASE: 'database',
  PROPERTY: 'property',
  RELATION: 'relation',
};

/**
 * Base Entity definition
 */
export const BaseEntitySchema = {
  id: 'string',
  createdAt: 'number',
  updatedAt: 'number',
  createdBy: 'string', // actorId
  version: 'string',   // monotonic timestamp
};

/**
 * Page Model
 */
export const PageSchema = {
  ...BaseEntitySchema,
  type: ENTITY_TYPES.PAGE,
  title: 'string',
  icon: 'string',
  coverImage: 'string',
  parentId: 'string|null',
  isArchived: 'boolean',
  isTemplate: 'boolean',
  sortOrder: 'string',
};

/**
 * Block Model
 */
export const BlockSchema = {
  ...BaseEntitySchema,
  type: ENTITY_TYPES.BLOCK,
  pageId: 'string',
  parentId: 'string|null',
  blockType: 'string', // 'text', 'heading1', 'todo', etc.
  content: 'string',   // HTML/Encrypted
  properties: 'object',
  sortOrder: 'string',
};

/**
 * Database Model
 */
export const DatabaseSchema = {
  ...BaseEntitySchema,
  type: ENTITY_TYPES.DATABASE,
  title: 'string',
  description: 'string',
  schema: 'object', // Column definitions
  viewConfigs: 'object', // Array of views (Table, Board, etc)
};

/**
 * Relation Edge Model (Graph Connectivity)
 */
export const RelationEdgeSchema = {
  id: 'string',
  sourceId: 'string',
  targetId: 'string',
  type: 'string', // 'mention', 'backlink', 'parent_child'
  metadata: 'object',
};
