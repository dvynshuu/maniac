import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EditorEngine } from '../core/editor/Engine';
import { Transaction } from '../core/editor/Transaction';
import { broadcastOp, flushBroadcastOps, destroyChannel } from '../db/crossTabChannel';
import { encryptBlobTransferable, decryptBlobTransferable, postTransferable } from '../utils/cryptoWorker';
import fs from 'fs';
import path from 'path';

// Mock commandBus dispatchBatch to inspect dispatched operations
vi.mock('../core/commandBus', () => ({
  dispatchBatch: vi.fn(async (ops) => ops),
  dispatch: vi.fn(async (cmd) => cmd),
  undo: vi.fn(),
  redo: vi.fn(),
}));

import { dispatchBatch } from '../core/commandBus';

describe('Bottleneck 5: 150ms Transaction Buffer & OpLog Coalescing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await Transaction.flushAll();
    destroyChannel();
    vi.useRealTimers();
  });

  it('coalesces multiple rapid updateBlock calls within 150ms into a single atomic transaction', async () => {
    const engine = new EditorEngine('page-test-1');
    const blockId = 'block-123';

    // Simulate 5 fast keystrokes within 150ms
    const p1 = engine.updateBlock(blockId, { content: '<p>H</p>' });
    vi.advanceTimersByTime(20);

    const p2 = engine.updateBlock(blockId, { content: '<p>He</p>' });
    vi.advanceTimersByTime(20);

    const p3 = engine.updateBlock(blockId, { content: '<p>Hel</p>' });
    vi.advanceTimersByTime(20);

    const p4 = engine.updateBlock(blockId, { content: '<p>Hell</p>' });
    vi.advanceTimersByTime(20);

    const p5 = engine.updateBlock(blockId, { content: '<p>Hello</p>', properties: { wordCount: 1 } });

    // Nothing dispatched yet before timer expires
    expect(dispatchBatch).not.toHaveBeenCalled();

    // Advance beyond 150ms coalescing window
    vi.advanceTimersByTime(160);

    const results = await Promise.all([p1, p2, p3, p4, p5]);

    // Only ONE dispatchBatch call should have occurred!
    expect(dispatchBatch).toHaveBeenCalledTimes(1);

    const dispatchedOps = (dispatchBatch as any).mock.calls[0][0];
    expect(dispatchedOps).toHaveLength(1);
    expect(dispatchedOps[0].type).toBe('block/update');
    expect(dispatchedOps[0].payload.blockId).toBe(blockId);
    expect(dispatchedOps[0].payload.updates.content).toBe('<p>Hello</p>');
    expect(dispatchedOps[0].payload.updates.properties.wordCount).toBe(1);

    // All promises resolve with the transaction result
    results.forEach(res => {
      expect(res).toBe(dispatchedOps);
    });
  });

  it('flushes pending buffered mutations before structural operations like split or delete', async () => {
    const engine = new EditorEngine('page-test-2');
    const blockId = 'block-456';

    // User types content
    const updatePromise = engine.updateBlock(blockId, { content: '<p>Pending text</p>' });
    expect(dispatchBatch).not.toHaveBeenCalled();

    // User immediately splits or calls flush()
    await engine.flush();

    expect(dispatchBatch).toHaveBeenCalledTimes(1);
    const firstCallOps = (dispatchBatch as any).mock.calls[0][0];
    expect(firstCallOps[0].payload.updates.content).toBe('<p>Pending text</p>');

    await updatePromise;
  });

  it('Transaction.normalize merges duplicate block/update ops for the same blockId', async () => {
    const engine = new EditorEngine('page-test-3');
    const tx = engine.startTransaction();

    tx.updateBlock('b-1', { content: 'Initial', properties: { bold: true } });
    tx.updateBlock('b-1', { content: 'Updated', properties: { italic: true } });
    tx.updateBlock('b-2', { content: 'Different block' });

    tx.normalize();

    expect(tx.ops).toHaveLength(2);
    expect(tx.ops[0].payload.blockId).toBe('b-1');
    expect(tx.ops[0].payload.updates.content).toBe('Updated');
    expect(tx.ops[0].payload.updates.properties).toEqual({ bold: true, italic: true });
    expect(tx.ops[1].payload.blockId).toBe('b-2');
  });

  it('coalesces broadcastOp messages within 150ms to prevent cross-tab message flooding', () => {
    const broadcastSpy = vi.fn();
    // Create BroadcastChannel mock
    const originalBC = globalThis.BroadcastChannel;
    (globalThis as any).BroadcastChannel = class {
      postMessage = broadcastSpy;
      close = vi.fn();
    };

    try {
      broadcastOp({ entityId: 'block-1', entityType: 'block', op: 'update', payload: { content: 'a' } });
      broadcastOp({ entityId: 'block-1', entityType: 'block', op: 'update', payload: { content: 'ab' } });
      broadcastOp({ entityId: 'block-1', entityType: 'block', op: 'update', payload: { content: 'abc' } });

      // Before 150ms, nothing posted across channel
      expect(broadcastSpy).not.toHaveBeenCalled();

      // Advance 150ms
      vi.advanceTimersByTime(160);

      // Coalesced into a single OP_COMMITTED broadcast with latest content
      expect(broadcastSpy).toHaveBeenCalledTimes(1);
      const broadcastMsg = broadcastSpy.mock.calls[0][0];
      expect(broadcastMsg.type).toBe('OP_COMMITTED');
      expect(broadcastMsg.operation.payload.content).toBe('abc');
    } finally {
      (globalThis as any).BroadcastChannel = originalBC;
    }
  });
});

