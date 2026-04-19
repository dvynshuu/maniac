import React, { useState } from 'react';
import { FileText, Database, Activity, X, Zap } from 'lucide-react';

export function OnboardingNarrative({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  return (
    <div className="onboarding-widget">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Zap size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
              Mastering Maniac OS
            </h3>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0, maxWidth: '600px', lineHeight: 1.5 }}>
            To get the most out of your vault, it helps to know when to use each tool. Here is a quick guide to the core primitives.
          </p>
        </div>
        <button 
          onClick={handleDismiss}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', cursor: 'pointer' }}
        >
          <X size={14} />
        </button>
      </div>

      <div className="onboarding-grid">
        <div className="onboarding-card">
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(46, 91, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <FileText size={20} color="var(--accent-primary)" />
          </div>
          <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Pages</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Use for free-form thinking, long-form writing, and unstructured notes. Like Notion documents.
          </p>
        </div>

        <div className="onboarding-card">
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Database size={20} color="var(--accent-secondary)" />
          </div>
          <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Databases</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Use for structured collections, entity tracking, and tabular data. Like Airtable bases.
          </p>
        </div>

        <div className="onboarding-card">
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(74, 222, 128, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Activity size={20} color="var(--success)" />
          </div>
          <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Trackers</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Use for daily habits, quantitative logging, and analyzing trends over time. Like Streak.
          </p>
        </div>
      </div>
    </div>
  );
}
