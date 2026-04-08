import Dexie from 'dexie';

export const db = new Dexie('ManiacDB');

db.version(1).stores({
  pages: 'id, parentId, title, sortOrder, isArchived, createdAt, updatedAt',
  blocks: 'id, pageId, type, sortOrder, createdAt, updatedAt',
  trackers: 'id, name, createdAt, updatedAt',
  tracker_entries: 'id, trackerId, createdAt, updatedAt',
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
