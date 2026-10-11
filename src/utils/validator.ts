import { sanitize, sanitizeObject } from './sanitizer';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function isValidString(val: any): val is string {
  return typeof val === 'string';
}

function isValidNumber(val: any): val is number {
  return typeof val === 'number' && !isNaN(val);
}

function isValidBoolean(val: any): val is boolean {
  return typeof val === 'boolean';
}

function validatePage(page: any): Record<string, any> | null {
  if (!page || typeof page !== 'object') return null;
  if (!isValidString(page.id)) return null;
  
  return {
    id: page.id,
    parentId: isValidString(page.parentId) ? page.parentId : null,
    title: isValidString(page.title) ? sanitize(page.title) : '',
    icon: isValidString(page.icon) ? sanitize(page.icon) : '📝',
    coverImage: isValidString(page.coverImage) ? sanitize(page.coverImage) : null,
    sortOrder: isValidString(page.sortOrder) ? page.sortOrder
             : isValidNumber(page.sortOrder) ? String(page.sortOrder)
             : 'm',
    isArchived: isValidBoolean(page.isArchived) ? page.isArchived : false,
    isFavorite: isValidBoolean(page.isFavorite) ? page.isFavorite : false,
    createdAt: isValidNumber(page.createdAt) ? page.createdAt : Date.now(),
    updatedAt: isValidNumber(page.updatedAt) ? page.updatedAt : Date.now(),
    _isEncrypted: isValidBoolean(page._isEncrypted) ? page._isEncrypted : false
  };
}

function validateBlock(block: any): Record<string, any> | null {
  if (!block || typeof block !== 'object') return null;
  if (!isValidString(block.id)) return null;
  if (!isValidString(block.pageId)) return null;
  
  const cleanProperties = sanitizeObject(block.properties) || {};

  return {
    id: block.id,
    pageId: block.pageId,
    type: isValidString(block.type) ? sanitize(block.type) : 'text',
    content: isValidString(block.content) ? sanitize(block.content) : '',
    properties: cleanProperties,
    sortOrder: isValidString(block.sortOrder) ? block.sortOrder
             : isValidNumber(block.sortOrder) ? String(block.sortOrder)
             : 'm',
    createdAt: isValidNumber(block.createdAt) ? block.createdAt : Date.now(),
    updatedAt: isValidNumber(block.updatedAt) ? block.updatedAt : Date.now(),
    _isEncrypted: isValidBoolean(block._isEncrypted) ? block._isEncrypted : false
  };
}

function validateTracker(tracker: any): Record<string, any> | null {
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

function validateTrackerEntry(entry: any): Record<string, any> | null {
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

export interface BackupValidationResult {
  pages: any[];
  blocks: any[];
  trackers: any[];
  entries: any[];
  blobs: any[];
  quarantined: any[];
  _validated: boolean;
}

export function validateBackupData(file: { size: number; name?: string }, data: any): BackupValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 50MB limit (${Math.round(file.size / 1024 / 1024)}MB)`);
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup format: root must be an object.');
  }

  if (data.version && data.version > 1) {
    throw new Error(`Unsupported schema version: ${data.version}. Please upgrade your application.`);
  }

  const MAX_RECORDS = 50000;
  if (
    (data.pages?.length || 0) + (data.blocks?.length || 0) + (data.trackers?.length || 0) > MAX_RECORDS
  ) {
    throw new Error(`Payload exceeds maximum record limit of ${MAX_RECORDS}.`);
  }

  const result: BackupValidationResult = { pages: [], blocks: [], trackers: [], entries: [], blobs: [], quarantined: [], _validated: false };

  if (Array.isArray(data.pages)) {
    for (const p of data.pages) {
      const parsed = validatePage(p);
      if (parsed) result.pages.push(parsed);
      else result.quarantined.push({ type: 'page', raw: p });
    }
  }
  
  if (Array.isArray(data.blocks)) {
    for (const b of data.blocks) {
      const parsed = validateBlock(b);
      if (parsed) result.blocks.push(parsed);
      else result.quarantined.push({ type: 'block', raw: b });
    }
  }

  if (Array.isArray(data.trackers)) {
    for (const t of data.trackers) {
      const parsed = validateTracker(t);
      if (parsed) result.trackers.push(parsed);
      else result.quarantined.push({ type: 'tracker', raw: t });
    }
  }

  if (Array.isArray(data.entries)) {
    for (const e of data.entries) {
      const parsed = validateTrackerEntry(e);
      if (parsed) result.entries.push(parsed);
      else result.quarantined.push({ type: 'entry', raw: e });
    }
  }

  if (Array.isArray(data.blobs)) {
    for (const b of data.blobs) {
      if (b && typeof b.hash === 'string' && typeof b.base64 === 'string') {
        result.blobs.push({
          hash: b.hash,
          base64: b.base64,
          mimeType: typeof b.mimeType === 'string' ? b.mimeType : 'application/octet-stream',
          createdAt: typeof b.createdAt === 'number' ? b.createdAt : Date.now()
        });
      } else {
        result.quarantined.push({ type: 'blob', raw: b });
      }
    }
  }

  result._validated = true;
  return result;
}
