import React, { useState, useEffect, useRef } from 'react';
import { X, Brain, Flame, ArrowRight, Award, Check } from 'lucide-react';
import { useSecurityStore } from '../../stores/securityStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { db } from '../../db/database';
import { SecurityService } from '../../utils/securityService';

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

    const colors = ['#2E5BFF', '#2dd4bf', '#4ade80', '#fb923c', '#f87171', '#a78bfa'];
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
          const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));
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

  // Load preview outline of the page blocks
  useEffect(() => {
    if (!currentPage || completed) return;

    let active = true;
    const fetchPreview = async () => {
      try {
        const key = useSecurityStore.getState().derivedKey;
        const rawBlocks = await db.blocks.where('pageId').equals(currentPage.id).toArray();
        const sortedBlocks = rawBlocks.sort((a, b) => String(a.orderKey || '').localeCompare(String(b.orderKey || '')));
        
        const textContents = [];
        for (const block of sortedBlocks.slice(0, 10)) {
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
          }
        }
        if (active) {
          setPagePreview(textContents.join(' \n') || '(Empty page content)');
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
        background: 'rgba(5, 5, 6, 0.85)',
        backdropFilter: 'blur(16px)',
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
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
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
              <Brain size={22} color="var(--accent-primary)" />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Daily Recall Challenge</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Card {currentIndex + 1} of {duePages.length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#fb923c', fontWeight: 'bold' }}>
                <Flame size={14} fill="#fb923c" />
                <span>Streak: {srsStreak}d</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', width: '100%', overflow: 'hidden' }}>
              <div 
                style={{
                  height: '100%',
                  background: 'var(--accent-primary)',
                  width: `${(currentIndex / duePages.length) * 100}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            {/* Prompt Area */}
            <div style={{ background: 'rgba(46, 91, 255, 0.03)', border: '1px dashed rgba(46, 91, 255, 0.2)', borderRadius: '12px', padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{currentPage.icon || '📄'}</div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.05em' }}>Recall Prompt</div>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                "{currentPage.srsPrompt || currentPage.title || 'Untitled note'}"
              </h4>
            </div>

            {/* Answer Display */}
            {!revealed ? (
              <button 
                onClick={() => setRevealed(true)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(46, 91, 255, 0.3)'
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
                    style={{ background: '#f87171', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 0', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                  >
                    <span>🔄 Again</span>
                    <span style={{ fontSize: '9px', opacity: 0.8 }}>Forgot</span>
                  </button>
                  <button 
                    onClick={() => handleGrade(2)}
                    style={{ background: '#fb923c', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 0', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                  >
                    <span>😟 Hard</span>
                    <span style={{ fontSize: '9px', opacity: 0.8 }}>Struggled</span>
                  </button>
                  <button 
                    onClick={() => handleGrade(3)}
                    style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 0', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                  >
                    <span>🙂 Good</span>
                    <span style={{ fontSize: '9px', opacity: 0.8 }}>Correct</span>
                  </button>
                  <button 
                    onClick={() => handleGrade(4)}
                    style={{ background: '#60a5fa', color: '#000', border: 'none', borderRadius: '8px', padding: '10px 0', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
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
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.1)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#4ade80', marginBottom: '8px' }}>
              <Award size={36} style={{ margin: 'auto' }} />
            </div>
            
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>All Caught Up!</h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '300px', lineHeight: 1.5 }}>
              You have completed all your active recall checks for today. Your memory traces are successfully reinforced!
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(251, 146, 60, 0.1)', border: '1px solid rgba(251, 146, 60, 0.2)', borderRadius: '20px', fontSize: '14px', color: '#fb923c', fontWeight: 'bold' }}>
              <Flame size={16} fill="#fb923c" />
              <span>Current Streak: {srsStreak} Days</span>
            </div>

            <button 
              onClick={onClose}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '12px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                fontWeight: 'bold',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s'
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
