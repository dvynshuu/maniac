import Dexie from 'dexie';
import { SecurityService } from '../utils/securityService';
import { useSecurityStore } from '../stores/securityStore';

export const db = new Dexie('ManiacDB');

db.version(1).stores({
  pages: 'id, parentId, title, sortOrder, isArchived, createdAt, updatedAt',
  blocks: 'id, pageId, type, sortOrder, createdAt, updatedAt',
  database_rows: 'id, blockId, createdAt, updatedAt',
  trackers: 'id, name, createdAt, updatedAt',
  tracker_entries: 'id, trackerId, createdAt, updatedAt',
});

// Encryption Hooks
db.pages.hook('creating', (primKey, obj) => {
  const password = useSecurityStore.getState().masterPassword;
  if (password && obj.title) {
    return SecurityService.encrypt(obj.title, password).then(encrypted => {
       obj.title = encrypted;
       obj._isEncrypted = true;
    });
  }
});

db.pages.hook('updating', (mods, primKey, obj) => {
  const password = useSecurityStore.getState().masterPassword;
  if (password && mods.title) {
    return SecurityService.encrypt(mods.title, password).then(encrypted => {
       mods.title = encrypted;
       mods._isEncrypted = true;
    });
  }
});

db.pages.hook('reading', (obj) => {
  const password = useSecurityStore.getState().masterPassword;
  if (password && obj.title && obj._isEncrypted) {
    // Note: read hooks are synchronous in Dexie v3/v4 for most things, 
    // but we can't easily do async decryption here without blocking the UI.
    // We'll handle decryption in the UI layer or stores instead for better UX,
    // OR we use a proxy. 
    // Actually, Dexie reading hooks don't support async well.
    // I'll skip the reading hook and decrypt in the store.
  }
  return obj;
});

// Blocks
db.blocks.hook('creating', (primKey, obj) => {
  const password = useSecurityStore.getState().masterPassword;
  if (password) {
    const promises = [];
    if (obj.content) {
        promises.push(SecurityService.encrypt(obj.content, password).then(e => obj.content = e));
    }
    if (obj.properties) {
        promises.push(SecurityService.encrypt(JSON.stringify(obj.properties), password).then(e => obj.properties = e));
    }
    if (promises.length > 0) {
        obj._isEncrypted = true;
        return Promise.all(promises);
    }
  }
});

db.blocks.hook('updating', (mods, primKey, obj) => {
  const password = useSecurityStore.getState().masterPassword;
  if (password) {
    const promises = [];
    if (mods.content) {
        promises.push(SecurityService.encrypt(mods.content, password).then(e => mods.content = e));
    }
    if (mods.properties) {
        promises.push(SecurityService.encrypt(JSON.stringify(mods.properties), password).then(e => mods.properties = e));
    }
    if (promises.length > 0) {
        mods._isEncrypted = true;
        return Promise.all(promises);
    }
  }
});

// Database Rows
db.database_rows.hook('creating', (primKey, obj) => {
  const password = useSecurityStore.getState().masterPassword;
  if (password && obj.values) {
    return SecurityService.encrypt(JSON.stringify(obj.values), password).then(encrypted => {
       obj.values = encrypted;
       obj._isEncrypted = true;
    });
  }
});

db.database_rows.hook('updating', (mods, primKey, obj) => {
  const password = useSecurityStore.getState().masterPassword;
  if (password && mods.values) {
    return SecurityService.encrypt(JSON.stringify(mods.values), password).then(encrypted => {
       mods.values = encrypted;
       mods._isEncrypted = true;
    });
  }
});

// Seed default data on first launch
export async function seedDefaultData() {
  const pageCount = await db.pages.count();
  if (pageCount === 0) {
    const { nanoid } = await import('nanoid');
    const now = Date.now();
    const welcomePageId = nanoid();
    const gettingStartedId = nanoid();

    await db.pages.bulkAdd([
      {
        id: welcomePageId,
        parentId: null,
        title: 'Welcome to Maniac',
        icon: '🧠',
        coverImage: null,
        sortOrder: 0,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: gettingStartedId,
        parentId: welcomePageId,
        title: 'Getting Started',
        icon: '🚀',
        coverImage: null,
        sortOrder: 0,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await db.blocks.bulkAdd([
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'heading1',
        content: 'Welcome to Maniac 🧠',
        properties: {},
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'text',
        content: 'Your personal operating system for thoughts, tasks, and tracking.',
        properties: {},
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'callout',
        content: 'Type / to insert different block types. Use the sidebar to create pages.',
        properties: { emoji: '💡' },
        sortOrder: 2,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'heading2',
        content: 'Features',
        properties: {},
        sortOrder: 3,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'todo',
        content: 'Create nested pages for organizing your thoughts',
        properties: { checked: false },
        sortOrder: 4,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'todo',
        content: 'Use custom trackers to build mini-databases',
        properties: { checked: false },
        sortOrder: 5,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'todo',
        content: 'Press Cmd+K to open the command palette',
        properties: { checked: false },
        sortOrder: 6,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: gettingStartedId,
        type: 'heading1',
        content: 'Getting Started 🚀',
        properties: {},
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: gettingStartedId,
        type: 'text',
        content: 'Start by creating a new page from the sidebar, then add blocks using the / command.',
        properties: {},
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: gettingStartedId,
        type: 'quote',
        content: 'The best way to predict the future is to create it.',
        properties: {},
        sortOrder: 2,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }
}
