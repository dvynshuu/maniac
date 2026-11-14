import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBlockStore } from '../stores/blockStore';
import { useBacklinkStore, scheduleIdleBacklinkIndex } from '../stores/backlinkStore';
import { useIntelligenceStore, scheduleIdleFlashcardSync } from '../stores/intelligenceStore';
import { scheduleIdle } from '../utils/idleScheduler';

describe('Bottleneck 4: Zustand Cross-Store Cascade Re-renders & Idle Debouncing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('1. Granular Selector Isolation with subscribeWithSelector', () => {
    it('only notifies subscribers when their specific block identity changes', () => {
      // Seed store with 3 distinct blocks
      useBlockStore.setState({
        blocks: {
          b1: { id: 'b1', content: 'Block 1', pageId: 'p1', type: 'text', properties: {}, sortOrder: 'a' } as any,
          b2: { id: 'b2', content: 'Block 2', pageId: 'p1', type: 'text', properties: {}, sortOrder: 'b' } as any,
          b3: { id: 'b3', content: 'Block 3', pageId: 'p1', type: 'text', properties: {}, sortOrder: 'c' } as any,
        },
        blockOrder: ['b1', 'b2', 'b3'],
      });

      const b2Subscriber = vi.fn();
      const b3Subscriber = vi.fn();

      // Subscribe specifically to b2 and b3 using subscribeWithSelector
      const unsubB2 = useBlockStore.subscribe(
        s => s.blocks['b2'],
        b2Subscriber
      );
      const unsubB3 = useBlockStore.subscribe(
        s => s.blocks['b3'],
        b3Subscriber
      );

      // Typing/mutating Block b1:
      const currentB1 = useBlockStore.getState().blocks['b1'];
      useBlockStore.setState(s => ({
        blockMap: {
          ...s.blockMap,
          b1: { ...currentB1, content: 'Block 1 updated' },
        },
      }));

      // B2 and B3 subscribers MUST NOT be triggered!
      expect(b2Subscriber).not.toHaveBeenCalled();
      expect(b3Subscriber).not.toHaveBeenCalled();

      // Typing/mutating Block b2:
      const currentB2 = useBlockStore.getState().blocks['b2'];
      useBlockStore.setState(s => ({
        blockMap: {
          ...s.blockMap,
          b2: { ...currentB2, content: 'Block 2 updated' },
        },
      }));

      // B2 was notified, but B3 was still isolated and NOT triggered
      expect(b2Subscriber).toHaveBeenCalledTimes(1);
      expect(b3Subscriber).not.toHaveBeenCalled();

      unsubB2();
      unsubB3();
    });

    it('synchronizes blocks and blockMap references automatically on setState', () => {
      useBlockStore.setState({
        blockMap: {
          test: { id: 'test', content: 'Sync test' } as any,
        },
      });

      const state = useBlockStore.getState();
      expect(state.blocks).toBeDefined();
      expect(state.blocks['test']).toBe(state.blockMap['test']);
    });
  });

  describe('2. scheduleIdle & Debounced Derivation Execution', () => {
    it('debounces execution and runs callback after delay', () => {
      const cb = vi.fn();
      scheduleIdle(cb, 350);

      expect(cb).not.toHaveBeenCalled();

      // Advance 200ms — should still be pending
      vi.advanceTimersByTime(200);
      expect(cb).not.toHaveBeenCalled();

      // Advance remaining 150ms — should trigger
      vi.advanceTimersByTime(150);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('cancels pending run when cancel function is called', () => {
      const cb = vi.fn();
      const cancel = scheduleIdle(cb, 350);

      vi.advanceTimersByTime(100);
      cancel();

      vi.advanceTimersByTime(500);
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('3. Backlink Indexing Idle Debouncing', () => {
    it('debounces rapid keystrokes so backlink regex is never executed synchronously on every character', () => {
      const indexSpy = vi.spyOn(useBacklinkStore.getState(), 'indexBlock');

      // Simulate rapid typing: 5 characters typed in 100ms
      scheduleIdleBacklinkIndex('b1', 'page1', 'Mentio', 350);
      scheduleIdleBacklinkIndex('b1', 'page1', 'Mention', 350);
      scheduleIdleBacklinkIndex('b1', 'page1', 'Mention <span data-page-id="p2">@Page</span>', 350);

      // Must NOT be executed synchronously during keystrokes
      expect(indexSpy).not.toHaveBeenCalled();

      // Advance through debounce window
      vi.advanceTimersByTime(400);

      // Only the final collapsed call should be executed
      expect(indexSpy).toHaveBeenCalledTimes(1);
      expect(indexSpy).toHaveBeenCalledWith('b1', 'page1', 'Mention <span data-page-id="p2">@Page</span>');

      indexSpy.mockRestore();
    });
  });

  describe('4. Active Recall / Cloze Flashcards Idle Debouncing', () => {
    it('debounces flashcard syncing so regex clozes are not parsed on every single character', () => {
      const syncSpy = vi.spyOn(useIntelligenceStore.getState(), 'syncBlockFlashcards');

      const blocks = [
        { id: 'b1', content: 'Typing {{c1::cloze}}' } as any,
      ];

      // Simulate 3 keystrokes in succession
      scheduleIdleFlashcardSync('p1', blocks, 350);
      scheduleIdleFlashcardSync('p1', blocks, 350);
      scheduleIdleFlashcardSync('p1', blocks, 350);

      // Synchronous execution blocked
      expect(syncSpy).not.toHaveBeenCalled();

      // Advance through debounce time
      vi.advanceTimersByTime(400);

      // Only executed once
      expect(syncSpy).toHaveBeenCalledTimes(1);
      expect(syncSpy).toHaveBeenCalledWith('p1', blocks);

      syncSpy.mockRestore();
    });
  });
});
