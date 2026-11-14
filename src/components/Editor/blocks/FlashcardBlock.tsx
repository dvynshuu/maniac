import React, { useState, useMemo } from 'react';
import { Brain, Flame, Check, RotateCw, Eye, Edit3, Sparkles } from 'lucide-react';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { useIntelligenceStore } from '../../../stores/intelligenceStore';
import { extractClozesFromText } from '../../../utils/activeRecallParser';

interface FlashcardBlockProps {
  block: any;
}

export default function FlashcardBlock({ block }: FlashcardBlockProps) {
  const engine = useEditorEngine(block.pageId);
  const gradeFlashcard = useIntelligenceStore(s => s.gradeFlashcard);

  const props = block.properties || {};
  const cardType: 'qa' | 'cloze' = props.cardType === 'cloze' ? 'cloze' : 'qa';
  const question = props.question || 'What is the key takeaway?';
  const answer = props.answer || 'The core insight or concept.';
  const clozeText = props.clozeText || '{{c1::Active recall}} strengthens memory retention.';

  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editQuestion, setEditQuestion] = useState(question);
  const [editAnswer, setEditAnswer] = useState(answer);
  const [editClozeText, setEditClozeText] = useState(clozeText);

  const streak = props.streak || 0;
  const interval = props.interval || 1;
  const nextReview = props.nextReview || Date.now();
  const isDue = nextReview <= Date.now();

  const clozes = useMemo(() => {
    return extractClozesFromText(clozeText);
  }, [clozeText]);

  const activeCloze = clozes[0] || {
    masked: clozeText.replace(/\{\{.*?\}\}/g, '[ ... ]'),
    answer: 'Answer',
    full: clozeText
  };

  const handleToggleCardType = (type: 'qa' | 'cloze') => {
    engine.updateBlock(block.id, {
      properties: { ...props, cardType: type }
    });
    setIsFlipped(false);
  };

  const handleSaveEdit = () => {
    engine.updateBlock(block.id, {
      properties: {
        ...props,
        question: editQuestion.trim(),
        answer: editAnswer.trim(),
        clozeText: editClozeText.trim()
      }
    });
    setIsEditing(false);
  };

  const handleGrade = async (grade: 1 | 2 | 3 | 4) => {
    const cardId = `card_block_${block.id}`;
    await gradeFlashcard(cardId, grade);
    setIsFlipped(false);
  };

  const formatDays = (days: number) => {
    if (days === 1) return '1d';
    if (days >= 30) return `${Math.round(days / 30)}mo`;
    return `${days}d`;
  };

  const nextIntervals = useMemo(() => {
    const ease = props.ease || 2.5;
    return {
      again: 1,
      hard: 1,
      good: streak === 0 ? 1 : (streak === 1 ? 4 : Math.round(interval * ease)),
      easy: streak === 0 ? 2 : (streak === 1 ? 6 : Math.round(interval * ease * 1.5))
    };
  }, [props.ease, interval, streak]);

  return (
    <div className={`flashcard-block my-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-xs transition-all ${isDue ? 'is-due border-[var(--color-border-strong)]' : ''}`}>
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] text-xs text-[var(--color-fg-secondary)]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[var(--color-surface-3)] text-[var(--color-fg)]">
            <Brain size={13} />
          </div>
          <span className="font-semibold tracking-wide uppercase text-[10px] text-[var(--color-fg)]">
            Active Recall Flashcard
          </span>
          {isDue && (
            <span className="px-1.5 py-0.5 rounded bg-[var(--color-primary-bg)] text-[var(--color-primary-fg)] font-bold text-[9px] uppercase tracking-wider">
              Due
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Streak indicator */}
          {streak > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-fg)]">
              <Flame size={12} className="text-amber-400" />
              <span>{streak}</span>
            </span>
          )}

          {/* Mode Switcher */}
          <div className="flex bg-[var(--color-surface-3)] border border-[var(--color-border-subtle)] rounded p-0.5 gap-0.5">
            <button
              onClick={() => handleToggleCardType('qa')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                cardType === 'qa' 
                  ? 'bg-[var(--color-surface-1)] text-[var(--color-fg)] shadow-xs' 
                  : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]'
              }`}
            >
              Q&A
            </button>
            <button
              onClick={() => handleToggleCardType('cloze')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                cardType === 'cloze' 
                  ? 'bg-[var(--color-surface-1)] text-[var(--color-fg)] shadow-xs' 
                  : 'text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]'
              }`}
            >
              Cloze
            </button>
          </div>

          {/* Edit toggle */}
          <button
            onClick={() => {
              if (isEditing) handleSaveEdit();
              else setIsEditing(true);
            }}
            className="p-1 rounded hover:bg-[var(--color-surface-3)] text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)] transition-colors"
            title={isEditing ? 'Save edits' : 'Edit card'}
          >
            {isEditing ? <Check size={13} /> : <Edit3 size={13} />}
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5">
        {isEditing ? (
          <div className="flex flex-col gap-3">
            {cardType === 'qa' ? (
              <>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-fg-tertiary)] block mb-1">
                    Question / Prompt
                  </label>
                  <input
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-3 py-1.5 text-xs text-[var(--color-fg)] outline-none focus:border-[var(--color-fg-secondary)]"
                    value={editQuestion}
                    onChange={e => setEditQuestion(e.target.value)}
                    placeholder="Enter front-of-card question..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-fg-tertiary)] block mb-1">
                    Answer / Back of Card
                  </label>
                  <textarea
                    rows={3}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-3 py-1.5 text-xs text-[var(--color-fg)] outline-none focus:border-[var(--color-fg-secondary)] resize-y"
                    value={editAnswer}
                    onChange={e => setEditAnswer(e.target.value)}
                    placeholder="Enter answer revealed upon review..."
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-fg-tertiary)] block mb-1">
                  Cloze Text (use {'{{c1::answer}}'} or {'{{c1::answer::hint}}'})
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-3 py-1.5 text-xs text-[var(--color-fg)] outline-none focus:border-[var(--color-fg-secondary)] font-mono resize-y"
                  value={editClozeText}
                  onChange={e => setEditClozeText(e.target.value)}
                  placeholder="e.g. Photosynthesis converts {{c1::light energy}} into chemical energy."
                />
                <p className="text-[11px] text-[var(--color-fg-muted)] mt-1">
                  Tip: Put curly braces around words you want to hide during self-testing.
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-xs text-[var(--color-fg-secondary)] hover:text-[var(--color-fg)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3.5 py-1 text-xs font-semibold bg-[var(--color-primary-bg)] text-[var(--color-primary-fg)] rounded hover:opacity-90"
              >
                Save Card
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Front Prompt */}
            <div className="flashcard-front">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-fg-tertiary)] block mb-1.5">
                {cardType === 'qa' ? 'Prompt' : 'Cloze Prompt'}
              </span>
              <p className="text-sm font-medium text-[var(--color-fg)] leading-relaxed">
                {cardType === 'qa' ? question : (isFlipped ? activeCloze.full : activeCloze.masked)}
              </p>
            </div>

            {/* Answer Reveal Section */}
            {isFlipped ? (
              <div className="flashcard-back pt-3 border-t border-[var(--color-border-subtle)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-fg-tertiary)] block mb-1.5">
                  Answer
                </span>
                <div className="p-3 rounded bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-fg)] font-medium leading-relaxed">
                  {cardType === 'qa' ? (
                    answer
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-bold">
                      <Sparkles size={13} className="text-amber-400" />
                      <span>{activeCloze.answer}</span>
                    </span>
                  )}
                </div>

                {/* SM-2 Rating Controls */}
                <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)] flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-fg-tertiary)] text-center">
                    Rate Your Memory Retrieval (SM-2)
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleGrade(1)}
                      className="px-2 py-2 rounded bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] text-center transition-colors group"
                    >
                      <span className="block text-[11px] font-semibold text-red-400">Again</span>
                      <span className="block text-[10px] text-[var(--color-fg-muted)]">{formatDays(nextIntervals.again)}</span>
                    </button>
                    <button
                      onClick={() => handleGrade(2)}
                      className="px-2 py-2 rounded bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] text-center transition-colors group"
                    >
                      <span className="block text-[11px] font-semibold text-amber-400">Hard</span>
                      <span className="block text-[10px] text-[var(--color-fg-muted)]">{formatDays(nextIntervals.hard)}</span>
                    </button>
                    <button
                      onClick={() => handleGrade(3)}
                      className="px-2 py-2 rounded bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] text-center transition-colors group"
                    >
                      <span className="block text-[11px] font-semibold text-[var(--color-fg)]">Good</span>
                      <span className="block text-[10px] text-[var(--color-fg-muted)]">{formatDays(nextIntervals.good)}</span>
                    </button>
                    <button
                      onClick={() => handleGrade(4)}
                      className="px-2 py-2 rounded bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] border border-[var(--color-border-strong)] text-center transition-colors group"
                    >
                      <span className="block text-[11px] font-semibold text-emerald-400">Easy</span>
                      <span className="block text-[10px] text-[var(--color-fg-muted)]">{formatDays(nextIntervals.easy)}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-[var(--color-fg-muted)]">
                  Next review in {formatDays(interval)}
                </span>
                <button
                  onClick={() => setIsFlipped(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded text-xs font-semibold text-[var(--color-fg)] transition-colors shadow-2xs"
                >
                  <Eye size={12} />
                  <span>Show Answer</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
