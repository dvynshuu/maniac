/**
 * ─── Cross-Tab Sync Hook ────────────────────────────────────────
 * React hook that listens for operations from other tabs
 * and replays them into the local stores.
 */

import { useEffect } from 'react';
import { onMessage, initChannel, ChannelMessageType } from '../db/crossTabChannel';
import { replayRemoteOp } from '../core/commandBus';
import { receiveLamport } from '../db/opLog';
import { advanceVector } from '../db/actorId';

/**
 * Hook to keep this tab in sync with others.
 * Should be mounted once at the app root.
 */
export function useCrossTabSync() {
  useEffect(() => {
    initChannel();

    const unsub = onMessage(async (msg) => {
      if (msg.type === ChannelMessageType.OP_COMMITTED && msg.operation) {
        const op = msg.operation;

        // Update causal ordering
        if (op.lamport) {
          receiveLamport(op.lamport);
        }
        if (op.actorId && op.seq) {
          advanceVector(op.actorId, op.seq);
        }

        // Replay into local store
        await replayRemoteOp(op);
      }

      if (msg.type === ChannelMessageType.STORE_INVALIDATE) {
        // Force reload the relevant store
        if (msg.storeName === 'blocks') {
          const { useBlockStore } = await import('../stores/blockStore');
          const pageId = useBlockStore.getState().blockOrder.length > 0
            ? useBlockStore.getState().blockMap[useBlockStore.getState().blockOrder[0]]?.pageId
            : null;
          if (pageId) {
            useBlockStore.getState().loadBlocks(pageId);
          }
        }
        if (msg.storeName === 'pages') {
          const { usePageStore } = await import('../stores/pageStore');
          usePageStore.getState().loadPages();
        }
      }
    });

    return unsub;
  }, []);
}
