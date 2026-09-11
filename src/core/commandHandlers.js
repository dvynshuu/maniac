/**
 * ─── Command Handlers ───────────────────────────────────────────
 * Registers all block and page command handlers with the command bus.
 * Each handler: receives payload → returns { ops, inverseOps, returnValue }.
 *
 * Import this module once at app startup to register all handlers.
 */

import { registerHandler } from './commandBus';
import { createOp, OpType, EntityType } from '../db/opLog';
import { db } from '../db/database';
import { createBlock, createPage, generateLexicalOrder } from '../utils/helpers';
import { content_sanitizer, sanitizeObject } from '../utils/sanitizer';
import { ensureDefaults } from './schemaRegistry';
import { useBlockStore } from '../stores/blockStore';
import { usePageStore } from '../stores/pageStore';
import { useUIStore } from '../stores/uiStore';
import { SecurityService } from '../utils/securityService';
import { useSecurityStore } from '../stores/securityStore';
import { extractWords } from '../db/database';

// ─── Handlers ──────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// BLOCK HANDLERS
// ═══════════════════════════════════════════════════════════════

registerHandler('block/create', async (payload) => {
  const { id, pageId, type = 'text', afterBlockId = null, content = '', properties = {}, parentId } = payload;
  const store = useBlockStore.getState();
  const { blockMap, blockOrder } = store;

  // Resolve parent
  let resolvedParentId = parentId;
  if (resolvedParentId === undefined && afterBlockId) {
    resolvedParentId = blockMap[afterBlockId]?.parentId || null;
  } else if (resolvedParentId === undefined) {
    resolvedParentId = null;
  }

  // Compute sort order
  const siblings = blockOrder.filter(id => (blockMap[id]?.parentId || null) === resolvedParentId);
  let sortOrder;

  if (afterBlockId) {
    const afterIndex = siblings.indexOf(afterBlockId);
    if (afterIndex !== -1) {
      const prev = blockMap[siblings[afterIndex]]?.sortOrder || null;
      const next = siblings[afterIndex + 1] ? blockMap[siblings[afterIndex + 1]]?.sortOrder : null;
      sortOrder = generateLexicalOrder(prev, next);
    }
  }
  if (sortOrder === undefined) {
    const lastId = siblings[siblings.length - 1];
    const last = lastId ? blockMap[lastId]?.sortOrder : null;
    sortOrder = generateLexicalOrder(last, null);
  }

  const safeContent = content_sanitizer(content);
  const safeProperties = ensureDefaults(type, sanitizeObject(properties) || {});
  const block = createBlock(pageId, type, {
    ...(id ? { id } : {}),
    content: safeContent,
    properties: safeProperties,
    sortOrder,
    parentId: resolvedParentId,
  });

  // Optimistic update
  const newBlockMap = { ...store.blockMap, [block.id]: block };
  const newBlockOrder = [...store.blockOrder, block.id];
  newBlockOrder.sort((a, b) => String(newBlockMap[a]?.sortOrder || '').localeCompare(String(newBlockMap[b]?.sortOrder || '')));

  useBlockStore.setState({
    blockMap: newBlockMap,
    blockOrder: newBlockOrder,
    focusBlockId: block.id,
  });

  useUIStore.getState().updateOnboarding('blocksCreated');

  // Operation
  const op = createOp(EntityType.BLOCK, block.id, OpType.CREATE, block);
  const inverseOp = createOp(EntityType.BLOCK, block.id, OpType.DELETE, null, block);

  return { ops: [op], inverseOps: [inverseOp], returnValue: block };
});

