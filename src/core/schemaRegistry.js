/**
 * ─── Schema Registry ────────────────────────────────────────────
 * Formalizes block type definitions with versioned schemas,
 * default properties, validation, and migration paths.
 *
 * New block types are registered here. When a block's schema
 * version is behind the current version, `migrate()` runs
 * the chain of migrations to bring it up to date.
 */

import { BLOCK_PROPERTY_DEFAULTS } from '../utils/blockSchema';

// ─── Registry Storage ───────────────────────────────────────────

const _schemas = new Map();

// ─── Schema Shape ───────────────────────────────────────────────
// {
//   type: 'text',
//   version: 1,
//   defaults: { ... },
//   validate: (properties) => { errors: [] } | null,
//   migrations: [
//     { from: 0, to: 1, up: (properties) => migratedProperties }
//   ]
// }

/**
 * Register a block type schema.
 *
 * @param {string} type - Block type name
 * @param {object} schema - Schema definition
 * @param {number} schema.version - Current schema version
 * @param {object} schema.defaults - Default property values
 * @param {Function} [schema.validate] - Validation function
 * @param {Array} [schema.migrations] - Migration chain
 */
export function registerBlockType(type, schema) {
  _schemas.set(type, {
    type,
    version: schema.version || 1,
    defaults: schema.defaults || {},
    validate: schema.validate || (() => null),
    migrations: schema.migrations || [],
  });
}

/**
 * Get the schema for a block type.
 */
export function getSchema(type) {
  return _schemas.get(type) || null;
}

/**
 * Get all registered block types.
 */
export function getRegisteredTypes() {
  return Array.from(_schemas.keys());
}

/**
 * Get the default properties for a block type.
 */
export function getDefaults(type) {
  const schema = _schemas.get(type);
  return schema ? { ...schema.defaults } : {};
}

/**
 * Validate a block's properties against its type schema.
 * Returns null if valid, or an object with errors.
 */
export function validate(type, properties) {
  const schema = _schemas.get(type);
  if (!schema) return null; // Unknown type, skip validation
  return schema.validate(properties);
}

/**
 * Migrate a block's properties from its current schema version
 * to the latest version. Returns the migrated properties.
 *
 * @param {string} type - Block type
 * @param {object} properties - Current properties
 * @param {number} fromVersion - Current schema version of the block
 * @returns {{ properties: object, version: number }}
 */
export function migrate(type, properties, fromVersion = 0) {
  const schema = _schemas.get(type);
  if (!schema) return { properties, version: fromVersion };

  let currentProps = { ...properties };
  let currentVersion = fromVersion;

  // Sort migrations by 'from' version
  const sortedMigrations = [...schema.migrations].sort((a, b) => a.from - b.from);

  for (const migration of sortedMigrations) {
    if (migration.from >= currentVersion && migration.to > currentVersion) {
      try {
        currentProps = migration.up(currentProps);
        currentVersion = migration.to;
      } catch (e) {
        console.error(`[SchemaRegistry] Migration failed for ${type} v${migration.from}→v${migration.to}:`, e);
        break;
      }
    }
  }

  return { properties: currentProps, version: currentVersion };
}

/**
 * Ensure a block's properties have all required defaults filled in.
 * Does NOT overwrite existing values — only fills missing keys.
 */
export function ensureDefaults(type, properties = {}) {
  const schema = _schemas.get(type);
  if (!schema) return { ...properties };

  const merged = { ...schema.defaults };
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

// ─── Seed Registry with Existing Block Types ────────────────────

function seedRegistry() {
  // Register all existing block types from BLOCK_PROPERTY_DEFAULTS
  for (const [type, defaults] of Object.entries(BLOCK_PROPERTY_DEFAULTS)) {
    registerBlockType(type, {
      version: 1,
      defaults,
      validate: (props) => {
        // Basic structural validation
        if (type === 'todo' && typeof props.checked !== 'boolean') {
          return { errors: ['todo.checked must be boolean'] };
        }
        if (type === 'code' && props.language && typeof props.language !== 'string') {
          return { errors: ['code.language must be string'] };
        }
        return null;
      },
      migrations: [],
    });
  }
}

// Auto-seed on module load
seedRegistry();
