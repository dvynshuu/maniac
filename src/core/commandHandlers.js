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
import { encryptForDB } from './persistence';

// ─── Handlers ──────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// BLOCK HANDLERS
// ═══════════════════════════════════════════════════════════════

registerHandler('block/create', async (payload) => {
  const { pageId, type = 'text', afterBlockId = null, content = '', properties = {}, parentId } = payload;
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
    content: safeContent,
    properties: safeProperties,
    sortOrder,
    parentId: resolvedParentId,
  });

  // Optimistic update
  const newBlockMap = { ...store.blockMap, [block.id]: block };
  const allBlocks = [...store.getBlocks(), block];
  allBlocks.sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));

  useBlockStore.setState({
    blockMap: newBlockMap,
    blockOrder: allBlocks.map(b => b.id),
    focusBlockId: block.id,
  });

  // Persist
  const dbBlock = await encryptForDB(block, true);
  await db.blocks.add(dbBlock);
  useUIStore.getState().updateOnboarding('blocksCreated');

  // Operation
  const op = createOp(EntityType.BLOCK, block.id, OpType.CREATE, block);
  const inverseOp = createOp(EntityType.BLOCK, block.id, OpType.DELETE, null, block);

  return { ops: [op], inverseOps: [inverseOp], returnValue: block };
});

registerHandler('block/update', async (payload) => {
  const { blockId, updates } = payload;

  // Fetch fresh record from DB (may be encrypted)
  let dbBlock = await db.blocks.get(blockId);
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

  // Optimistic update
  const mergedBlock = { ...currentBlock, ...safeUpdates, updatedAt: now };
  useBlockStore.setState(s => ({
    blockMap: { ...s.blockMap, [blockId]: mergedBlock },
  }));

  // Persist (encrypt if needed)
  const dbUpd = await encryptForDB({ ...safeUpdates, updatedAt: now }, true);
  await db.blocks.update(blockId, dbUpd);

  // Operation log
  const op = createOp(EntityType.BLOCK, blockId, OpType.UPDATE, { ...safeUpdates, updatedAt: now }, prevPayload);
  const inverseOp = createOp(EntityType.BLOCK, blockId, OpType.UPDATE, prevPayload, safeUpdates);

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

  await db.blocks.delete(blockId);

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

  const updatedBlock = { ...current, sortOrder: newSortOrder, updatedAt: now };
  const newBlockMap = { ...blockMap, [blockId]: updatedBlock };
  const allBlocks = blockOrder.map(id => id === blockId ? updatedBlock : blockMap[id]);
  allBlocks.sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));

  useBlockStore.setState({ blockMap: newBlockMap, blockOrder: allBlocks.map(b => b.id) });

  const dbUpd = await encryptForDB({ sortOrder: newSortOrder, updatedAt: now }, true);
  await db.blocks.update(blockId, dbUpd);

  const op = createOp(EntityType.BLOCK, blockId, OpType.REORDER, { sortOrder: newSortOrder }, { sortOrder: prevSortOrder });
  const inverseOp = createOp(EntityType.BLOCK, blockId, OpType.REORDER, { sortOrder: prevSortOrder }, { sortOrder: newSortOrder });

  return { ops: [op], inverseOps: [inverseOp] };
});

registerHandler('block/changeType', async (payload) => {
  const { blockId, newType } = payload;
  const store = useBlockStore.getState();
  const block = store.blockMap[blockId];
  if (!block) return null;

  const prevType = block.type;
  const prevProperties = { ...block.properties };

  const properties = ensureDefaults(newType, { ...block.properties });
  const now = Date.now();

  useBlockStore.setState(s => ({
    blockMap: { ...s.blockMap, [blockId]: { ...block, type: newType, properties, updatedAt: now } },
  }));

  const dbUpd = await encryptForDB({ type: newType, properties, updatedAt: now }, true);
  await db.blocks.update(blockId, dbUpd);

  const op = createOp(EntityType.BLOCK, blockId, OpType.CHANGE_TYPE,
    { type: newType, properties },
    { type: prevType, properties: prevProperties }
  );
  const inverseOp = createOp(EntityType.BLOCK, blockId, OpType.CHANGE_TYPE,
    { type: prevType, properties: prevProperties },
    { type: newType, properties }
  );

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
  const updates = { parentId: targetParentId || null, sortOrder, updatedAt: now };

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

  const dbUpd = await encryptForDB(updates, true);
  await db.blocks.update(blockId, dbUpd);

  const op = createOp(EntityType.BLOCK, blockId, OpType.UPDATE, updates, { parentId: prevParentId, sortOrder: prevSortOrder });
  const inverseOp = createOp(EntityType.BLOCK, blockId, OpType.UPDATE, { parentId: prevParentId, sortOrder: prevSortOrder }, updates);

  return { ops: [op], inverseOps: [inverseOp] };
});

// ═══════════════════════════════════════════════════════════════
// PAGE HANDLERS
// ═══════════════════════════════════════════════════════════════

registerHandler('page/create', async (payload) => {
  const { parentId = null } = payload;
  const store = usePageStore.getState();
  const siblings = store.pages.filter(p => p.parentId === parentId)
    .sort((a, b) => String(a.sortOrder || '').localeCompare(String(b.sortOrder || '')));
  const lastSibling = siblings[siblings.length - 1];
  const sortOrder = generateLexicalOrder(lastSibling?.sortOrder || null, null);

  const page = createPage({ parentId, sortOrder });

  usePageStore.setState(s => ({ pages: [...s.pages, page] }));

  const dbPage = await encryptForDB(page, false);
  await db.pages.add(dbPage);
  useUIStore.getState().updateOnboarding('pagesCreated');

  const op = createOp(EntityType.PAGE, page.id, OpType.CREATE, page);
  const inverseOp = createOp(EntityType.PAGE, page.id, OpType.DELETE, null, page);

  return { ops: [op], inverseOps: [inverseOp], returnValue: page };
});

registerHandler('page/update', async (payload) => {
  const { pageId, updates } = payload;
  const store = usePageStore.getState();
  const page = store.pages.find(p => p.id === pageId);
  if (!page) return null;

  const now = Date.now();
  const prevPayload = {};
  for (const key of Object.keys(updates)) {
    prevPayload[key] = page[key];
  }

  usePageStore.setState(s => ({
    pages: s.pages.map(p => p.id === pageId ? { ...p, ...updates, updatedAt: now } : p),
    archivedPages: s.archivedPages.map(p => p.id === pageId ? { ...p, ...updates, updatedAt: now } : p),
  }));

  const dbUpdates = await encryptForDB({ ...updates, updatedAt: now }, false);
  await db.pages.update(pageId, dbUpdates);

  const op = createOp(EntityType.PAGE, pageId, OpType.UPDATE, { ...updates, updatedAt: now }, prevPayload);
  const inverseOp = createOp(EntityType.PAGE, pageId, OpType.UPDATE, prevPayload, updates);

  return { ops: [op], inverseOps: [inverseOp] };
});

registerHandler('page/delete', async (payload) => {
  const { pageId } = payload;
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

  await db.transaction('rw', [db.pages, db.blocks], async () => {
    await db.blocks.where('pageId').anyOf(idsToDelete).delete();
    await db.pages.bulkDelete(idsToDelete);
  });

  const op = createOp(EntityType.PAGE, pageId, OpType.DELETE, null, { pages: pagesBackup, ids: idsToDelete });
  const inverseOp = createOp(EntityType.PAGE, pageId, OpType.CREATE, { pages: pagesBackup, ids: idsToDelete });

  return { ops: [op], inverseOps: [inverseOp] };
});
