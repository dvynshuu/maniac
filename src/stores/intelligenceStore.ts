import { create } from 'zustand';
import { IntelligenceService } from '../utils/intelligenceService';
import { useSecurityStore } from './securityStore';
import { useSettingsStore } from './settingsStore';
import { useBlockStore } from './blockStore';
import { db } from '../db/database';
import { 
  ParsedBlockFlashcard, 
  extractFlashcardsFromBlock 
} from '../utils/activeRecallParser';
import { scheduleIdle, CancelFn } from '../utils/idleScheduler';

let _pendingFlashcardSyncCancel: CancelFn | null = null;

/**
 * Debounces syncBlockFlashcards by 300ms–500ms using requestIdleCallback
 * so typing never triggers synchronous cloze/QA regex scans or active recall re-renders.
 */
export function scheduleIdleFlashcardSync(pageId: string, blocks: any[], delayMs = 350): void {
  if (_pendingFlashcardSyncCancel) {
    _pendingFlashcardSyncCancel();
  }

  _pendingFlashcardSyncCancel = scheduleIdle(() => {
    _pendingFlashcardSyncCancel = null;
    useIntelligenceStore.getState().syncBlockFlashcards(pageId, blocks);
  }, delayMs);
}

export interface IntelligenceStore {
  nextActions: any[];
  forgetting: { stalePages: any[]; abandonedTodos: any[] };
  weeklyFocus: any;
  knowledgeVelocity: {
    velocity: number;
    dayBlocks: number;
    weekBlocks: number;
    totalBlocks: number;
    totalRelations?: number;
    dailyActivity: number[];
    depthLevel: number;
  };
  flashcards: ParsedBlockFlashcard[];
  isAnalyzing: boolean;
  lastAnalysisAt: number | null;
  analyze: () => Promise<void>;
  syncBlockFlashcards: (pageId: string, blocks: any[]) => void;
  gradeFlashcard: (flashcardId: string, grade: 1 | 2 | 3 | 4) => Promise<void>;
  getDueFlashcards: () => ParsedBlockFlashcard[];
}

export const useIntelligenceStore = create<IntelligenceStore>((set, get) => ({
  nextActions: [],
  forgetting: { stalePages: [], abandonedTodos: [] },
  weeklyFocus: null,
  knowledgeVelocity: { velocity: 0, dayBlocks: 0, weekBlocks: 0, totalBlocks: 0, totalRelations: 0, dailyActivity: [5, 5, 5, 5, 5, 5, 5], depthLevel: 1 },
  flashcards: [],
  isAnalyzing: false,
  lastAnalysisAt: null,

  analyze: async () => {
    const key = useSecurityStore.getState().derivedKey;
    if (!key) return;

    set({ isAnalyzing: true });
    
    try {
      const [nextActions, forgetting, weeklyFocus, knowledgeVelocity] = await Promise.all([
        IntelligenceService.getNextActions(key),
        IntelligenceService.getForgetting(key),
        IntelligenceService.getWeeklyFocus(key),
        IntelligenceService.getKnowledgeVelocity()
      ]);

      set({
        nextActions,
        forgetting,
        weeklyFocus,
        knowledgeVelocity,
        lastAnalysisAt: Date.now(),
        isAnalyzing: false
      });
    } catch (error) {
      console.error('Intelligence analysis failed:', error);
      set({ isAnalyzing: false });
    }
  },

  syncBlockFlashcards: (pageId: string, blocks: any[]) => {
    if (!pageId || !Array.isArray(blocks)) return;

    const currentCards = get().flashcards;
    const existingMap: Record<string, ParsedBlockFlashcard> = {};
    for (const c of currentCards) {
      existingMap[c.id] = c;
    }

    const newCardsForPage: ParsedBlockFlashcard[] = [];
    for (const b of blocks) {
      const extracted = extractFlashcardsFromBlock(b, pageId, existingMap);
      newCardsForPage.push(...extracted);
    }

    // Keep flashcards from other pages, replace this page's cards
    const otherPageCards = currentCards.filter(c => c.pageId !== pageId);
    const merged = [...otherPageCards, ...newCardsForPage];

    set({ flashcards: merged });
  },

  gradeFlashcard: async (flashcardId: string, grade: 1 | 2 | 3 | 4) => {
    const card = get().flashcards.find(c => c.id === flashcardId);
    if (!card) return;

    // SM-2 Spaced Repetition Algorithm
    let ease = card.ease || 2.5;
    let interval = card.interval || 1;
    let streak = card.streak || 0;

    if (grade === 1) { // Again
      streak = 0;
      interval = 1;
      ease = Math.max(1.3, ease - 0.2);
    } else if (grade === 2) { // Hard
      streak = 0;
      interval = 1;
      ease = Math.max(1.3, ease - 0.15);
    } else if (grade === 3) { // Good
      if (streak === 0) interval = 1;
      else if (streak === 1) interval = 4;
      else interval = Math.round(interval * ease);
      streak += 1;
    } else if (grade === 4) { // Easy
      if (streak === 0) interval = 2;
      else if (streak === 1) interval = 6;
      else interval = Math.round(interval * ease * 1.5);
      streak += 1;
      ease += 0.15;
    }

    const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;

    const updatedCard: ParsedBlockFlashcard = {
      ...card,
      ease,
      interval,
      streak,
      nextReview,
      lastGrade: grade,
      updatedAt: Date.now()
    };

    set({
      flashcards: get().flashcards.map(c => c.id === flashcardId ? updatedCard : c)
    });

    // Update global SRS streak in settings
    const todayStr = new Date().toISOString().split('T')[0];
    const settings = useSettingsStore.getState();
    if (settings.srsLastReviewDate !== todayStr) {
      let nextGlobalStreak = 1;
      if (settings.srsLastReviewDate) {
        const lastDate = new Date(settings.srsLastReviewDate);
        const todayDate = new Date(todayStr);
        const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          nextGlobalStreak = (settings.srsStreak || 0) + 1;
        }
      }
      settings.setSetting('srsStreak', nextGlobalStreak);
      settings.setSetting('srsLastReviewDate', todayStr);
    }

    // If linked to a block, also update block.properties in blockStore & Dexie
    if (card.blockId) {
      const block = useBlockStore.getState().blockMap[card.blockId];
      if (block) {
        const nextProps = {
          ...(block.properties || {}),
          ease,
          interval,
          streak,
          nextReview,
          lastGrade: grade
        };
        useBlockStore.setState({
          blockMap: {
            ...useBlockStore.getState().blockMap,
            [card.blockId]: {
              ...block,
              properties: nextProps
            }
          }
        });
        db.blocks.update(card.blockId, { properties: nextProps, updatedAt: Date.now() }).catch(() => {});
      }
    }
  },

  getDueFlashcards: () => {
    const now = Date.now();
    return get().flashcards.filter(c => c.nextReview <= now);
  }
}));