describe('Bottleneck 5: Transferable ArrayBuffer Payloads for Crypto/Persistence', () => {
  it('encryptBlobTransferable and decryptBlobTransferable transfer ArrayBuffer zero-copy', async () => {
    // Generate an AES-GCM CryptoKey for test
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const plaintext = new TextEncoder().encode('Hello Sovereign Workspace Encrypted Blob');
    const { buffer: encryptedBuffer, iv, transferList } = await encryptBlobTransferable(plaintext, key);

    expect(encryptedBuffer).toBeInstanceOf(ArrayBuffer);
    expect(transferList).toContain(encryptedBuffer);
    expect(iv.byteLength).toBe(12);

    // Decrypt transferred ArrayBuffer
    const { buffer: decryptedBuffer, transferList: decryptTransferList } = await decryptBlobTransferable(
      encryptedBuffer,
      iv,
      key
    );

    expect(decryptedBuffer).toBeInstanceOf(ArrayBuffer);
    expect(decryptTransferList).toContain(decryptedBuffer);

    const recoveredText = new TextDecoder().decode(decryptedBuffer);
    expect(recoveredText).toBe('Hello Sovereign Workspace Encrypted Blob');
  });

  it('postTransferable safely uses transferList or falls back', () => {
    const mockTarget = { postMessage: vi.fn() };
    const buffer = new ArrayBuffer(16);

    postTransferable(mockTarget, { type: 'TRANSFER_BLOB', buffer }, [buffer]);

    expect(mockTarget.postMessage).toHaveBeenCalledWith(
      { type: 'TRANSFER_BLOB', buffer },
      [buffer]
    );
  });
});

describe('Bottleneck 6: Lazy Loading Boundaries & Service Worker Precache Audit', () => {
  it('verifies CodeBlock, TableBlock, MathBlock, GraphView, and NotionImportModal are lazy loaded', () => {
    const blockRendererCode = fs.readFileSync(
      path.resolve(__dirname, '../components/Editor/BlockRenderer.tsx'),
      'utf-8'
    );
    const dashboardCode = fs.readFileSync(
      path.resolve(__dirname, '../components/Dashboard/Dashboard.tsx'),
      'utf-8'
    );
    const workspaceAppCode = fs.readFileSync(
      path.resolve(__dirname, '../components/Layout/WorkspaceApp.tsx'),
      'utf-8'
    );
    const appCode = fs.readFileSync(
      path.resolve(__dirname, '../App.tsx'),
      'utf-8'
    );

    // CodeBlock lazy loaded in BlockRenderer
    expect(blockRendererCode).toMatch(/const CodeBlock = lazy\(/);
    expect(blockRendererCode).not.toMatch(/^import CodeBlock from/m);

    // TableBlock and MathBlock lazy loaded in BlockRenderer
    expect(blockRendererCode).toMatch(/const TableBlock = lazy\(/);
    expect(blockRendererCode).toMatch(/const MathBlock = lazy\(/);

    // GraphView lazy loaded in Dashboard
    expect(dashboardCode).toMatch(/const GraphView = lazy\(/);
    expect(dashboardCode).not.toMatch(/^import GraphView from/m);

    // NotionImportModal lazy loaded in WorkspaceApp
    expect(workspaceAppCode).toMatch(/const NotionImportModal = lazy\(/);
    expect(workspaceAppCode).not.toMatch(/^import NotionImportModal from/m);

    // ActiveRecallNotes lazy loaded in App
    expect(appCode).toMatch(/const ActiveRecallNotes = lazy\(/);
  });

  it('verifies public/sw.js and vite.config.ts exclude heavy icon variants from precache', () => {
    const swCode = fs.readFileSync(path.resolve(__dirname, '../../public/sw.js'), 'utf-8');
    const viteConfigCode = fs.readFileSync(path.resolve(__dirname, '../../vite.config.ts'), 'utf-8');

    // sw.js PRECACHE_ASSETS must only have root and core shell, never 1024x1024 icons
    const precacheMatch = swCode.match(/const PRECACHE_ASSETS = \[([\s\S]*?)\];/);
    expect(precacheMatch).toBeTruthy();
    const precacheBlock = precacheMatch![1];
    expect(precacheBlock).not.toContain('icon-1024x1024.png');
    expect(precacheBlock).not.toContain('mstile-');
    expect(precacheBlock).not.toContain('apple-touch-icon-');

    // vite.config.ts explicitly filters out icon variants from dynamic precache list
    expect(viteConfigCode).toMatch(/(icon-|android-chrome|apple-touch|mstile|og-image)/);
  });
});
