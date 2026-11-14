import { createId } from '../ids/identity';
import { useBlockStore } from '../../stores/blockStore';
import { Normalizer } from './Normalizer';
import { dispatchBatch } from '../commandBus';
import type { EditorEngine } from './Engine';
import type { BlockType } from '../../types';

export interface QueuedOp {
  type: string;
  payload: Record<string, any>;
}

interface BufferedEntry {
  engine: EditorEngine;
  blockId: string;
  updates: Record<string, any>;
  resolvers: Array<(value: any) => void>;
  rejecters: Array<(reason: any) => void>;
  timer: any;
}

/**
 * ─── Editor Transaction ─────────────────────────────────────────
 * Batches multiple block and text operations into a single unit.
 */
export class Transaction {
  engine: EditorEngine;
  ops: QueuedOp[];
  private _isCommitted: boolean;
  private static _bufferedOps = new Map<string, BufferedEntry>();

  /**
   * Coalesce rapid text/property mutations for a block in a 150ms transaction buffer.
   * Flushes atomic transaction once typing pauses.
   */
  static async bufferBlockUpdate(
    engine: EditorEngine,
    blockId: string,
    updates: Record<string, any>,
    delayMs = 150
  ): Promise<any> {
    const key = `${engine.pageId}:${blockId}`;
    return new Promise((resolve, reject) => {
      const existing = Transaction._bufferedOps.get(key);
      if (existing) {
        if (existing.timer) clearTimeout(existing.timer);
        existing.updates = {
          ...existing.updates,
          ...updates,
          properties: {
            ...(existing.updates.properties || {}),
            ...(updates.properties || {}),
          }
        };
        existing.resolvers.push(resolve);
        existing.rejecters.push(reject);
        existing.timer = setTimeout(() => {
          Transaction.flushBufferedBlock(key);
        }, delayMs);
      } else {
        const entry: BufferedEntry = {
          engine,
          blockId,
          updates: { ...updates },
          resolvers: [resolve],
          rejecters: [reject],
          timer: setTimeout(() => {
            Transaction.flushBufferedBlock(key);
          }, delayMs),
        };
        Transaction._bufferedOps.set(key, entry);
      }
    });
  }

  static async flushBufferedBlock(key: string): Promise<any> {
    const entry = Transaction._bufferedOps.get(key);
    if (!entry) return;
    Transaction._bufferedOps.delete(key);
    if (entry.timer) clearTimeout(entry.timer);

    try {
      const tx = entry.engine.startTransaction();
      tx.updateBlock(entry.blockId, entry.updates);
      const res = await tx.commit();
      entry.resolvers.forEach(r => r(res));
      return res;
    } catch (err) {
      entry.rejecters.forEach(r => r(err));
      throw err;
    }
  }

  static async flushAll(): Promise<void> {
    const keys = Array.from(Transaction._bufferedOps.keys());
    if (keys.length === 0) return;
    await Promise.all(keys.map(k => Transaction.flushBufferedBlock(k)));
  }

  static getPendingBufferCount(): number {
    return Transaction._bufferedOps.size;
  }

  constructor(editorEngine: EditorEngine) {
    this.engine = editorEngine;
    this.ops = [];
    this._isCommitted = false;
  }

  createBlock(type: BlockType | string, parentId: string | null, afterBlockId: string | null, properties: Record<string, any> = {}): this {
    this.ops.push({
      type: 'block/create',
      payload: { pageId: this.engine.pageId, type, parentId, afterBlockId, properties }
    });
    return this;
  }

  updateBlock(blockId: string, updates: Record<string, any>): this {
    this.ops.push({
      type: 'block/update',
      payload: { blockId, updates }
    });
    return this;
  }

  deleteBlock(blockId: string): this {
    const store = useBlockStore.getState();
    const block = store.blockMap[blockId];
    if (block && block.type === 'page' && block.properties?.pageId) {
      this.ops.push({
        type: 'page/delete',
        payload: { pageId: block.properties.pageId }
      });
    }

    const descendants = store.getDescendants(blockId);
    
    for (const dId of descendants.reverse()) {
      this.ops.push({ type: 'block/delete', payload: { blockId: dId } });
    }

    this.ops.push({
      type: 'block/delete',
      payload: { blockId }
    });
    return this;
  }

  moveBlock(blockId: string, targetParentId: string | null, targetAfterBlockId: string | null): this {
    if (!Normalizer.isSafeMove(blockId, targetParentId)) {
      console.warn(`[Transaction] Blocked cyclic move: ${blockId} -> ${targetParentId}`);
      return this;
    }

    this.ops.push({
      type: 'block/move',
      payload: { blockId, targetParentId, targetAfterBlockId }
    });
    return this;
  }

  duplicateBlock(blockId: string, targetAfterBlockId: string | null = null): this {
    const store = useBlockStore.getState();
    const sourceBlock = store.blockMap[blockId];
    if (!sourceBlock) return this;

    const newIdMap = new Map<string, string>();
    const oldIds = [blockId, ...store.getDescendants(blockId)];

    for (const oldId of oldIds) {
      const block = store.blockMap[oldId];
      const newId = createId();
      newIdMap.set(oldId, newId);

      const parentId = oldId === blockId 
        ? sourceBlock.parentId 
        : (block.parentId ? newIdMap.get(block.parentId) || null : null);
      
      const afterId = oldId === blockId 
        ? (targetAfterBlockId || blockId) 
        : null;

      this.createBlock(block.type, parentId, afterId, { ...block.properties });
      const lastOp = this.ops[this.ops.length - 1];
      lastOp.payload.id = newId;
      lastOp.payload.content = block.content;
    }

    return this;
  }

  createColumns(parentId: string | null, afterBlockId: string | null, count = 2): this {
    const columnListId = createId();
    
    this.createBlock('column_list', parentId, afterBlockId);
    this.ops[this.ops.length - 1].payload.id = columnListId;

    let lastColId: string | null = null;
    for (let i = 0; i < count; i++) {
      const colId = createId();
      const textBlockId = createId();

      this.createBlock('column', columnListId, lastColId);
      this.ops[this.ops.length - 1].payload.id = colId;

      this.createBlock('text', colId, null);
      this.ops[this.ops.length - 1].payload.id = textBlockId;

      lastColId = colId;
    }
    return this;
  }

  convertType(blockId: string, newType: string, properties: Record<string, any> = {}): this {
    this.ops.push({
      type: 'block/changeType',
      payload: { blockId, newType, properties }
    });
    return this;
  }

  normalize(): this {
    if (this.ops.length <= 1) return this;

    const coalescedOps: QueuedOp[] = [];
    const blockUpdateIndices = new Map<string, number>();

    for (const op of this.ops) {
      if (op.type === 'block/update' && op.payload?.blockId) {
        const bId = op.payload.blockId;
        if (blockUpdateIndices.has(bId)) {
          const idx = blockUpdateIndices.get(bId)!;
          const prev = coalescedOps[idx];
          prev.payload.updates = {
            ...prev.payload.updates,
            ...op.payload.updates,
            properties: {
              ...(prev.payload.updates?.properties || {}),
              ...(op.payload.updates?.properties || {}),
            }
          };
          continue;
        } else {
          blockUpdateIndices.set(bId, coalescedOps.length);
        }
      }
      coalescedOps.push(op);
    }

    this.ops = coalescedOps;
    return this;
  }

  async commit(): Promise<any> {
    if (this._isCommitted) return;
    this._isCommitted = true;

    this.normalize();

    return dispatchBatch(this.ops);
  }
}