registerHandler('block/update', async (payload) => {
  const { blockId, updates } = payload;

  // Check in-memory store first (already decrypted & fast)
  let dbBlock = useBlockStore.getState().blockMap[blockId];
  
  // Fallback: if not in memory, query IndexedDB
  if (!dbBlock) {
    dbBlock = await db.blocks.get(blockId);
  }
  if (!dbBlock) return null;

  const key = useSecurityStore.getState().derivedKey;
  let currentBlock = { ...dbBlock };

  // Decrypt fields so we can merge safely
  if (dbBlock._isEncrypted && key) {
    if (dbBlock.content && typeof dbBlock.content === 'string') {
      try { currentBlock.content = await SecurityService.decrypt(dbBlock.content, key) || ''; }
      catch { /* keep raw */ }
    }
    if (dbBlock.properties && typeof dbBlock.properties === 'string') {
      try {
        const dec = await SecurityService.decrypt(dbBlock.properties, key);
        currentBlock.properties = dec ? JSON.parse(dec) : {};
      } catch {
        currentBlock.properties = {};
      }
    }
  }
  // Ensure properties is always an object
  if (!currentBlock.properties || typeof currentBlock.properties !== 'object') {
    currentBlock.properties = {};
  }

  const safeUpdates = JSON.parse(JSON.stringify(updates));
  if (safeUpdates.content !== undefined) safeUpdates.content = content_sanitizer(safeUpdates.content);
  if (safeUpdates.properties !== undefined) safeUpdates.properties = sanitizeObject(safeUpdates.properties);

  const now = Date.now();
  const prevPayload = {};
  for (const k of Object.keys(safeUpdates)) {
    prevPayload[k] = currentBlock[k];
  }
  prevPayload.updatedAt = currentBlock.updatedAt;

  const nextVersion = (currentBlock.version || 0) + 1;
  const sortOrder = safeUpdates.sortOrder || currentBlock.sortOrder;

  // Optimistic update
  const mergedBlock = { 
    ...currentBlock, 
    ...safeUpdates, 
    properties: safeUpdates.properties 
      ? { ...(currentBlock.properties || {}), ...safeUpdates.properties }
      : currentBlock.properties,
    sortOrder,
    orderKey: sortOrder,
    version: nextVersion,
    updatedLogical: now,
    updatedAt: now 
  };
  useBlockStore.setState(s => ({
    blockMap: { ...s.blockMap, [blockId]: mergedBlock },
  }));

  // Removed direct DB write and encryption to defer to persistenceWorker

  // Operation log
  const opPayload = { ...safeUpdates, sortOrder, orderKey: sortOrder, version: nextVersion, updatedLogical: now, updatedAt: now };
  const op = createOp(EntityType.BLOCK, blockId, OpType.UPDATE, opPayload, prevPayload);
  const inverseOp = createOp(EntityType.BLOCK, blockId, OpType.UPDATE, prevPayload, opPayload);

  return { ops: [op], inverseOps: [inverseOp] };
});

registerHandler('block/delete', async (payload) => {
  const { blockId } = payload;
  const store = useBlockStore.getState();
  const { blockMap, blockOrder } = store;
  const blockIndex = blockOrder.indexOf(blockId);
  if (blockIndex === -1) return null;

  const blockToDelete = blockMap[blockId];

  // Optimistic remove
  const newBlockMap = { ...blockMap };
  delete newBlockMap[blockId];
  const newBlockOrder = blockOrder.filter(id => id !== blockId);
  const newFocus = blockIndex > 0 ? blockOrder[blockIndex - 1] : null;

  useBlockStore.setState({ blockMap: newBlockMap, blockOrder: newBlockOrder, focusBlockId: newFocus });

  // DB delete deferred to persistenceWorker

  // Operation
  const op = createOp(EntityType.BLOCK, blockId, OpType.DELETE, null, blockToDelete);
  const inverseOp = createOp(EntityType.BLOCK, blockId, OpType.CREATE, blockToDelete);

  return { ops: [op], inverseOps: [inverseOp] };
});

