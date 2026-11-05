import React, { useState } from 'react';
import { FileText, Database, Activity, X, Terminal, ArrowUpRight } from 'lucide-react';

interface OnboardingNarrativeProps {
  onComplete?: () => void;
}

export function OnboardingNarrative({ onComplete }: OnboardingNarrativeProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    if (onComplete) onComplete();
  };

  return (
    <div className="onboarding-spec-widget" role="region" aria-label="Curator Architecture Guide">
      <div className="onboarding-spec-header">
        <div className="onboarding-spec-title-group">
          <div className="onboarding-spec-badge">
            <Terminal size={12} />
            <span>OPERATIONAL PRIMITIVES // CURATOR V1</span>
          </div>
          <h3 className="onboarding-spec-title">Mastering the Vault Architecture</h3>
          <p className="onboarding-spec-desc">
            Maniac structures local intelligence into three distinct computational primitives. Deploy the appropriate primitive based on data structure and velocity.
          </p>
        </div>
        <button 
          onClick={handleDismiss}
          className="onboarding-dismiss-btn"
          aria-label="Dismiss architectural guide"
          title="Dismiss guide"
        >
          <X size={14} />
        </button>
      </div>

      <div className="onboarding-spec-grid">
        <div className="onboarding-primitive-card">
          <div className="primitive-card-head">
            <span className="primitive-id">01 // UNSTRUCTURED</span>
            <div className="primitive-icon val-primary">
              <FileText size={16} />
            </div>
          </div>
          <h4 className="primitive-title">Pages & Knowledge Trees</h4>
          <p className="primitive-body">
            Nonlinear thinking, conceptual synthesis, and hierarchical markdown notes. Type <kbd className="spec-kbd">/</kbd> to summon block types, LaTeX formulas, code snippets, and active recall cards.
          </p>
          <div className="primitive-footer">
            <span className="primitive-tag">Rich Text Engine</span>
            <span className="primitive-tag">Spaced Repetition</span>
          </div>
        </div>

        <div className="onboarding-primitive-card">
          <div className="primitive-card-head">
            <span className="primitive-id">02 // STRUCTURED</span>
            <div className="primitive-icon val-secondary">
              <Database size={16} />
            </div>
          </div>
          <h4 className="primitive-title">Relational Databases</h4>
          <p className="primitive-body">
            Strict property schemas, typed attributes, and multi-view aggregation (Table, Kanban, Gallery, Calendar). Ideal for structured project tracking, task logs, and asset registries.
          </p>
          <div className="primitive-footer">
            <span className="primitive-tag">Typed Schemas</span>
            <span className="primitive-tag">Multi-View Grid</span>
          </div>
        </div>

        <div className="onboarding-primitive-card">
          <div className="primitive-card-head">
            <span className="primitive-id">03 // LONGITUDINAL</span>
            <div className="primitive-icon val-success">
              <Activity size={16} />
            </div>
          </div>
          <h4 className="primitive-title">Telemetry & Habit Trackers</h4>
          <p className="primitive-body">
            Quantitative time-series logging, cognitive discipline tracking, and habit streak analytics. Visualize your habits, logging velocity, and performance over time without cloud telemetry.
          </p>
          <div className="primitive-footer">
            <span className="primitive-tag">Time Series</span>
            <span className="primitive-tag">Streak Analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
}
