import React, { useState } from 'react';
import { FileText, Database, Activity, X, Zap } from 'lucide-react';
import ManiacLogo from '../Common/ManiacLogo';

export function OnboardingNarrative({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  return (
    <div className="onboarding-widget">
      <div className="onboarding-header">
        <div className="onboarding-title-section">
          <div className="onboarding-title-row">
            <ManiacLogo size="sm" />
            <h3 className="onboarding-title">Mastering MANIAC</h3>
          </div>
          <p className="onboarding-description">
            To get the most out of your vault, it helps to know when to use each tool. Here is a quick guide to the core primitives.
          </p>
        </div>
        <button 
          onClick={handleDismiss}
          className="onboarding-dismiss-btn"
          aria-label="Dismiss onboarding guide"
        >
          <X size={14} />
        </button>
      </div>

      <div className="onboarding-grid">
        <div className="onboarding-card">
          <div className="onboarding-icon-wrapper val-primary">
            <FileText size={20} />
          </div>
          <h4 className="onboarding-card-title">Pages</h4>
          <p className="onboarding-card-text">
            Use for free-form thinking, long-form writing, and unstructured notes. Like Notion documents.
          </p>
        </div>

        <div className="onboarding-card">
          <div className="onboarding-icon-wrapper val-secondary">
            <Database size={20} />
          </div>
          <h4 className="onboarding-card-title">Databases</h4>
          <p className="onboarding-card-text">
            Use for structured collections, entity tracking, and tabular data. Like Airtable bases.
          </p>
        </div>

        <div className="onboarding-card">
          <div className="onboarding-icon-wrapper val-success">
            <Activity size={20} />
          </div>
          <h4 className="onboarding-card-title">Trackers</h4>
          <p className="onboarding-card-text">
            Use for daily habits, quantitative logging, and analyzing trends over time. Like Streak.
          </p>
        </div>
      </div>
    </div>
  );
}