registerHandler('block/reorder', async (payload) => {
  const { blockId, direction } = payload;
  const store = useBlockStore.getState();
  const { blockMap, blockOrder } = store;
  const index = blockOrder.indexOf(blockId);

  if (direction === 'up' && index <= 0) return null;
  if (direction === 'down' && (index === -1 || index >= blockOrder.length - 1)) return null;

  const current = blockMap[blockId];
  const neighborIndex = direction === 'up' ? index - 1 : index + 1;
  const beyondIndex = direction === 'up' ? index - 2 : index + 2;

  const neighborBlock = blockMap[blockOrder[neighborIndex]];
  const beyondSort = beyondIndex >= 0 && beyondIndex < blockOrder.length
    ? blockMap[blockOrder[beyondIndex]]?.sortOrder
    : null;

  const newSortOrder = direction === 'up'
    ? generateLexicalOrder(beyondSort, neighborBlock.sortOrder)
    : generateLexicalOrder(neighborBlock.sortOrder, beyondSort);

  const now = Date.now();
  const prevSortOrder = current.sortOrder;
  const nextVersion = (current.version || 0) + 1;

  const updatedBlock = { 
    ...current, 
    sortOrder: newSortOrder, 
    orderKey: newSortOrder,
    version: nextVersion,
    updatedLogical: now,
    updatedAt: now 
  };
  const newBlockMap = { ...blockMap, [blockId]: updatedBlock };
  const allBlocks = blockOrder.map(id => id === blockId ? updatedBlock : blockMap[id]);
  allBlocks.sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));

  useBlockStore.setState({ blockMap: newBlockMap, blockOrder: allBlocks.map(b => b.id) });

  // DB update deferred to persistenceWorker

  const opPayload = { sortOrder: newSortOrder, orderKey: newSortOrder, version: nextVersion, updatedLogical: now, updatedAt: now };
  const op = createOp(EntityType.BLOCK, blockId, OpType.REORDER, opPayload, { sortOrder: prevSortOrder, orderKey: prevSortOrder });
  const inverseOp = createOp(EntityType.BLOCK, blockId, OpType.REORDER, { sortOrder: prevSortOrder, orderKey: prevSortOrder }, opPayload);

  return { ops: [op], inverseOps: [inverseOp] };
});

registerHandler('block/changeType', async (payload) => {
  const { blockId, newType, properties: extraProperties = {} } = payload;
  const store = useBlockStore.getState();
  const block = store.blockMap[blockId];
  if (!block) return null;

  const prevType = block.type;
  const prevProperties = { ...block.properties };

  const properties = ensureDefaults(newType, { ...block.properties, ...extraProperties });
  const now = Date.now();
  const nextVersion = (block.version || 0) + 1;

  const updatedBlock = { 
    ...block, 
    type: newType, 
    properties, 
    version: nextVersion,
    updatedLogical: now,
    updatedAt: now 
  };

  useBlockStore.setState(s => ({
    blockMap: { ...s.blockMap, [blockId]: updatedBlock },
  }));

  // DB update deferred to persistenceWorker

  const opPayload = { type: newType, properties, version: nextVersion, updatedLogical: now, updatedAt: now };
  const prevOpPayload = { type: prevType, properties: prevProperties };
  const op = createOp(EntityType.BLOCK, blockId, OpType.CHANGE_TYPE, opPayload, prevOpPayload);
  const inverseOp = createOp(EntityType.BLOCK, blockId, OpType.CHANGE_TYPE, prevOpPayload, opPayload);

  return { ops: [op], inverseOps: [inverseOp] };
});

