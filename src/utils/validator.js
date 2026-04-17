import { sanitize } from './sanitizer';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function isValidString(val) {
  return typeof val === 'string';
}

function isValidNumber(val) {
  return typeof val === 'number' && !isNaN(val);
}

function isValidBoolean(val) {
  return typeof val === 'boolean';
}

function validatePage(page) {
  if (!page || typeof page !== 'object') return null;
  if (!isValidString(page.id)) return null;
  
  return {
    id: page.id,
    parentId: isValidString(page.parentId) ? page.parentId : null,
    title: isValidString(page.title) ? sanitize(page.title) : '',
    icon: isValidString(page.icon) ? sanitize(page.icon) : '📝',
    coverImage: isValidString(page.coverImage) ? sanitize(page.coverImage) : null,
    sortOrder: isValidString(page.sortOrder) ? page.sortOrder : 'm',
    isArchived: isValidBoolean(page.isArchived) ? page.isArchived : false,
    isFavorite: isValidBoolean(page.isFavorite) ? page.isFavorite : false,
    createdAt: isValidNumber(page.createdAt) ? page.createdAt : Date.now(),
    updatedAt: isValidNumber(page.updatedAt) ? page.updatedAt : Date.now(),
    _isEncrypted: isValidBoolean(page._isEncrypted) ? page._isEncrypted : false
  };
}

function validateBlock(block) {
  if (!block || typeof block !== 'object') return null;
  if (!isValidString(block.id)) return null;
  if (!isValidString(block.pageId)) return null;
  
  // Recursively sanitize properties
  const sanitizeProperties = (props) => {
    if (!props || typeof props !== 'object') return {};
    try {
      const cleanProps = {};
      for (const key in props) {
        if (typeof props[key] === 'string') {
          cleanProps[key] = sanitize(props[key]);
        } else if (Array.isArray(props[key])) {
           cleanProps[key] = props[key].map(item => 
              typeof item === 'string' ? sanitize(item) : (Array.isArray(item) ? item.map(sub => typeof sub === 'string' ? sanitize(sub) : sub) : item)
           );
        } else if (typeof props[key] === 'boolean' || typeof props[key] === 'number') {
           cleanProps[key] = props[key];
        }
      }
      return cleanProps;
    } catch {
      return {};
    }
  };

  return {
    id: block.id,
    pageId: block.pageId,
    type: isValidString(block.type) ? sanitize(block.type) : 'text',
    content: isValidString(block.content) ? sanitize(block.content) : '',
    properties: sanitizeProperties(block.properties),
    sortOrder: isValidString(block.sortOrder) ? block.sortOrder : 'm',
    createdAt: isValidNumber(block.createdAt) ? block.createdAt : Date.now(),
    updatedAt: isValidNumber(block.updatedAt) ? block.updatedAt : Date.now(),
    _isEncrypted: isValidBoolean(block._isEncrypted) ? block._isEncrypted : false
  };
}

function validateTracker(tracker) {
  if (!tracker || typeof tracker !== 'object') return null;
  if (!isValidString(tracker.id)) return null;
  
  return {
    id: tracker.id,
    name: isValidString(tracker.name) ? sanitize(tracker.name) : 'Untitled Tracker',
    description: isValidString(tracker.description) ? sanitize(tracker.description) : '',
    icon: isValidString(tracker.icon) ? sanitize(tracker.icon) : '📊',
    fields: Array.isArray(tracker.fields) ? tracker.fields.filter(f => f && typeof f === 'object') : [],
    viewType: isValidString(tracker.viewType) ? sanitize(tracker.viewType) : 'table',
    createdAt: isValidNumber(tracker.createdAt) ? tracker.createdAt : Date.now(),
    updatedAt: isValidNumber(tracker.updatedAt) ? tracker.updatedAt : Date.now(),
  };
}

function validateTrackerEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (!isValidString(entry.id)) return null;
  if (!isValidString(entry.trackerId)) return null;
  
  return {
    id: entry.id,
    trackerId: entry.trackerId,
    data: (entry.data && typeof entry.data === 'object') ? entry.data : {},
    createdAt: isValidNumber(entry.createdAt) ? entry.createdAt : Date.now(),
    updatedAt: isValidNumber(entry.updatedAt) ? entry.updatedAt : Date.now(),
  };
}

export function validateBackupData(file, data) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 50MB limit (${Math.round(file.size / 1024 / 1024)}MB)`);
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup format: root must be an object.');
  }

  const result = { pages: [], blocks: [], trackers: [], entries: [] };

  if (Array.isArray(data.pages)) {
    result.pages = data.pages.map(validatePage).filter(Boolean);
  }
  
  if (Array.isArray(data.blocks)) {
    result.blocks = data.blocks.map(validateBlock).filter(Boolean);
  }

  if (Array.isArray(data.trackers)) {
    result.trackers = data.trackers.map(validateTracker).filter(Boolean);
  }

  if (Array.isArray(data.entries)) {
    result.entries = data.entries.map(validateTrackerEntry).filter(Boolean);
  }

  return result;
}
