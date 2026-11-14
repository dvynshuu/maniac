import { describe, it, expect, beforeEach } from 'vitest';
import { 
  extractClozesFromText, 
  extractQAFromText, 
  extractFlashcardsFromBlock 
} from '../utils/activeRecallParser';
import { useIntelligenceStore } from '../stores/intelligenceStore';
import { createFidelityBlock, BLOCK_PROPERTY_DEFAULTS } from '../utils/blockSchema';
import { BLOCK_TYPES, BLOCK_TYPE_META } from '../utils/constants';
import { getCommands } from '../core/slashCommandRegistry';
import { TiptapTransclusion } from '../extensions/tiptapTransclusion';

describe('PKM & Active Recall Bridge (Part C)', () => {
  beforeEach(() => {
    useIntelligenceStore.setState({ flashcards: [] });
  });

  describe('Cloze Deletion Parsing', () => {
    it('extracts standard Anki-style {{c1::answer}} cloze deletions', () => {
      const text = 'The capital of France is {{c1::Paris}}.';
      const clozes = extractClozesFromText(text);

      expect(clozes.length).toBe(1);
      expect(clozes[0].index).toBe(1);
      expect(clozes[0].answer).toBe('Paris');
      expect(clozes[0].masked).toBe('The capital of France is [ ... ].');
    });

    it('extracts cloze deletions with hints {{c1::answer::hint}}', () => {
      const text = '{{c2::Tokyo::Asian metropolis}} is the most populous city.';
      const clozes = extractClozesFromText(text);

      expect(clozes.length).toBe(1);
      expect(clozes[0].index).toBe(2);
      expect(clozes[0].answer).toBe('Tokyo');
      expect(clozes[0].hint).toBe('Asian metropolis');
      expect(clozes[0].masked).toBe('[ ... (Asian metropolis) ] is the most populous city.');
    });

    it('extracts simplified {{answer}} syntax without c1 index', () => {
      const text = 'Photosynthesis takes place inside {{chloroplasts}}.';
      const clozes = extractClozesFromText(text);

      expect(clozes.length).toBe(1);
      expect(clozes[0].answer).toBe('chloroplasts');
      expect(clozes[0].masked).toBe('Photosynthesis takes place inside [ ... ].');
    });

    it('extracts multiple clozes from a single paragraph or sentence', () => {
      const text = '{{c1::DNA}} is transcribed into {{c2::RNA}} and translated into {{c3::protein}}.';
      const clozes = extractClozesFromText(text);

      expect(clozes.length).toBe(3);
      expect(clozes[0].answer).toBe('DNA');
      expect(clozes[1].answer).toBe('RNA');
      expect(clozes[2].answer).toBe('protein');
    });
  });

  describe('Q&A Syntax Parsing', () => {
    it('extracts >> Question :: Answer syntax', () => {
      const text = '>> What is the speed of light? :: 299,792,458 m/s';
      const qas = extractQAFromText(text);

      expect(qas.length).toBe(1);
      expect(qas[0].question).toBe('What is the speed of light?');
      expect(qas[0].answer).toBe('299,792,458 m/s');
    });

    it('extracts >> Question? Answer syntax', () => {
      const text = '>> What is an immutable data structure? A structure that cannot be modified after creation.';
      const qas = extractQAFromText(text);

      expect(qas.length).toBe(1);
      expect(qas[0].question).toBe('What is an immutable data structure?');
      expect(qas[0].answer).toBe('A structure that cannot be modified after creation.');
    });
  });

  describe('Block-Level Flashcard Extraction', () => {
    it('extracts flashcards from dedicated flashcard blocks in qa mode', () => {
      const block = {
        id: 'block_fc_1',
        type: 'flashcard',
        properties: {
          cardType: 'qa',
          question: 'What is memoization?',
          answer: 'Caching results of deterministic function calls.',
          ease: 2.5,
          interval: 1,
        }
      };

      const cards = extractFlashcardsFromBlock(block, 'page-1');
      expect(cards.length).toBe(1);
      expect(cards[0].type).toBe('qa');
      expect(cards[0].question).toBe('What is memoization?');
      expect(cards[0].answer).toBe('Caching results of deterministic function calls.');
    });

    it('extracts flashcards from dedicated flashcard blocks in cloze mode', () => {
      const block = {
        id: 'block_fc_2',
        type: 'flashcard',
        properties: {
          cardType: 'cloze',
          clozeText: 'HTTP 404 indicates {{c1::Not Found}} error.',
          ease: 2.5,
          interval: 1,
        }
      };

      const cards = extractFlashcardsFromBlock(block, 'page-1');
      expect(cards.length).toBe(1);
      expect(cards[0].type).toBe('cloze');
      expect(cards[0].answer).toBe('Not Found');
      expect(cards[0].question).toContain('[ ... ]');
    });

    it('extracts flashcards embedded inside regular TextBlocks with {{clozes}}', () => {
      const block = {
        id: 'block_text_1',
        type: 'text',
        content: '<p>React components re-render when {{c1::state or props}} change.</p>'
      };

      const cards = extractFlashcardsFromBlock(block, 'page-1');
      expect(cards.length).toBe(1);
      expect(cards[0].type).toBe('cloze');
      expect(cards[0].answer).toBe('state or props');
    });

    it('extracts flashcards embedded inside ToggleBlocks with >> Q&A', () => {
      const block = {
        id: 'block_toggle_1',
        type: 'toggle',
        content: '<p>>> What is idempotent? :: An operation that can be applied multiple times without changing the result</p>'
      };

      const cards = extractFlashcardsFromBlock(block, 'page-1');
      expect(cards.length).toBe(1);
      expect(cards[0].type).toBe('qa');
      expect(cards[0].question).toBe('What is idempotent?');
      expect(cards[0].answer).toContain('multiple times without changing');
    });
  });

  describe('IntelligenceStore Active Recall Synchronization & SM-2', () => {
    it('syncs flashcards from multiple blocks on a page', () => {
      const blocks = [
        { id: 'b1', type: 'text', content: '{{c1::Closure}} retains access to lexical scope.' },
        { id: 'b2', type: 'text', content: '>> What is hoisting? :: Moving declarations to the top of scope' },
      ];

      useIntelligenceStore.getState().syncBlockFlashcards('page-1', blocks);
      const flashcards = useIntelligenceStore.getState().flashcards;

      expect(flashcards.length).toBe(2);
      expect(flashcards.some(c => c.type === 'cloze')).toBe(true);
      expect(flashcards.some(c => c.type === 'qa')).toBe(true);
    });

    it('grades a flashcard with SM-2: Again (1) resets streak, Good (3) advances interval', async () => {
      const blocks = [
        { id: 'b1', type: 'text', content: '{{c1::Closure}} retains access to lexical scope.' },
      ];

      useIntelligenceStore.getState().syncBlockFlashcards('page-1', blocks);
      const cardId = useIntelligenceStore.getState().flashcards[0].id;

      // Grade 3 (Good) on first review
      await useIntelligenceStore.getState().gradeFlashcard(cardId, 3);
      let updatedCard = useIntelligenceStore.getState().flashcards.find(c => c.id === cardId);
      expect(updatedCard?.streak).toBe(1);
      expect(updatedCard?.interval).toBe(1);

      // Grade 3 (Good) on second review
      await useIntelligenceStore.getState().gradeFlashcard(cardId, 3);
      updatedCard = useIntelligenceStore.getState().flashcards.find(c => c.id === cardId);
      expect(updatedCard?.streak).toBe(2);
      expect(updatedCard?.interval).toBe(4);

      // Grade 1 (Again) resets streak back to 0 and interval to 1
      await useIntelligenceStore.getState().gradeFlashcard(cardId, 1);
      updatedCard = useIntelligenceStore.getState().flashcards.find(c => c.id === cardId);
      expect(updatedCard?.streak).toBe(0);
      expect(updatedCard?.interval).toBe(1);
    });

    it('returns due flashcards correctly', () => {
      const blocks = [
        { id: 'b1', type: 'text', content: '{{c1::Due card}}' },
      ];

      const store = useIntelligenceStore.getState();
      store.syncBlockFlashcards('page-1', blocks);

      const due = store.getDueFlashcards();
      expect(due.length).toBe(1);
      expect(due[0].answer).toBe('Due card');
    });
  });

  describe('Block-Level Transclusion Extension (((blockId)))', () => {
    it('defines TipTapTransclusion with inline atom node configuration', () => {
      expect(TiptapTransclusion.name).toBe('transclusion');
      expect(TiptapTransclusion.config.group).toBe('inline');
      expect(TiptapTransclusion.config.inline).toBe(true);
      expect(TiptapTransclusion.config.atom).toBe(true);
    });

    it('renders HTML with transclusion-chip class and data attributes', () => {
      const mockNode = {
        attrs: {
          blockId: 'block_target_123',
          pageId: 'page_target_456',
          text: 'Key architectural insight about CRDT synchronization',
          blockType: 'heading1'
        }
      };

      const result = (TiptapTransclusion.config as any).renderHTML({
        node: mockNode,
        HTMLAttributes: {}
      });

      expect(result[0]).toBe('span');
      expect(result[1]['data-transclusion']).toBe('');
      expect(result[1]['data-block-id']).toBe('block_target_123');
      expect(result[1]['data-page-id']).toBe('page_target_456');
      expect(result[1].class).toBe('transclusion-chip');
      expect(result[2]).toContain('Key architectural insight');
    });
  });

  describe('Slash Command Registry & Block Schemas', () => {
    it('creates a FlashcardBlock with canonical schema defaults', () => {
      const block = createFidelityBlock('page-1', 'flashcard' as any);
      expect(block.type).toBe('flashcard');
      expect(block.properties.cardType).toBe('qa');
      expect(block.properties.ease).toBe(2.5);
      expect(block.properties.interval).toBe(1);
      expect(block.properties.streak).toBe(0);
    });

    it('discovers /flashcard and /cloze commands in slashCommandRegistry', async () => {
      const flashcardCmds = await getCommands('flashcard');
      expect(flashcardCmds.some(c => c.type === 'flashcard')).toBe(true);

      const clozeCmds = await getCommands('cloze');
      expect(clozeCmds.some(c => c.type === 'flashcard')).toBe(true);
    });
  });
});