registerHandler('block/move', async (payload) => {
  const { blockId, targetParentId, targetAfterBlockId } = payload;
  const store = useBlockStore.getState();
  const block = store.blockMap[blockId];
  if (!block) return null;

  const prevParentId = block.parentId;
  const prevSortOrder = block.sortOrder;

  // Compute new sort order
  const { blockMap, blockOrder } = store;
  const siblings = blockOrder.filter(id => 
    (blockMap[id]?.parentId || null) === (targetParentId || null) && id !== blockId
  );

  let sortOrder;
  if (targetAfterBlockId && siblings.includes(targetAfterBlockId)) {
    const afterIdx = siblings.indexOf(targetAfterBlockId);
    const prev = blockMap[siblings[afterIdx]]?.sortOrder || null;
    const next = siblings[afterIdx + 1] ? blockMap[siblings[afterIdx + 1]]?.sortOrder : null;
    sortOrder = generateLexicalOrder(prev, next);
  } else if (siblings.length > 0) {
    const last = blockMap[siblings[siblings.length - 1]]?.sortOrder || null;
    sortOrder = generateLexicalOrder(last, null);
  } else {
    sortOrder = 'm'; // Default middle key
  }

  const now = Date.now();
  const nextVersion = (block.version || 0) + 1;
  const updates = { 
    parentId: targetParentId || null, 
    sortOrder, 
    orderKey: sortOrder,
    version: nextVersion,
    updatedLogical: now,
    updatedAt: now 
  };

  // Optimistic update
  useBlockStore.setState(s => {
    const updatedBlock = { ...block, ...updates };
    const newMap = { ...s.blockMap, [blockId]: updatedBlock };
    const newOrder = [...s.blockOrder].filter(id => id !== blockId);
    // Find insertion index in sorted order
    let insertIdx = newOrder.findIndex(id => String(newMap[id]?.sortOrder || '').localeCompare(sortOrder) > 0);
    if (insertIdx === -1) newOrder.push(blockId);
    else newOrder.splice(insertIdx, 0, blockId);

    return { blockMap: newMap, blockOrder: newOrder };
  });

  // DB update deferred to persistenceWorker

  const prevUpdates = { parentId: prevParentId, sortOrder: prevSortOrder, orderKey: prevSortOrder };
  const op = createOp(EntityType.BLOCK, blockId, OpType.UPDATE, updates, prevUpdates);
  const inverseOp = createOp(EntityType.BLOCK, blockId, OpType.UPDATE, prevUpdates, updates);

  return { ops: [op], inverseOps: [inverseOp] };
});

// ═══════════════════════════════════════════════════════════════
// PAGE HANDLERS
// ═══════════════════════════════════════════════════════════════

registerHandler('page/create', async (payload) => {
  const { id, parentId = null, title = '', icon = '📝', coverImage = null } = payload;
  const store = usePageStore.getState();
  const siblings = store.pages.filter(p => p.parentId === parentId)
    .sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));
  const lastSibling = siblings[siblings.length - 1];
  const sortOrder = generateLexicalOrder(lastSibling?.sortOrder || null, null);

  const page = createPage({ id, parentId, title, icon, coverImage, sortOrder });

  usePageStore.setState(s => ({ pages: [...s.pages, page] }));

  useUIStore.getState().updateOnboarding('pagesCreated');

  const op = createOp(EntityType.PAGE, page.id, OpType.CREATE, page);
  const inverseOp = createOp(EntityType.PAGE, page.id, OpType.DELETE, null, page);

  return { ops: [op], inverseOps: [inverseOp], returnValue: page };
});

