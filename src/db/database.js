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

db.version(2).stores({
  blocks: 'id, pageId, type, sortOrder, createdAt, updatedAt, *words',
  database_cells: 'id, rowId, propertyId, blockId, createdAt, updatedAt',
}).upgrade(tx => {
  return tx.blocks.toCollection().modify(block => {
    if (!block._isEncrypted && block.content) {
      const text = block.content.replace(/<[^>]*>/g, ' ').toLowerCase();
      block.words = [...new Set(text.split(/[\s\W]+/).filter(w => w.length > 1))];
    } else {
      block.words = [];
    }
  });
});

db.version(3).stores({
  blobs: 'hash, createdAt',
});

db.version(4).stores({
  pages: 'id, parentId, title, sortOrder, isArchived, createdAt, updatedAt, lastViewedAt',
  blocks: 'id, pageId, type, sortOrder, createdAt, updatedAt, lastViewedAt, *words',
});

db.version(5).stores({
  blocks: 'id, pageId, parentId, type, sortOrder, createdAt, updatedAt, lastViewedAt, *words',
}).upgrade(tx => {
  return tx.blocks.toCollection().modify(block => {
    if (block.parentId === undefined) {
      block.parentId = null;
    }
  });
});


const extractWords = (content) => {
  if (!content) return [];
  const text = typeof content === 'string' ? content.replace(/<[^>]*>/g, ' ').toLowerCase() : '';
  return [...new Set(text.split(/[\s\W]+/).filter(w => w.length > 1))];
};

// Encryption Hooks
db.pages.hook('creating', (primKey, obj) => {
  const key = useSecurityStore.getState().derivedKey;
  if (key && obj.title) {
    return SecurityService.encrypt(obj.title, key).then(encrypted => {
       obj.title = encrypted;
       obj._isEncrypted = true;
    });
  }
});

db.pages.hook('updating', (mods, primKey, obj) => {
  const key = useSecurityStore.getState().derivedKey;
  if (key && mods.title) {
    return SecurityService.encrypt(mods.title, key).then(encrypted => {
       mods.title = encrypted;
       mods._isEncrypted = true;
    });
  }
});

db.pages.hook('reading', (obj) => {
  const key = useSecurityStore.getState().derivedKey;
  if (key && obj.title && obj._isEncrypted) {
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
  const key = useSecurityStore.getState().derivedKey;
  const hmacKey = useSecurityStore.getState().hmacKey;
  
  if (!key && obj.content) {
    obj.words = extractWords(obj.content);
  } else if (key) {
    const promises = [];
    
    // Blind Indexing
    if (hmacKey && obj.content) {
      const words = extractWords(obj.content);
      promises.push(
        Promise.all(words.map(w => SecurityService.hmacWord(w, hmacKey)))
          .then(hashedWords => obj.words = hashedWords.filter(Boolean))
      );
    } else {
      obj.words = [];
    }

    if (obj.content) {
        promises.push(SecurityService.encrypt(obj.content, key).then(e => obj.content = e));
    }
    if (obj.properties) {
        promises.push(SecurityService.encrypt(JSON.stringify(obj.properties), key).then(e => obj.properties = e));
    }
    if (promises.length > 0) {
        obj._isEncrypted = true;
        return Promise.all(promises);
    }
  }
});

db.blocks.hook('updating', (mods, primKey, obj) => {
  const key = useSecurityStore.getState().derivedKey;
  const hmacKey = useSecurityStore.getState().hmacKey;
  
  if (!key && mods.content !== undefined) {
    mods.words = extractWords(mods.content);
  }

  if (key) {
    const promises = [];
    
    if (hmacKey && mods.content !== undefined) {
      const words = extractWords(mods.content);
      promises.push(
        Promise.all(words.map(w => SecurityService.hmacWord(w, hmacKey)))
          .then(hashedWords => mods.words = hashedWords.filter(Boolean))
      );
    } else if (mods.content !== undefined) {
      mods.words = [];
    }

    if (mods.content) {
        promises.push(SecurityService.encrypt(mods.content, key).then(e => mods.content = e));
    }
    if (mods.properties) {
        promises.push(SecurityService.encrypt(JSON.stringify(mods.properties), key).then(e => mods.properties = e));
    }
    if (promises.length > 0) {
        mods._isEncrypted = true;
        return Promise.all(promises);
    }
  }
});

// Database Rows
db.database_rows.hook('creating', (primKey, obj) => {
  // Currently no row-level metadata encryption, but hooks are ready
});

// Database Cells
db.database_cells.hook('creating', (primKey, obj) => {
  const key = useSecurityStore.getState().derivedKey;
  if (key && obj.value !== undefined) {
    return SecurityService.encrypt(JSON.stringify(obj.value), key).then(encrypted => {
       obj.value = encrypted;
       obj._isEncrypted = true;
    });
  }
});

db.database_cells.hook('updating', (mods, primKey, obj) => {
  const key = useSecurityStore.getState().derivedKey;
  if (key && mods.value !== undefined) {
    return SecurityService.encrypt(JSON.stringify(mods.value), key).then(encrypted => {
       mods.value = encrypted;
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
        sortOrder: 'a',
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
        sortOrder: 'a',
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
        sortOrder: 'a',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'text',
        content: 'Your personal operating system for thoughts, tasks, and tracking.',
        properties: {},
        sortOrder: 'b',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'callout',
        content: 'Type / to insert different block types. Use the sidebar to create pages.',
        properties: { emoji: '💡' },
        sortOrder: 'c',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'heading2',
        content: 'Features',
        properties: {},
        sortOrder: 'd',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'todo',
        content: 'Create nested pages for organizing your thoughts',
        properties: { checked: false },
        sortOrder: 'e',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'todo',
        content: 'Use custom trackers to build mini-databases',
        properties: { checked: false },
        sortOrder: 'f',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: welcomePageId,
        type: 'todo',
        content: 'Press Cmd+K to open the command palette',
        properties: { checked: false },
        sortOrder: 'g',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: gettingStartedId,
        type: 'heading1',
        content: 'Getting Started 🚀',
        properties: {},
        sortOrder: 'a',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: gettingStartedId,
        type: 'text',
        content: 'Start by creating a new page from the sidebar, then add blocks using the / command.',
        properties: {},
        sortOrder: 'b',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: nanoid(),
        pageId: gettingStartedId,
        type: 'quote',
        content: 'The best way to predict the future is to create it.',
        properties: {},
        sortOrder: 'c',
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }
}
