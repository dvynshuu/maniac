import React, { useState, useEffect, useRef } from 'react';
import { X, Brain, Flame, Award } from 'lucide-react';
import { useSecurityStore } from '../../stores/securityStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { db } from '../../db/database';
import { SecurityService } from '../../utils/securityService';
import { compareSortOrder } from '../../utils/helpers';

// Simple lightweight HTML5 Canvas Confetti helper
function CanvasConfetti({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    
    // Set size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const colors = ['#ffffff', '#e5e5e5', '#a3a3a3', '#737373', '#525252'];
    const particles = Array.from({ length: 100 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - idx/3) * 15;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();

        if (p.y > canvas.height) {
          particles[idx] = {
            x: Math.random() * canvas.width,
            y: -20,
            r: p.r,
            d: p.d,
            color: p.color,
            tilt: Math.random() * 10 - 5,
            tiltAngleIncremental: p.tiltAngleIncremental,
            tiltAngle: 0
          };
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    />
  );
}

export default function RecallChallengeModal({ duePages, updatePage, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [pagePreview, setPagePreview] = useState('Loading preview...');
  const [completed, setCompleted] = useState(false);
  
  // Settings Store for global streaks
  const srsStreak = useSettingsStore(s => s.srsStreak);
  const setSetting = useSettingsStore(s => s.setSetting);
  const srsLastReviewDate = useSettingsStore(s => s.srsLastReviewDate);

  const currentPage = duePages[currentIndex];

  useEffect(() => {
    if (currentIndex >= duePages.length) {
      setCompleted(true);
      
      // Update global daily streak when finishing the entire queue
      const todayStr = new Date().toISOString().split('T')[0];
      if (srsLastReviewDate !== todayStr) {
        let nextGlobalStreak = 1;
        if (srsLastReviewDate) {
          const lastDate = new Date(srsLastReviewDate);
          const todayDate = new Date(todayStr);
          const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            nextGlobalStreak = (srsStreak || 0) + 1;
          }
        }
        setSetting('srsStreak', nextGlobalStreak);
        setSetting('srsLastReviewDate', todayStr);
      }
    } else {
      setRevealed(false);
      setPagePreview('Loading preview...');
    }
  }, [currentIndex, duePages.length]);

  const [clozeCards, setClozeCards] = useState([]);

  // Load preview outline of the page blocks and extract Cloze flashcards
  useEffect(() => {
    if (!currentPage || completed) return;

    let active = true;
    const fetchPreview = async () => {
      try {
        const key = useSecurityStore.getState().derivedKey;
        const rawBlocks = await db.blocks.where('pageId').equals(currentPage.id).toArray();
        const sortedBlocks = rawBlocks.sort((a, b) => compareSortOrder(a.orderKey || a.sortOrder, b.orderKey || b.sortOrder));
        
        const textContents = [];
        const detectedClozes = [];

        for (const block of sortedBlocks) {
          let content = block.content || '';
          if (key && block._isEncrypted && typeof content === 'string') {
            try {
              content = await SecurityService.decrypt(content, key);
            } catch {
              content = '[Encrypted]';
            }
          }
          const plainText = content.replace(/<[^>]*>/g, ' ').trim();
          if (plainText) {
            textContents.push(plainText);

            // Cloze detection: {{c1::answer}}
            const clozeRegex = /\{\{c\d+::(.*?)\}\}/g;
            let match;
            while ((match = clozeRegex.exec(plainText)) !== null) {
              const fullMatch = match[0];
              const answer = match[1];
              const maskedText = plainText.replace(fullMatch, ' [ ... ] ');
              detectedClozes.push({
                masked: maskedText,
                answer,
                full: plainText
              });
            }
          }
        }
        if (active) {
          setPagePreview(textContents.slice(0, 10).join(' \n') || '(Empty page content)');
          setClozeCards(detectedClozes);
        }
      } catch (err) {
        console.error('Failed to load review page preview:', err);
        if (active) setPagePreview('Unable to decrypt page content.');
      }
    };

    fetchPreview();
    return () => { active = false; };
  }, [currentPage, completed]);

  const handleGrade = (grade) => {
    // SM-2 algorithm
    let ease = currentPage.srsEase || 2.5;
    let interval = currentPage.srsInterval || 1;
    let streak = currentPage.srsStreak || 0;

    if (grade === 1) {
      // Again
      streak = 0;
      interval = 1;
      ease = Math.max(1.3, ease - 0.2);
    } else if (grade === 2) {
      // Hard
      streak = 0;
      interval = 1;
      ease = Math.max(1.3, ease - 0.15);
    } else if (grade === 3) {
      // Good
      if (streak === 0) {
        interval = 1;
      } else if (streak === 1) {
        interval = 4;
      } else {
        interval = Math.round(interval * ease);
      }
      streak += 1;
    } else if (grade === 4) {
      // Easy
      if (streak === 0) {
        interval = 2;
      } else if (streak === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * ease * 1.5);
      }
      streak += 1;
      ease += 0.15;
    }

    const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;

    updatePage(currentPage.id, {
      srsInterval: interval,
      srsEase: ease,
      srsNextReview: nextReview,
      srsStreak: streak,
      srsLastGrade: grade
    });

    setCurrentIndex(prev => prev + 1);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'var(--color-overlay)',
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <CanvasConfetti active={completed} />

      <div 
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-dialog, 10px)',
          padding: '24px',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), var(--shadow-modal)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxSizing: 'border-box'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>

        {!completed ? (
          <>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Brain size={22} color="var(--color-fg)" />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Daily Recall Challenge</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Card {currentIndex + 1} of {duePages.length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-fg)', fontWeight: 'bold' }}>
                <Flame size={14} fill="var(--color-fg)" />
                <span>Streak: {srsStreak}d</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ height: '6px', background: 'var(--color-surface-2)', borderRadius: '3px', width: '100%', overflow: 'hidden' }}>
              <div 
                style={{
                  height: '100%',
                  background: 'var(--color-primary-bg)',
                  width: `${(currentIndex / duePages.length) * 100}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            {/* Prompt Area or Cloze Challenge */}
            <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{currentPage.icon || '📄'}</div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.05em' }}>
                {clozeCards.length > 0 ? 'Cloze Flashcard Challenge' : 'Recall Prompt'}
              </div>
              
              {clozeCards.length > 0 ? (
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {!revealed ? (
                    <span>{clozeCards[0].masked}</span>
                  ) : (
                    <span>
                      {clozeCards[0].masked.split(' [ ... ] ')[0]}
                      <span style={{ background: 'var(--color-surface-3)', color: 'var(--color-fg)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--color-border-strong)' }}>
                        {clozeCards[0].answer}
                      </span>
                      {clozeCards[0].masked.split(' [ ... ] ')[1]}
                    </span>
                  )}
                </div>
              ) : (
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  "{currentPage.srsPrompt || currentPage.title || 'Untitled note'}"
                </h4>
              )}
            </div>

            {/* Answer Display */}
            {!revealed ? (
              <button 
                onClick={() => setRevealed(true)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--color-primary-bg)',
                  color: 'var(--color-primary-fg)',
                  border: '1px solid var(--color-primary-bg)',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                Reveal Answer
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease-out' }}>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px', maxHeight: '180px', overflowY: 'auto' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px', fontSize: '15px' }}>{currentPage.title}</div>
                  <pre style={{ 
                    margin: 0, 
                    whiteSpace: 'pre-wrap', 
                    fontSize: '13px', 
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-sans)',
                    lineHeight: 1.5
                  }}>
                    {pagePreview}
                  </pre>
                </div>

                <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)' }}>How well did you recall this?</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <button 
                    onClick={() => handleGrade(1)}
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-fg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px 0', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                  >
                    <span>🔄 Again</span>
                    <span style={{ fontSize: '9px', opacity: 0.8 }}>Forgot</span>
                  </button>
                  <button 
                    onClick={() => handleGrade(2)}
                    style={{ background: 'var(--color-surface-3)', color: 'var(--color-fg)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px 0', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                  >
                    <span>😟 Hard</span>
                    <span style={{ fontSize: '9px', opacity: 0.8 }}>Struggled</span>
                  </button>
                  <button 
                    onClick={() => handleGrade(3)}
                    style={{ background: 'var(--color-surface-4)', color: 'var(--color-fg)', border: '1px solid var(--color-border-strong)', borderRadius: '8px', padding: '10px 0', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                  >
                    <span>🙂 Good</span>
                    <span style={{ fontSize: '9px', opacity: 0.8 }}>Correct</span>
                  </button>
                  <button 
                    onClick={() => handleGrade(4)}
                    style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary-fg)', border: '1px solid var(--color-primary-bg)', borderRadius: '8px', padding: '10px 0', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                  >
                    <span>😁 Easy</span>
                    <span style={{ fontSize: '9px', opacity: 0.8 }}>Instant</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Victory Completion Screen */
          <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-fg)', marginBottom: '8px' }}>
              <Award size={36} style={{ margin: 'auto' }} />
            </div>
            
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>All Caught Up!</h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '300px', lineHeight: 1.5 }}>
              You have completed all your active recall checks for today. Your memory traces are successfully reinforced!
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm, 4px)', fontSize: '13px', color: 'var(--color-fg)', fontWeight: 600 }}>
              <Flame size={15} fill="var(--color-fg)" />
              <span>Current Streak: {srsStreak} Days</span>
            </div>

            <button 
              onClick={onClose}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '10px 16px',
                background: 'var(--color-primary-bg)',
                border: '1px solid var(--color-primary-bg)',
                borderRadius: 'var(--radius-md, 6px)',
                fontWeight: 600,
                color: 'var(--color-primary-fg)',
                cursor: 'pointer',
                transition: 'all var(--duration-fast)'
              }}
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
