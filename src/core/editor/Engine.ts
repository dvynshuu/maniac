/**
 * ─── Core: Editor Engine ────────────────────────────────────────
 * High-level API for UI components to trigger state changes.
 * Acts as a factory for operations that are dispatched via the CommandBus.
 */

import { Transaction } from './Transaction';
import { useBlockStore } from '../../stores/blockStore';
import { undo, redo } from '../commandBus';
import { getActorId } from '../../db/actorId';
import type { BlockType } from '../../types';

export class EditorEngine {
  pageId: string;
  actorId: string;

  constructor(pageId: string, actorId?: string) {
    this.pageId = pageId;
    this.actorId = actorId || getActorId();
  }

  startTransaction(): Transaction {
    return new Transaction(this);
  }

  /**
   * Flushes all pending buffered text mutations across the workspace.
   */
  async flush(): Promise<void> {
    await Transaction.flushAll();
  }

  async updateBlock(blockId: string, updates: Record<string, any>, immediate = false): Promise<any> {
    if (immediate) {
      const key = `${this.pageId}:${blockId}`;
      await Transaction.flushBufferedBlock(key);
      return this.startTransaction().updateBlock(blockId, updates).commit();
    }
    return Transaction.bufferBlockUpdate(this, blockId, updates, 150);
  }

  async deleteBlock(blockId: string): Promise<any> {
    await this.flush();
    return this.startTransaction().deleteBlock(blockId).commit();
  }

  async insertAfter(blockId: string | null, type: BlockType | string = 'text', properties: Record<string, any> = {}): Promise<any> {
    await this.flush();
    const tx = this.startTransaction();
    const { parentId: overrideParentId, ...restProperties } = properties;
    const block = blockId ? useBlockStore.getState().blockMap[blockId] : null;
    const parentId = overrideParentId !== undefined ? overrideParentId : (block ? block.parentId : null);
    
    if (type === 'page') {
      const { createId } = await import('../ids/identity');
      const subpageId = createId();
      tx.ops.push({
        type: 'page/create',
        payload: { id: subpageId, parentId: this.pageId }
      });
      tx.createBlock('page', parentId, blockId, { pageId: subpageId, ...restProperties });
    } else {
      tx.createBlock(type, parentId, blockId, restProperties);
    }
    return tx.commit();
  }

  async move(blockId: string, targetParentId: string | null, targetAfterId: string | null): Promise<any> {
    await this.flush();
    const tx = this.startTransaction();
    tx.moveBlock(blockId, targetParentId, targetAfterId);
    return tx.commit();
  }

  async nest(blockId: string): Promise<any> {
    await this.flush();
    const store = useBlockStore.getState();
    const { blockOrder, blockMap } = store;
    const index = blockOrder.indexOf(blockId);
    if (index <= 0) return;

    const prevBlockId = blockOrder[index - 1];
    const prevBlock = blockMap[prevBlockId];
    const currentBlock = blockMap[blockId];

    if (currentBlock && prevBlock && currentBlock.parentId === prevBlock.parentId) {
      const tx = this.startTransaction();
      tx.moveBlock(blockId, prevBlockId, null);
      return tx.commit();
    }
  }

  async unnest(blockId: string): Promise<any> {
    await this.flush();
    const store = useBlockStore.getState();
    const { blockMap } = store;
    const currentBlock = blockMap[blockId];
    if (!currentBlock || !currentBlock.parentId) return;

    const parentBlock = blockMap[currentBlock.parentId];
    const grandParentId = parentBlock ? parentBlock.parentId : null;

    const tx = this.startTransaction();
    tx.moveBlock(blockId, grandParentId, currentBlock.parentId);
    return tx.commit();
  }

  async split(blockId: string, contentBefore: string, contentAfter: string, newType?: string): Promise<any> {
    await this.flush();
    const tx = this.startTransaction();
    const block = useBlockStore.getState().blockMap[blockId];
    if (!block) return;
    
    tx.updateBlock(blockId, { content: contentBefore });

    const targetType = newType || block.type;
    const properties = targetType === 'todo'
      ? { checked: false }
      : (targetType === block.type ? { ...block.properties } : {});

    tx.createBlock(targetType, block.parentId, blockId, { 
      content: contentAfter,
      properties 
    });
    
    return tx.commit();
  }

  async merge(blockId: string, targetId: string): Promise<any> {
    await this.flush();
    const store = useBlockStore.getState();
    const block = store.blockMap[blockId];
    const target = store.blockMap[targetId];
    if (!block || !target) return;

    const tx = this.startTransaction();
    const combinedContent = target.content + block.content;
    tx.updateBlock(targetId, { content: combinedContent });
    tx.deleteBlock(blockId);
    
    return tx.commit();
  }

  async convertType(blockId: string, newType: string): Promise<any> {
    await this.flush();
    const tx = this.startTransaction();
    if (newType === 'page') {
      const { createId } = await import('../ids/identity');
      const subpageId = createId();
      tx.ops.push({
        type: 'page/create',
        payload: { id: subpageId, parentId: this.pageId }
      });
      tx.convertType(blockId, 'page', { pageId: subpageId });
    } else {
      tx.convertType(blockId, newType);
    }
    return tx.commit();
  }

  async createColumns(afterBlockId: string | null, count = 2): Promise<any> {
    await this.flush();
    const store = useBlockStore.getState();
    const block = afterBlockId ? store.blockMap[afterBlockId] : null;
    const parentId = block ? block.parentId : null;

    const tx = this.startTransaction();
    tx.createColumns(parentId, afterBlockId, count);
    return tx.commit();
  }

  async undo(): Promise<any> {
    return undo();
  }

  async redo(): Promise<any> {
    return redo();
  }
}
