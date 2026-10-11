import { nanoid } from 'nanoid';
import type { Page, Block, BlockType } from '../types';
import type { Tracker, TrackerEntry, TrackerField } from '../types/tracker';
import type { DatabaseProperty, DatabaseRow } from '../types/database';

export function createId(): string {
  return nanoid();
}

export function createPage(overrides: Partial<Page> = {}): Page {
  const now = Date.now();
  const sortOrder = overrides.sortOrder || (overrides as any).orderKey || 'm';
  return {
    id: overrides.id || createId(),
    workspaceId: overrides.workspaceId || 'local',
    parentId: overrides.parentId !== undefined ? overrides.parentId : null,
    title: overrides.title || '',
    icon: overrides.icon || '📝',
    coverImage: overrides.coverImage !== undefined ? overrides.coverImage : null,
    fullWidth: overrides.fullWidth !== undefined ? overrides.fullWidth : true,
    version: overrides.version !== undefined ? overrides.version : 1,
    actorId: overrides.actorId || 'local-actor',
    updatedLogical: overrides.updatedLogical !== undefined ? overrides.updatedLogical : now,
    isArchived: !!overrides.isArchived,
    createdBy: overrides.createdBy || 'local-actor',
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    lastViewedAt: overrides.lastViewedAt || now,
    ...overrides,
    sortOrder,
    orderKey: sortOrder,
  };
}

export function createBlock(pageId: string, type: BlockType = 'text', overrides: Partial<Block> = {}): Block {
  const now = Date.now();
  const sortOrder = overrides.sortOrder || (overrides as any).orderKey || 'm';
  return {
    id: overrides.id || createId(),
    pageId,
    parentId: overrides.parentId !== undefined ? overrides.parentId : null,
    type,
    content: overrides.content || '',
    properties: overrides.properties || {},
    richText: overrides.richText || [],
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

export function createTracker(overrides: Partial<Tracker> = {}): Tracker {
  const now = Date.now();
  return {
    id: createId(),
    name: 'Untitled Tracker',
    description: '',
    icon: '📊',
    fields: [],
    viewType: 'table',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createTrackerEntry(trackerId: string, data: Record<string, any> = {}, overrides: Partial<TrackerEntry> = {}): TrackerEntry {
  const now = Date.now();
  return {
    id: createId(),
    trackerId,
    data,
    createdAt: overrides.createdAt || now,
    updatedAt: now,
    ...overrides,
  };
}

export function createTrackerField(overrides: Partial<TrackerField> = {}): TrackerField {
  return {
    id: createId(),
    name: '',
    type: 'text',
    options: [],
    defaultValue: null,
    ...overrides,
  };
}

export function buildPageTree(pages: Page[]): any[] {
  const map: Record<string, any> = {};
  const roots: any[] = [];

  pages.forEach((p) => {
    map[p.id] = { ...p, children: [] };
  });

  pages.forEach((p) => {
    if (p.parentId && map[p.parentId]) {
      map[p.parentId].children.push(map[p.id]);
    } else {
      roots.push(map[p.id]);
    }
  });

  // Sort children by sortOrder
  const sortChildren = (nodes: any[]) => {
    nodes.sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));
    nodes.forEach((n) => sortChildren(n.children));
  };
  sortChildren(roots);

  return roots;
}

export function debounce<T extends (...args: any[]) => any>(fn: T, ms = 300): (...args: Parameters<T>) => void {
  let timer: any;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(timestamp: number | null | undefined): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getPlainText(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';
  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  }
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export function createProperty(overrides: Partial<DatabaseProperty> = {}): DatabaseProperty {
  return {
    id: createId(),
    name: 'Untitled',
    type: 'text',
    width: 200,
    config: {},
    ...overrides,
  };
}

export function createDatabaseRow(schema: DatabaseProperty[] = [], overrides: Partial<DatabaseRow> = {}): DatabaseRow {
  const now = Date.now();
  const values: Record<string, any> = {};
  schema.forEach(prop => {
    if (prop.type === 'created_time' || (prop.type as any) === 'created_at') {
      values[prop.id] = now;
    } else if (prop.type === 'checkbox') {
      values[prop.id] = false;
    } else {
      values[prop.id] = '';
    }
  });
  return {
    id: createId(),
    blockId: overrides.blockId || '',
    values,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Generates a lexical sort string between two other strings.
 * Implementation based on fractional indexing to allow infinite insertions.
 */
export function generateLexicalOrder(prev: string | null = null, next: string | null = null): string {
  if (!prev) prev = '';
  if (!next) {
    if (prev === '') return 'm';
    const last = prev[prev.length - 1];
    if (last < 'z') return prev.slice(0, -1) + String.fromCharCode(last.charCodeAt(0) + 1);
    return prev + 'm';
  }

  let i = 0;
  while (true) {
    const charA = prev[i] || ' ';
    const charB = next[i] || '{';

    if (charA === charB) {
      i++;
      continue;
    }

    const codeA = charA.charCodeAt(0);
    const codeB = charB.charCodeAt(0);

    if (codeB - codeA > 1) {
      return prev.slice(0, i) + String.fromCharCode(Math.floor((codeA + codeB) / 2));
    } else {
      i++;
      if (i > 100) return prev + 'm';
    }
  }
}

/**
 * Merges two HTML strings by joining the inner contents of their root elements.
 * Preserves structural formatting tags (bold, italic, links).
 */
export function mergeHTML(html1: string | null | undefined, html2: string | null | undefined): string {
  if (!html1) return html2 || '<p></p>';
  if (!html2) return html1 || '<p></p>';

  const parser = new DOMParser();
  const doc1 = parser.parseFromString(html1, 'text/html');
  const doc2 = parser.parseFromString(html2, 'text/html');

  const body1 = doc1.body;
  const body2 = doc2.body;

  const destContainer = body1.lastElementChild || body1;
  const sourceContainer = body2.firstElementChild || body2;

  if (sourceContainer && destContainer) {
    while (sourceContainer.firstChild) {
      destContainer.appendChild(sourceContainer.firstChild);
    }
    sourceContainer.remove();
  }

  while (body2.firstChild) {
    body1.appendChild(body2.firstChild);
  }

  return body1.innerHTML;
}

export function isEmptyContent(html: string | null | undefined): boolean {
  if (!html) return true;
  const clean = html.replace(/<[^>]*>/g, '').trim();
  const decoded = clean.replace(/&nbsp;/g, ' ').trim();
  return decoded === '';
}