registerHandler('page/update', async (payload) => {
  const pageId = payload.pageId || payload.id;
  const updates = payload.updates || {};
  const store = usePageStore.getState();
  const page = store.pages.find(p => p.id === pageId) || store.archivedPages.find(p => p.id === pageId);
  if (!page) return null;

  const now = Date.now();
  const prevPayload = {};
  for (const key of Object.keys(updates)) {
    prevPayload[key] = page[key];
  }
  prevPayload.updatedAt = page.updatedAt;
  prevPayload.version = page.version;
  prevPayload.updatedLogical = page.updatedLogical;

  const orderKey = updates.sortOrder !== undefined ? updates.sortOrder : (updates.orderKey !== undefined ? updates.orderKey : undefined);
  const nextVersion = (page.version || 0) + 1;
  const safeUpdates = { ...updates, version: nextVersion, updatedLogical: now, updatedAt: now };
  if (orderKey !== undefined) {
    safeUpdates.sortOrder = orderKey;
    safeUpdates.orderKey = orderKey;
  }

  // Handle archive state toggle in page/update
  if (updates.isArchived === true) {
    usePageStore.setState(s => ({
      pages: s.pages.filter(p => p.id !== pageId),
      archivedPages: [...s.archivedPages.filter(p => p.id !== pageId), { ...page, ...safeUpdates }],
      currentPageId: s.currentPageId === pageId ? null : s.currentPageId,
    }));
  } else if (updates.isArchived === false) {
    usePageStore.setState(s => ({
      archivedPages: s.archivedPages.filter(p => p.id !== pageId),
      pages: [...s.pages.filter(p => p.id !== pageId), { ...page, ...safeUpdates }],
    }));
  } else {
    usePageStore.setState(s => ({
      pages: s.pages.map(p => p.id === pageId ? { ...p, ...safeUpdates } : p),
      archivedPages: s.archivedPages.map(p => p.id === pageId ? { ...p, ...safeUpdates } : p),
    }));
  }

  // If it's a database row page, sync the title update back to the database row's primary cell
  if (page.isDatabaseRow && page.databaseBlockId && updates.title !== undefined) {
    try {
      const { useDatabaseStore } = await import('../stores/databaseStore');
      const dbStore = useDatabaseStore.getState();
      const dbData = dbStore.getDatabaseData(page.databaseBlockId);
      const titleProp = dbData?.schema?.[0];
      if (titleProp) {
        dbStore.updateCellImmediate(page.databaseBlockId, pageId, titleProp.id, updates.title);
      }
    } catch (err) {
      console.error('Failed to sync row title to database cell:', err);
    }
  }

  const op = createOp(EntityType.PAGE, pageId, OpType.UPDATE, safeUpdates, prevPayload);
  const inverseOp = createOp(EntityType.PAGE, pageId, OpType.UPDATE, prevPayload, safeUpdates);

  return { ops: [op], inverseOps: [inverseOp], returnValue: { ...page, ...safeUpdates } };
});

registerHandler('page/archive', async (payload) => {
  const pageId = payload.pageId || payload.id;
  const store = usePageStore.getState();
  const page = store.pages.find(p => p.id === pageId);
  if (!page) return null;

  const now = Date.now();
  const archivedPage = { ...page, isArchived: true, updatedAt: now };

  usePageStore.setState(s => ({
    pages: s.pages.filter(p => p.id !== pageId),
    archivedPages: [...s.archivedPages, archivedPage],
    currentPageId: s.currentPageId === pageId ? null : s.currentPageId,
  }));

  const op = createOp(EntityType.PAGE, pageId, OpType.UPDATE, { isArchived: true, updatedAt: now }, { isArchived: false, updatedAt: page.updatedAt });
  const inverseOp = createOp(EntityType.PAGE, pageId, OpType.UPDATE, { isArchived: false, updatedAt: page.updatedAt }, { isArchived: true, updatedAt: now });

  return { ops: [op], inverseOps: [inverseOp], returnValue: archivedPage };
});

registerHandler('page/restore', async (payload) => {
  const pageId = payload.pageId || payload.id;
  const store = usePageStore.getState();
  const page = store.archivedPages.find(p => p.id === pageId);
  if (!page) return null;

  const now = Date.now();
  const restoredPage = { ...page, isArchived: false, updatedAt: now };

  usePageStore.setState(s => ({
    archivedPages: s.archivedPages.filter(p => p.id !== pageId),
    pages: [...s.pages, restoredPage],
  }));

  const op = createOp(EntityType.PAGE, pageId, OpType.UPDATE, { isArchived: false, updatedAt: now }, { isArchived: true, updatedAt: page.updatedAt });
  const inverseOp = createOp(EntityType.PAGE, pageId, OpType.UPDATE, { isArchived: true, updatedAt: page.updatedAt }, { isArchived: false, updatedAt: now });

  return { ops: [op], inverseOps: [inverseOp], returnValue: restoredPage };
});

