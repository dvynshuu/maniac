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
    sortOrder: 0,
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
    sortOrder: 0,
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
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
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
