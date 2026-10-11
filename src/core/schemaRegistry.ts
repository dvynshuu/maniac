/**
 * ─── Schema Registry ────────────────────────────────────────────
 * Formalizes block type definitions with versioned schemas,
 * default properties, validation, and migration paths.
 */

import { BLOCK_PROPERTY_DEFAULTS } from '../utils/blockSchema';

export interface BlockSchemaMigration {
  from: number;
  to: number;
  up: (properties: Record<string, any>) => Record<string, any>;
}

export interface BlockTypeSchemaDefinition {
  type?: string;
  version?: number;
  defaults?: Record<string, any>;
  validate?: (properties: any) => { errors: string[] } | null;
  migrations?: BlockSchemaMigration[];
}

const _schemas = new Map<string, Required<BlockTypeSchemaDefinition>>();

export function registerBlockType(type: string, schema: BlockTypeSchemaDefinition): void {
  _schemas.set(type, {
    type,
    version: schema.version || 1,
    defaults: schema.defaults || {},
    validate: schema.validate || (() => null),
    migrations: schema.migrations || [],
  });
}

export function getSchema(type: string): Required<BlockTypeSchemaDefinition> | null {
  return _schemas.get(type) || null;
}

export function getRegisteredTypes(): string[] {
  return Array.from(_schemas.keys());
}

export function getDefaults(type: string): Record<string, any> {
  const schema = _schemas.get(type);
  return schema ? { ...schema.defaults } : {};
}

export function validate(type: string, properties: any): { errors: string[] } | null {
  const schema = _schemas.get(type);
  if (!schema) return null;
  return schema.validate(properties);
}

export function migrate(type: string, properties: Record<string, any>, fromVersion = 0): { properties: Record<string, any>; version: number } {
  const schema = _schemas.get(type);
  if (!schema) return { properties, version: fromVersion };

  let currentProps = { ...properties };
  let currentVersion = fromVersion;

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

export function ensureDefaults(type: string, properties: Record<string, any> = {}): Record<string, any> {
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

function seedRegistry(): void {
  for (const [type, defaults] of Object.entries(BLOCK_PROPERTY_DEFAULTS)) {
    registerBlockType(type, {
      version: 1,
      defaults,
      validate: (props: any) => {
        if (type === 'todo' && typeof props?.checked !== 'boolean') {
          return { errors: ['todo.checked must be boolean'] };
        }
        if (type === 'code' && props?.language && typeof props.language !== 'string') {
          return { errors: ['code.language must be string'] };
        }
        return null;
      },
      migrations: [],
    });
  }
}

seedRegistry();