registerHandler('page/move', async (payload) => {
  const pageId = payload.pageId || payload.id;
  const { newParentId } = payload;
  const store = usePageStore.getState();
  const page = store.pages.find(p => p.id === pageId);
  if (!page || pageId === newParentId) return null;

  const prevParentId = page.parentId;
  const now = Date.now();

  usePageStore.setState(s => ({
    pages: s.pages.map(p => p.id === pageId ? { ...p, parentId: newParentId, updatedAt: now } : p),
  }));

  const op = createOp(EntityType.PAGE, pageId, OpType.UPDATE, { parentId: newParentId, updatedAt: now }, { parentId: prevParentId, updatedAt: page.updatedAt });
  const inverseOp = createOp(EntityType.PAGE, pageId, OpType.UPDATE, { parentId: prevParentId, updatedAt: page.updatedAt }, { parentId: newParentId, updatedAt: now });

  return { ops: [op], inverseOps: [inverseOp] };
});

registerHandler('page/reorder', async (payload) => {
  const pageId = payload.pageId || payload.id;
  const { newSortOrder } = payload;
  const store = usePageStore.getState();
  const page = store.pages.find(p => p.id === pageId);
  if (!page) return null;

  const prevSortOrder = page.sortOrder;
  const now = Date.now();

  usePageStore.setState(s => ({
    pages: s.pages.map(p => p.id === pageId ? { ...p, sortOrder: newSortOrder, orderKey: newSortOrder, updatedAt: now } : p),
  }));

  const op = createOp(EntityType.PAGE, pageId, OpType.UPDATE, { sortOrder: newSortOrder, orderKey: newSortOrder, updatedAt: now }, { sortOrder: prevSortOrder, orderKey: prevSortOrder, updatedAt: page.updatedAt });
  const inverseOp = createOp(EntityType.PAGE, pageId, OpType.UPDATE, { sortOrder: prevSortOrder, orderKey: prevSortOrder, updatedAt: page.updatedAt }, { sortOrder: newSortOrder, orderKey: newSortOrder, updatedAt: now });

  return { ops: [op], inverseOps: [inverseOp] };
});

registerHandler('page/delete', async (payload) => {
  const pageId = payload.pageId || payload.id;
  const store = usePageStore.getState();
  const page = store.pages.find(p => p.id === pageId) || store.archivedPages.find(p => p.id === pageId);
  if (!page) return null;

  // Collect all descendant IDs
  const collectIds = (parentId) => {
    const children = store.pages.filter(p => p.parentId === parentId);
    let ids = [parentId];
    for (const child of children) {
      ids = [...ids, ...collectIds(child.id)];
    }
    return ids;
  };
  const idsToDelete = collectIds(pageId);
  const pagesBackup = store.pages.filter(p => idsToDelete.includes(p.id));

  usePageStore.setState(s => ({
    pages: s.pages.filter(p => !idsToDelete.includes(p.id)),
    archivedPages: s.archivedPages.filter(p => !idsToDelete.includes(p.id)),
  }));

  // DB delete deferred to persistenceWorker

  const op = createOp(EntityType.PAGE, pageId, OpType.DELETE, null, { pages: pagesBackup, ids: idsToDelete });
  const inverseOp = createOp(EntityType.PAGE, pageId, OpType.CREATE, { pages: pagesBackup, ids: idsToDelete });

  return { ops: [op], inverseOps: [inverseOp] };
});

// ═══════════════════════════════════════════════════════════════
// CRDT HANDLERS
// ═══════════════════════════════════════════════════════════════

registerHandler('crdt/update', async (payload) => {
  const { pageId, update } = payload;
  
  // DB addition deferred to persistenceWorker

  // Since crdt/update doesn't need to mutate Zustand directly (Yjs handles that),
  // we just create an op so it gets broadcasted to other tabs.
  const op = createOp('CRDT', pageId, 'CRDT_UPDATE', { update });
  
  return { ops: [op], inverseOps: [] };
});
