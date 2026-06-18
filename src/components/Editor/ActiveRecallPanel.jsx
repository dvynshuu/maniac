import React, { useState, useEffect, useRef } from 'react';
import { Brain, Flame, Calendar, X, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSecurityStore } from '../../stores/securityStore';
import { db } from '../../db/database';
import { SecurityService } from '../../utils/securityService';

export default function ActiveRecallPanel({ page, updatePage, onClose }) {
  const [prompt, setPrompt] = useState(page.srsPrompt || '');
  const [isReviewing, setIsReviewing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [pageBlocksPreview, setPageBlocksPreview] = useState('');
  const popoverRef = useRef(null);

  // Global settings
  const srsStreak = useSettingsStore(s => s.srsStreak);
  const setSetting = useSettingsStore(s => s.setSetting);
  const srsLastReviewDate = useSettingsStore(s => s.srsLastReviewDate);

  useEffect(() => {
    setPrompt(page.srsPrompt || '');
  }, [page.srsPrompt]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const srsEnabled = !!page.srsEnabled;
  const isDue = srsEnabled && page.srsNextReview && page.srsNextReview <= Date.now();

  const handleToggle = (val) => {
    if (val) {
      updatePage(page.id, {
        srsEnabled: true,
        srsPrompt: prompt || '',
        srsInterval: 1,
        srsEase: 2.5,
        srsNextReview: Date.now(),
        srsStreak: 0,
        srsLastGrade: null
      });
      setIsReviewing(false);
    } else {
      updatePage(page.id, {
        srsEnabled: false
      });
      setIsReviewing(false);
      setRevealed(false);
    }
  };

  const handleSavePrompt = () => {
    updatePage(page.id, { srsPrompt: prompt });
  };

  const fetchPagePreview = async () => {
    try {
      const key = useSecurityStore.getState().derivedKey;
      const rawBlocks = await db.blocks.where('pageId').equals(page.id).toArray();
      const sortedBlocks = rawBlocks.sort((a, b) => String(a.orderKey || '').localeCompare(String(b.orderKey || '')));
      
      const textContents = [];
      for (const block of sortedBlocks.slice(0, 8)) {
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
      setPageBlocksPreview(textContents.join(' \n') || '(Empty page content)');
    } catch (err) {
      console.error('Failed to load page outline preview:', err);
      setPageBlocksPreview('Unable to decrypt page contents.');
    }
  };

  const handleStartReview = () => {
    setIsReviewing(true);
    setRevealed(false);
    fetchPagePreview();
  };

  const gradeReview = (grade) => {
    let ease = page.srsEase || 2.5;
    let interval = page.srsInterval || 1;
    let streak = page.srsStreak || 0;

    if (grade === 1) {
      streak = 0;
      interval = 1;
      ease = Math.max(1.3, ease - 0.2);
    } else if (grade === 2) {
      streak = 0;
      interval = 1;
      ease = Math.max(1.3, ease - 0.15);
    } else if (grade === 3) {
      if (streak === 0) {
        interval = 1;
      } else if (streak === 1) {
        interval = 4;
      } else {
        interval = Math.round(interval * ease);
      }
      streak += 1;
    } else if (grade === 4) {
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

    updatePage(page.id, {
      srsInterval: interval,
      srsEase: ease,
      srsNextReview: nextReview,
      srsStreak: streak,
      srsLastGrade: grade
    });

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

    import('../../stores/uiStore').then(({ useUIStore }) => {
      useUIStore.getState().addToast(`Recall logged. Next review in ${interval} days!`, 'success');
    });

    setIsReviewing(false);
    setRevealed(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    if (timestamp <= Date.now()) return 'Due now';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div 
      ref={popoverRef}
      className="active-recall-popover" 
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: '320px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(255, 255, 255, 0.05)',
        zIndex: 3000,
        fontSize: '13px',
        color: 'var(--text-secondary)',
        textAlign: 'left',
        cursor: 'default'
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          <Brain size={16} color="var(--accent-primary)" />
          <span>Active Recall Settings</span>
        </div>
        <button 
          onClick={onClose} 
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px', display: 'flex' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Toggle Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: '6px', marginBottom: '12px' }}>
        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Enable Spaced Repetition</span>
        <button
          type="button"
          className={`setting-toggle ${srsEnabled ? 'on' : ''}`}
          onClick={() => handleToggle(!srsEnabled)}
          style={{
            width: '36px',
            height: '20px',
            borderRadius: '10px',
            background: srsEnabled ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
            border: 'none',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          <div 
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: '3px',
              left: srsEnabled ? '19px' : '3px',
              transition: 'left 0.2s'
            }}
          />
        </button>
      </div>

      {/* Active State Configuration */}
      {srsEnabled && !isReviewing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Prompt question editing */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Recall Prompt (Question)</label>
            <input
              className="db-menu-input"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onBlur={handleSavePrompt}
              placeholder="Question to test your memory (defaults to title)"
              style={{ width: '100%', padding: '6px 10px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Stats Summary */}
          <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '6px', padding: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
              <div>Interval: <b style={{ color: 'var(--text-secondary)' }}>{page.srsInterval || 1}d</b></div>
              <div>Ease: <b style={{ color: 'var(--text-secondary)' }}>{Number(page.srsEase || 2.5).toFixed(1)}x</b></div>
              <div style={{ gridColumn: 'span 2' }}>Next Review: <b style={{ color: isDue ? '#f87171' : 'var(--text-secondary)' }}>{formatDate(page.srsNextReview)}</b></div>
            </div>
            {page.srsStreak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#fb923c', fontWeight: 'bold', marginTop: '6px' }}>
                <Flame size={12} fill="#fb923c" />
                <span>Page Streak: {page.srsStreak} reviews</span>
              </div>
            )}
          </div>

          {/* Prompt to review if due */}
          {isDue ? (
            <button
              onClick={handleStartReview}
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Brain size={13} /> Review Due Challenge Now
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.1)', borderRadius: '4px', fontSize: '11px', color: '#4ade80' }}>
              <AlertCircle size={12} />
              <span>Review is scheduled correctly.</span>
            </div>
          )}
        </div>
      )}

      {/* Inline Review Challenge Panel */}
      {srsEnabled && isReviewing && (
        <div style={{ marginTop: '4px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '12px' }}>Recall Challenge:</div>
          <div style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--text-secondary)', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', lineHeight: 1.4 }}>
            "{prompt || page.title || 'Untitled page'}"
          </div>

          {!revealed ? (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => { setRevealed(true); }}
              style={{ width: '100%', padding: '6px', cursor: 'pointer' }}
            >
              Reveal Answer
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>Page Preview</div>
              <div style={{ 
                background: 'rgba(0, 0, 0, 0.2)', 
                padding: '8px', 
                borderRadius: '4px', 
                fontSize: '11px', 
                maxHeight: '80px', 
                overflowY: 'auto',
                color: 'var(--text-primary)',
                borderLeft: '2px solid var(--accent-primary)',
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'pre-wrap'
              }}>
                {pageBlocksPreview}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                <button onClick={() => gradeReview(1)} style={{ background: '#f87171', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 0', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Again</button>
                <button onClick={() => gradeReview(2)} style={{ background: '#fb923c', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 0', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Hard</button>
                <button onClick={() => gradeReview(3)} style={{ background: '#4ade80', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 0', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Good</button>
                <button onClick={() => gradeReview(4)} style={{ background: '#60a5fa', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 0', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Easy</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inactive Help Note */}
      {!srsEnabled && (
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4, marginTop: '4px' }}>
          Enable Spaced Repetition to schedule active recall quizzes for this page. Cards due for review will appear in your Dashboard under the Decision Engine.
        </div>
      )}
    </div>
  );
}
