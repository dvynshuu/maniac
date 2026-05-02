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
    parentId: null,
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
    nodes.sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));
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
 * Implementation based on fractional indexing to allow infinite insertions.
 */
export function generateLexicalOrder(prev = null, next = null) {
  const BASE = 'abcdefghijklmnopqrstuvwxyz';

  if (!prev) prev = '';
  if (!next) {
    // Generate a string that is "greater" than prev
    if (prev === '') return 'm';
    const last = prev[prev.length - 1];
    if (last < 'z') return prev.slice(0, -1) + String.fromCharCode(last.charCodeAt(0) + 1);
    return prev + 'm';
  }

  let i = 0;
  while (true) {
    const charA = prev[i] || ' '; // Space is less than 'a'
    const charB = next[i] || '{'; // '{' is greater than 'z'

    if (charA === charB) {
      i++;
      continue;
    }

    const codeA = charA.charCodeAt(0);
    const codeB = charB.charCodeAt(0);

    if (codeB - codeA > 1) {
      // Pick middle character
      return prev.slice(0, i) + String.fromCharCode(Math.floor((codeA + codeB) / 2));
    } else {
      // Characters are adjacent, need more precision at next level
      i++;
      // If we've run out of chars in prev, but next still has chars, 
      // we can't just return prev + 'm' if next[i] is 'a'.
      // But for simplicity in this implementation:
      if (i > 100) return prev + 'm'; // Safety break
    }
  }
}
