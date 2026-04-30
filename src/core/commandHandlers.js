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

// ─── Helper: Encrypt for DB ────────────────────────────────────

async function encryptForDB(data, isBlock = true) {
  const key = useSecurityStore.getState().derivedKey;
  const hmacKey = useSecurityStore.getState().hmacKey;
  const dbObj = { ...data };

  if (key) {
    if (isBlock) {
      if (hmacKey && dbObj.content !== undefined) {
        const words = extractWords(dbObj.content);
        const hashedWords = await Promise.all(words.map(w => SecurityService.hmacWord(w, hmacKey)));
        dbObj.words = hashedWords.filter(Boolean);
      } else if (dbObj.content !== undefined) {
        dbObj.words = [];
      }
      if (dbObj.content) {
        dbObj.content = await SecurityService.encrypt(dbObj.content, key);
      }
      if (dbObj.properties !== undefined) {
        dbObj.properties = await SecurityService.encrypt(JSON.stringify(dbObj.properties), key);
      }
    } else {
      // Page
      if (dbObj.title !== undefined) {
        dbObj.title = await SecurityService.encrypt(dbObj.title, key);
      }
    }
    if (dbObj.content !== undefined || dbObj.properties !== undefined || dbObj.title !== undefined) {
      dbObj._isEncrypted = true;
    }
  } else if (isBlock && dbObj.content !== undefined) {
    dbObj.words = extractWords(dbObj.content);
  }

  return dbObj;
}

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
  const store = useBlockStore.getState();
  const currentBlock = store.blockMap[blockId];
  if (!currentBlock) return null;

  const safeUpdates = JSON.parse(JSON.stringify(updates));
  if (safeUpdates.content !== undefined) safeUpdates.content = content_sanitizer(safeUpdates.content);
  if (safeUpdates.properties !== undefined) safeUpdates.properties = sanitizeObject(safeUpdates.properties);

  const now = Date.now();
  const prevPayload = {};
  for (const key of Object.keys(safeUpdates)) {
    prevPayload[key] = currentBlock[key];
  }
  prevPayload.updatedAt = currentBlock.updatedAt;

  // Optimistic update
  useBlockStore.setState(s => ({
    blockMap: { ...s.blockMap, [blockId]: { ...currentBlock, ...safeUpdates, updatedAt: now } },
  }));

  // Persist
  const dbUpd = await encryptForDB({ ...safeUpdates, updatedAt: now }, true);
  await db.blocks.update(blockId, dbUpd);

  // Operation
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
