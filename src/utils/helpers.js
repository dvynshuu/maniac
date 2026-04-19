import { nanoid } from 'nanoid';

export function createId() {
  return nanoid();
}

export function createPage(overrides = {}) {
  const now = Date.now();
  return {
    id: createId(),
    parentId: null,
    title: '',
    icon: '📝',
    coverImage: null,
    sortOrder: 'm',
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createBlock(pageId, type = 'text', overrides = {}) {
  const now = Date.now();
  return {
    id: createId(),
    pageId,
    type,
    content: '',
    properties: {},
    sortOrder: 'm',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createTracker(overrides = {}) {
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

export function createTrackerEntry(trackerId, data = {}) {
  const now = Date.now();
  return {
    id: createId(),
    trackerId,
    data,
    createdAt: now,
    updatedAt: now,
  };
}

export function createTrackerField(overrides = {}) {
  return {
    id: createId(),
    name: '',
    type: 'text',
    options: [],
    defaultValue: null,
    ...overrides,
  };
}

export function buildPageTree(pages) {
  const map = {};
  const roots = [];

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
  const sortChildren = (nodes) => {
    nodes.sort((a, b) => (a.sortOrder || '').localeCompare(b.sortOrder || ''));
    nodes.forEach((n) => sortChildren(n.children));
  };
  sortChildren(roots);

  return roots;
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getPlainText(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export function createProperty(overrides = {}) {
  return {
    id: createId(),
    name: 'Untitled',
    type: 'text',
    width: 200,
    config: {},
    ...overrides,
  };
}

export function createDatabaseRow(schema = [], overrides = {}) {
  const now = Date.now();
  const values = {};
  schema.forEach(prop => {
    if (prop.type === 'created_at') {
      values[prop.id] = now;
    } else if (prop.type === 'checkbox') {
      values[prop.id] = false;
    } else {
      values[prop.id] = '';
    }
  });
  return {
    id: createId(),
    values,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Generates a lexical sort string between two other strings.
 * This allows O(1) insertions without re-ordering existing items.
 */
export function generateLexicalOrder(prev = null, next = null) {
  const BASE = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  if (!prev && !next) return 'm';
  if (!prev) {
    const firstChar = next[0] || 'm';
    const index = BASE.indexOf(firstChar);
    return index > 0 ? BASE[index - 1] : '0' + next;
  }
  if (!next) {
    const lastChar = prev[prev.length - 1];
    const index = BASE.indexOf(lastChar);
    return index < BASE.length - 1 ? prev.slice(0, -1) + BASE[index + 1] : prev + 'm';
  }

  // Find the first character that differs
  let i = 0;
  while (i < Math.max(prev.length, next.length)) {
    const charA = prev[i] || BASE[0];
    const charB = next[i] || BASE[BASE.length - 1];
    
    if (charA === charB) {
      i++;
      continue;
    }

    const indexA = BASE.indexOf(charA);
    const indexB = BASE.indexOf(charB);

    if (indexB - indexA > 1) {
      // There's a character in between at this position
      return prev.slice(0, i) + BASE[Math.floor((indexA + indexB) / 2)];
    } else {
      // Characters are adjacent or one is prefix of other
      // Continue to next position
      i++;
    }
  }
  
  // Fallback
  return prev + 'm';
}
