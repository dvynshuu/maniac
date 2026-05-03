import { create } from 'zustand';
import { IntelligenceService } from '../utils/intelligenceService';
import { useSecurityStore } from './securityStore';

export const useIntelligenceStore = create((set, get) => ({
  nextActions: [],
  forgetting: { stalePages: [], abandonedTodos: [] },
  weeklyFocus: null,
  knowledgeVelocity: { velocity: 0, dayBlocks: 0, weekBlocks: 0, totalBlocks: 0, dailyActivity: [5, 5, 5, 5, 5, 5, 5], depthLevel: 1 },
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
  }
}));
