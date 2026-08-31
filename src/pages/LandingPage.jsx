import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Zap,
  Brain,
  Database,
  Share2,
  HardDrive,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Layers,
  Flame,
  Activity,
  FolderTree,
  Repeat,
  Upload,
  Calendar,
  FileText,
  Check,
  X,
  Code2,
  Table,
  Kanban,
  Sliders,
  Cpu,
  ArrowUpRight,
  Eye,
  Key,
  GripVertical,
  Plus,
  Copy
} from 'lucide-react';
import ManiacLogo from '../components/Common/ManiacLogo';
import SEO from '../seo/SEO';
import { getStructuredData } from '../seo/structuredData';
import './LandingPage.css';

export default function LandingPage() {
  const structuredData = getStructuredData();
  const navigate = useNavigate();

  // Interactive Demo States
  const [heroMode, setHeroMode] = useState('doc'); // 'doc' | 'database' | 'srs' | 'graph'
  const [demoToggleOpen, setDemoToggleOpen] = useState(true);
  const [demoSrsRevealed, setDemoSrsRevealed] = useState(false);
  const [demoSrsStreak, setDemoSrsStreak] = useState(12);
  const [demoSrsInterval, setDemoSrsInterval] = useState('7 days');
  const [dbViewTab, setDbViewTab] = useState('table'); // 'table' | 'board' | 'calendar'
  const [activeFaq, setActiveFaq] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleSrsRate = (interval) => {
    setDemoSrsInterval(interval);
    setDemoSrsStreak(prev => prev + 1);
    setDemoSrsRevealed(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText("const doc = new Y.Doc();\nconst persistence = new IndexeddbPersistence('maniac_vault', doc);");
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      <SEO structuredData={structuredData} />

      {/* Atmospheric Ambient Glows */}
      <div className="landing-ambient-glow" aria-hidden="true" />
      <div className="landing-ambient-glow-secondary" aria-hidden="true" />
      <div className="landing-grid-bg" aria-hidden="true" />

      {/* ====================================================================
          Navigation Header
          ==================================================================== */}
      <header className="landing-header">
        <div className="landing-container">
          <nav className="landing-nav" aria-label="Main Navigation">
            <Link to="/" className="landing-brand" aria-label="MANIAC Homepage">
              <ManiacLogo size="sm" />
              <span className="landing-brand-title">MANIAC</span>
            </Link>

            <div className="landing-nav-links">
              <button type="button" onClick={() => scrollToSection('features')} className="landing-nav-link-btn">
                Features
              </button>
              <button type="button" onClick={() => scrollToSection('local-first')} className="landing-nav-link-btn">
                Architecture
              </button>
              <button type="button" onClick={() => scrollToSection('faq')} className="landing-nav-link-btn">
                FAQ
              </button>
            </div>

            <div className="landing-nav-actions">
              <Link to="/app" className="btn-nav-primary" id="nav-open-app">
                Open Workspace <ArrowRight size={14} />
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main id="main-content">
        {/* ====================================================================
            Hero Section
            ==================================================================== */}
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-container">
            <div className="hero-tagline-statement">
              Turn chaos into a system.
            </div>

            <h1 id="hero-title" className="hero-title">
              The Local-First Workspace for Your <span className="hero-title-accent">Knowledge, Work &amp; Life</span>
            </h1>

            <p className="hero-subtitle">
              Consolidate fragmented notes, scattered tasks, disconnected databases, and forgotten insights into a single sovereign workspace—stored completely on your device with zero server latency.
            </p>

            <div className="hero-cta-group">
              <Link to="/app" className="btn-hero-primary" id="hero-open-app">
                Open MANIAC <ArrowRight size={16} />
              </Link>
              <button type="button" onClick={() => scrollToSection('features')} className="btn-hero-secondary">
                Explore Capabilities ↓
              </button>
            </div>

            {/* Trust Badges */}
            <div className="hero-trust-bar">
              <div className="trust-item">
                <CheckCircle2 size={16} className="trust-item-icon" />
                <span>100% Offline Capable</span>
              </div>
              <div className="trust-item">
                <CheckCircle2 size={16} className="trust-item-icon" />
                <span>IndexedDB Storage Engine</span>
              </div>
              <div className="trust-item">
                <CheckCircle2 size={16} className="trust-item-icon" />
                <span>AES-256-GCM Hardware Security</span>
              </div>
              <div className="trust-item">
                <CheckCircle2 size={16} className="trust-item-icon" />
                <span>Client-Side Notion Import</span>
              </div>
            </div>

            {/* Interactive Workspace Simulator Frame */}
            <div className="hero-mockup-frame" aria-label="Interactive Workspace Preview">
              <div className="hero-mockup-topbar">
                <div className="mockup-window-controls">
                  <div className="mockup-dot red" />
                  <div className="mockup-dot yellow" />
                  <div className="mockup-dot green" />
                </div>

                {/* Interactive Mode Tabs */}
                <div className="mockup-mode-tabs" role="tablist">
                  <button
                    className={`mockup-mode-btn ${heroMode === 'doc' ? 'active' : ''}`}
                    onClick={() => setHeroMode('doc')}
                    role="tab"
                    aria-selected={heroMode === 'doc'}
                  >
                    <FileText size={13} /> Document
                  </button>
                  <button
                    className={`mockup-mode-btn ${heroMode === 'database' ? 'active' : ''}`}
                    onClick={() => setHeroMode('database')}
                    role="tab"
                    aria-selected={heroMode === 'database'}
                  >
                    <Table size={13} /> Relational Data
                  </button>
                  <button
                    className={`mockup-mode-btn ${heroMode === 'srs' ? 'active' : ''}`}
                    onClick={() => setHeroMode('srs')}
                    role="tab"
                    aria-selected={heroMode === 'srs'}
                  >
                    <Brain size={13} /> Active Recall
                  </button>
                  <button
                    className={`mockup-mode-btn ${heroMode === 'graph' ? 'active' : ''}`}
                    onClick={() => setHeroMode('graph')}
                    role="tab"
                    aria-selected={heroMode === 'graph'}
                  >
                    <Share2 size={13} /> 2D Graph
                  </button>
                </div>

                <div className="mockup-system-status">
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                  <span>Vault Ready</span>
                </div>
              </div>

              <div className="hero-mockup-body">
                {/* Mockup Sidebar */}
                <aside className="mockup-sidebar">
                  <div className="mockup-sidebar-label">Knowledge Vault</div>
                  <div
                    className={`mockup-tree-item ${heroMode === 'doc' ? 'active' : ''}`}
                    onClick={() => setHeroMode('doc')}
                  >
                    <span>🧠</span>
                    <span>Cognitive Architecture</span>
                  </div>
                  <div
                    className={`mockup-tree-item ${heroMode === 'database' ? 'active' : ''}`}
                    onClick={() => setHeroMode('database')}
                  >
                    <span>📊</span>
                    <span>Engineering Roadmap</span>
                  </div>
                  <div
                    className={`mockup-tree-item ${heroMode === 'srs' ? 'active' : ''}`}
                    onClick={() => setHeroMode('srs')}
                  >
                    <span>⚡</span>
                    <span>Spaced Repetition Queue</span>
                  </div>
                  <div
                    className={`mockup-tree-item ${heroMode === 'graph' ? 'active' : ''}`}
                    onClick={() => setHeroMode('graph')}
                  >
                    <span>🕸️</span>
                    <span>Knowledge Relationships</span>
                  </div>

                  <div className="mockup-sidebar-label" style={{ marginTop: '20px' }}>Databases</div>
                  <div className="mockup-tree-item" onClick={() => navigate('/app')}>
                    <span>🗂️</span>
                    <span>Research Tracker</span>
                  </div>
                  <div className="mockup-tree-item" onClick={() => navigate('/app')}>
                    <span>🎯</span>
                    <span>Habit Tracker</span>
                  </div>
                </aside>

                {/* Mockup Canvas */}
                <div className="mockup-content">
                  {/* Mode 1: Document View */}
                  {heroMode === 'doc' && (
                    <div className="demo-panel-doc">
                      <div className="demo-doc-header">
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧠</div>
                        <div className="demo-doc-title">Cognitive Architecture &amp; Knowledge Synthesis</div>
                        <div className="demo-doc-meta">
                          <span>Updated 1 min ago</span>
                          <span>•</span>
                          <span>IndexedDB Active</span>
                          <span>•</span>
                          <span style={{ color: 'var(--accent-ember)', fontWeight: 600 }}>Active Recall Scheduled</span>
                        </div>
                      </div>

                      <div className="modular-callout-demo">
                        <Sparkles size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong>Turn chaos into a system:</strong> Every concept, task, and tracker in Maniac is an atomic block interconnected via bidirectional backlinks.
                        </div>
                      </div>

                      <div className="modular-toggle-demo">
                        <button
                          type="button"
                          className="modular-toggle-trigger"
                          onClick={() => setDemoToggleOpen(!demoToggleOpen)}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ChevronRight size={16} style={{ transform: demoToggleOpen ? 'rotate(90deg)' : 'none', transition: 'transform var(--transition-fast)' }} />
                            <span>System Principles &amp; Mental Models</span>
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{demoToggleOpen ? 'Click to collapse' : 'Click to expand'}</span>
                        </button>
                        {demoToggleOpen && (
                          <div className="modular-toggle-body-content">
                            1. <strong>Local Sovereignty:</strong> Primary storage lives in your browser's IndexedDB.<br />
                            2. <strong>Bidirectional Discovery:</strong> Mentions automatically form two-way linked references.<br />
                            3. <strong>Active Recall:</strong> Review schedules adapt to memory strength automatically.
                          </div>
                        )}
                      </div>

                      <div className="modular-code-demo" style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          style={{ position: 'absolute', top: '10px', right: '12px', background: 'var(--bg-active)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '4px 8px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {copiedCode ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                          <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                        </button>
                        <span style={{ color: 'var(--text-tertiary)' }}>// Client-Side CRDT Synchronization</span><br />
                        const doc = new Y.Doc();<br />
                        const persistence = new IndexeddbPersistence('maniac_vault', doc);
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Relational Database View */}
                  {heroMode === 'database' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>Engineering Roadmap &amp; Deliverables</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Multi-view relational database inside page</div>
                        </div>
                        <span style={{ fontSize: '11px', background: 'var(--block-bg-tint-blue)', color: 'var(--info)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                          4 Active Tasks
                        </span>
                      </div>

                      <div className="demo-table-wrapper">
                        <table className="demo-table">
                          <thead>
                            <tr>
                              <th>Feature Node</th>
                              <th>Status</th>
                              <th>Priority</th>
                              <th>Storage Target</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Client-Side Notion ZIP Parser</td>
                              <td><span className="demo-status-pill done">● Verified</span></td>
                              <td><span style={{ color: 'var(--error)', fontWeight: 700 }}>High</span></td>
                              <td>Local IndexedDB</td>
                            </tr>
                            <tr>
                              <td>Active Recall Spaced Repetition</td>
                              <td><span className="demo-status-pill done">● Active</span></td>
                              <td><span style={{ color: 'var(--accent-ember)', fontWeight: 700 }}>Medium</span></td>
                              <td>Dexie v4</td>
                            </tr>
                            <tr>
                              <td>AES-256-GCM Vault Encryption</td>
                              <td><span className="demo-status-pill done">● Secured</span></td>
                              <td><span style={{ color: 'var(--error)', fontWeight: 700 }}>Critical</span></td>
                              <td>WebCrypto API</td>
                            </tr>
                            <tr>
                              <td>2D Force Knowledge Graph</td>
                              <td><span className="demo-status-pill progress">● Synchronized</span></td>
                              <td><span style={{ color: 'var(--info)', fontWeight: 700 }}>Normal</span></td>
                              <td>Canvas Render</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Active Recall Demo */}
                  {heroMode === 'srs' && (
                    <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px' }}>
                          <Brain size={18} style={{ color: 'var(--accent-ember)' }} />
                          <span>Spaced Repetition Practice</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent-ember)', background: 'var(--block-bg-tint-orange)', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                          <Flame size={14} />
                          <span>Streak: {demoSrsStreak}d</span>
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px', textAlign: 'left', marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-ember)', fontWeight: 700, marginBottom: '8px' }}>
                          Recall Prompt (Due Today)
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
                          How does MANIAC guarantee zero-latency execution compared to cloud software?
                        </div>

                        {demoSrsRevealed ? (
                          <div style={{ padding: '12px 14px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--success)', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                            <strong>Answer:</strong> All database reads and writes execute against local IndexedDB (Dexie.js) on the device. No network requests are required to view, create, or search data.
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDemoSrsRevealed(true)}
                            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Click to Reveal Answer
                          </button>
                        )}
                      </div>

                      {demoSrsRevealed && (
                        <div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '10px' }}>
                            Rate your recall strength to schedule next review ({demoSrsInterval}):
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                            <button type="button" onClick={() => handleSrsRate('1 day')} style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--block-bg-tint-red)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--error)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Again (1d)</button>
                            <button type="button" onClick={() => handleSrsRate('3 days')} style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--block-bg-tint-orange)', border: '1px solid rgba(249,115,22,0.3)', color: 'var(--accent-ember)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Hard (3d)</button>
                            <button type="button" onClick={() => handleSrsRate('7 days')} style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--block-bg-tint-blue)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--info)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Good (7d)</button>
                            <button type="button" onClick={() => handleSrsRate('14 days')} style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--block-bg-tint-green)', border: '1px solid rgba(74,222,128,0.3)', color: 'var(--success)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Easy (14d)</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mode 4: 2D Graph Preview */}
                  {heroMode === 'graph' && (
                    <div style={{ position: 'relative', height: '360px', background: '#07080e', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {/* SVG Simulation of Force Graph */}
                      <svg width="100%" height="100%" viewBox="0 0 500 300" style={{ position: 'absolute', inset: 0 }}>
                        <g stroke="rgba(99,102,241,0.3)" strokeWidth="1.5">
                          <line x1="250" y1="150" x2="150" y2="90" />
                          <line x1="250" y1="150" x2="350" y2="80" />
                          <line x1="250" y1="150" x2="170" y2="220" />
                          <line x1="250" y1="150" x2="340" y2="210" />
                          <line x1="150" y1="90" x2="80" y2="120" />
                          <line x1="350" y1="80" x2="420" y2="110" />
                          <line x1="170" y1="220" x2="100" y2="240" />
                          <line x1="340" y1="210" x2="410" y2="220" />
                        </g>
                        {/* Central Hub */}
                        <circle cx="250" cy="150" r="14" fill="var(--accent-primary)" />
                        <text x="250" y="178" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle">Turn chaos into a system</text>

                        {/* Connected Nodes */}
                        <circle cx="150" cy="90" r="10" fill="var(--accent-ember)" />
                        <text x="150" y="74" fill="var(--text-secondary)" fontSize="10" fontWeight="600" textAnchor="middle">Local Storage</text>

                        <circle cx="350" cy="80" r="10" fill="#c084fc" />
                        <text x="350" y="64" fill="var(--text-secondary)" fontSize="10" fontWeight="600" textAnchor="middle">Block Canvas</text>

                        <circle cx="170" cy="220" r="9" fill="var(--success)" />
                        <text x="170" y="244" fill="var(--text-secondary)" fontSize="10" fontWeight="600" textAnchor="middle">Active Recall</text>

                        <circle cx="340" cy="210" r="9" fill="var(--info)" />
                        <text x="340" y="234" fill="var(--text-secondary)" fontSize="10" fontWeight="600" textAnchor="middle">Databases</text>

                        <circle cx="80" cy="120" r="6" fill="#818cf8" />
                        <circle cx="420" cy="110" r="6" fill="#818cf8" />
                        <circle cx="100" cy="240" r="6" fill="#818cf8" />
                        <circle cx="410" cy="220" r="6" fill="#818cf8" />
                      </svg>
                      <div style={{ position: 'absolute', bottom: '12px', right: '14px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        Live 2D Force-Directed Simulation
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            Section 1: Unified Architecture (Everything You Need in One Workspace)
            ==================================================================== */}
        <section id="features" className="landing-section landing-section-border" aria-labelledby="heading-everything">
          <div className="landing-container">
            <div className="section-tag blue">Unified Architecture</div>
            <h2 id="heading-everything" className="section-heading">
              Everything You Need in One Sovereign Workspace
            </h2>
            <p className="section-lead">
              Turn chaos into a system. Eliminate fragmented apps and consolidate writing, structured databases, habit trackers, and memory reinforcement into a single local-first environment.
            </p>

            <div className="features-grid-3">
              <article className="feature-card">
                <div className="feature-icon-wrapper blue">
                  <Layers size={22} />
                </div>
                <h3 className="feature-title">Modular Block Canvas</h3>
                <p className="feature-desc">
                  Rich text paragraphs, headers, checklists, callouts, and code blocks. Reorder with fluid drag handles or type <kbd className="landing-kbd">/</kbd> to command the page.
                </p>
              </article>

              <article className="feature-card">
                <div className="feature-icon-wrapper emerald">
                  <Database size={22} />
                </div>
                <h3 className="feature-title">Multi-View Relational Data</h3>
                <p className="feature-desc">
                  Build structured databases directly inside documents. Switch seamlessly between Table grids, Kanban workflow boards, and Calendar agendas with custom tags.
                </p>
              </article>

              <article className="feature-card">
                <div className="feature-icon-wrapper ember">
                  <Brain size={22} />
                </div>
                <h3 className="feature-title">Active Recall &amp; SRS</h3>
                <p className="feature-desc">
                  Turn passive notes into active knowledge. Automated spaced repetition intervals prevent memory decay and reinforce long-term mastery based on cognitive science.
                </p>
              </article>

              <article className="feature-card">
                <div className="feature-icon-wrapper purple">
                  <Share2 size={22} />
                </div>
                <h3 className="feature-title">Bidirectional Knowledge Graph</h3>
                <p className="feature-desc">
                  Explore connections between thoughts in real-time with dynamic 2D force-directed graph visualization and automated bidirectional backlinks.
                </p>
              </article>

              <article className="feature-card">
                <div className="feature-icon-wrapper blue">
                  <HardDrive size={22} />
                </div>
                <h3 className="feature-title">Local-First Storage</h3>
                <p className="feature-desc">
                  Your data lives strictly in your browser's IndexedDB via Dexie.js. No mandatory account creation, zero cloud lock-in, and instant millisecond response times.
                </p>
              </article>

              <article className="feature-card">
                <div className="feature-icon-wrapper ember">
                  <Lock size={22} />
                </div>
                <h3 className="feature-title">AES-256-GCM Vault Security</h3>
                <p className="feature-desc">
                  Lock private pages with a master password derived via WebCrypto. Sensitive content is encrypted client-side before touching disk storage.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ====================================================================
            Section 2: Multi-View Databases & Trackers
            ==================================================================== */}
        <section id="databases" className="landing-section landing-section-border" aria-labelledby="heading-databases">
          <div className="landing-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '36px', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <div className="section-tag emerald">Structured Data</div>
                <h2 id="heading-databases" className="section-heading" style={{ marginBottom: '8px' }}>
                  Track What Matters
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '640px', margin: 0 }}>
                  Embed relational databases and habit trackers seamlessly alongside your writing.
                </p>
              </div>

              {/* View Switcher Controls */}
              <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <button
                  type="button"
                  onClick={() => setDbViewTab('table')}
                  style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: 'none', background: dbViewTab === 'table' ? 'var(--bg-active)' : 'transparent', color: dbViewTab === 'table' ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}
                >
                  <Table size={14} /> Table View
                </button>
                <button
                  type="button"
                  onClick={() => setDbViewTab('board')}
                  style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: 'none', background: dbViewTab === 'board' ? 'var(--bg-active)' : 'transparent', color: dbViewTab === 'board' ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}
                >
                  <Kanban size={14} /> Kanban Board
                </button>
                <button
                  type="button"
                  onClick={() => setDbViewTab('calendar')}
                  style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: 'none', background: dbViewTab === 'calendar' ? 'var(--bg-active)' : 'transparent', color: dbViewTab === 'calendar' ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}
                >
                  <Calendar size={14} /> Calendar Log
                </button>
              </div>
            </div>

            {/* View Tab 1: Table */}
            {dbViewTab === 'table' && (
              <div className="demo-table-wrapper" style={{ padding: '0' }}>
                <table className="demo-table">
                  <thead>
                    <tr>
                      <th>Project / Goal</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Weekly Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Sovereign Knowledge Vault</td>
                      <td><span style={{ background: 'var(--block-bg-tint-purple)', color: '#c084fc', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Architecture</span></td>
                      <td><span className="demo-status-pill done">● Complete</span></td>
                      <td>100% (7/7 days)</td>
                    </tr>
                    <tr>
                      <td>Daily Spaced Repetition Review</td>
                      <td><span style={{ background: 'var(--block-bg-tint-orange)', color: 'var(--accent-ember)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Cognition</span></td>
                      <td><span className="demo-status-pill done">● Streak: 12d</span></td>
                      <td>85% (6/7 days)</td>
                    </tr>
                    <tr>
                      <td>Weekly System Review</td>
                      <td><span style={{ background: 'var(--block-bg-tint-blue)', color: 'var(--info)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Productivity</span></td>
                      <td><span className="demo-status-pill progress">● In Progress</span></td>
                      <td>50% (3/7 days)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* View Tab 2: Board */}
            {dbViewTab === 'board' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* Column 1 */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>To-Do</span>
                    <span>1</span>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>Export Vault Backup</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Download full JSON snapshot</div>
                  </div>
                </div>

                {/* Column 2 */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--info)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>In Progress</span>
                    <span>1</span>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>Active Recall Review</div>
                    <div style={{ fontSize: '12px', color: 'var(--accent-ember)' }}>4 notes due for practice</div>
                  </div>
                </div>

                {/* Column 3 */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Completed</span>
                    <span>2</span>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>Notion Workspace Import</div>
                    <div style={{ fontSize: '12px', color: 'var(--success)' }}>All sub-pages preserved</div>
                  </div>
                </div>
              </div>
            )}

            {/* View Tab 3: Calendar */}
            {dbViewTab === 'calendar' && (
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, fontSize: '16px' }}>Activity Timeline</div>
                  <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>● Active Momentum</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontSize: '12px' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} style={{ padding: '6px', color: 'var(--text-tertiary)', fontWeight: 600 }}>{day}</div>
                  ))}
                  {Array.from({ length: 31 }).map((_, i) => (
                    <div key={i} style={{ height: '48px', background: i >= 20 ? 'var(--block-bg-tint-blue)' : 'var(--bg-hover)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                      <span style={{ fontSize: '11px', color: i >= 20 ? 'var(--info)' : 'var(--text-secondary)' }}>{i + 1}</span>
                      {i >= 20 && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--info)' }} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ====================================================================
            Section 3: Local-First Architecture
            ==================================================================== */}
        <section id="local-first" className="landing-section landing-section-border" aria-labelledby="heading-local-first">
          <div className="landing-container">
            <div className="feature-split">
              <div>
                <div className="section-tag green">Data Sovereignty</div>
                <h2 id="heading-local-first" className="section-heading">
                  A Local-First Workspace Built Around Your Data
                </h2>
                <p className="feature-desc" style={{ fontSize: '16px', marginBottom: '24px' }}>
                  Traditional productivity tools store your thoughts on third-party servers, exposing your personal information to network outages, subscription paywalls, and privacy risks. MANIAC reverses this paradigm.
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '3px' }} />
                    <span><strong>100% Offline Capable:</strong> Create, edit, query, and organize without requiring an internet connection.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '3px' }} />
                    <span><strong>Zero-Latency Interaction:</strong> Reads and writes resolve instantly against IndexedDB without waiting for round-trip server APIs.</span>
                  </li>
                  <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '3px' }} />
                    <span><strong>Full JSON Data Export:</strong> Export your entire database, pages, and trackers with a single click at any time.</span>
                  </li>
                </ul>

                <Link to="/app" className="btn-hero-secondary">
                  Launch Local Workspace
                </Link>
              </div>

              <div className="feature-split-visual">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <Shield size={20} style={{ color: 'var(--success)' }} />
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>Client-Side Security Pipeline</span>
                </div>

                <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                  <div style={{ color: 'var(--success)' }}>// Storage Architecture Specification</div>
                  <div>Storage Engine: IndexedDB (Dexie.js v4)</div>
                  <div>Crypto Engine: WebCrypto API (AES-256-GCM)</div>
                  <div>Key Derivation: PBKDF2 with SHA-256</div>
                  <div>Background Worker: Dedicated WebWorker Thread</div>
                  <div>Multiplayer Sync: BroadcastChannel + Yjs CRDT</div>
                  <div style={{ color: 'var(--info)', marginTop: '8px' }}>[Status] 100% Client-Side Local Execution Verified</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            Section 4: Comparison Matrix
            ==================================================================== */}
        <section id="comparison" className="landing-section landing-section-border" aria-labelledby="heading-comparison">
          <div className="landing-container">
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <div className="section-tag blue">Architectural Comparison</div>
              <h2 id="heading-comparison" className="section-heading">
                Why Local-First Changes Everything
              </h2>
              <p className="section-lead" style={{ margin: '0 auto' }}>
                Compare sovereign local computing with conventional cloud-based workspace platforms.
              </p>
            </div>

            <div className="comparison-matrix-wrapper">
              <table className="comparison-matrix">
                <thead>
                  <tr>
                    <th>Capability</th>
                    <th className="highlight">MANIAC Workspace</th>
                    <th>Legacy Cloud Tools</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Data Storage</strong></td>
                    <td className="highlight"><span className="comparison-check"><Check size={16} /> Local Device (IndexedDB)</span></td>
                    <td><span className="comparison-cross"><X size={16} /> Remote Third-Party Servers</span></td>
                  </tr>
                  <tr>
                    <td><strong>Offline Reliability</strong></td>
                    <td className="highlight"><span className="comparison-check"><Check size={16} /> 100% Native Zero-Latency</span></td>
                    <td><span className="comparison-cross"><X size={16} /> Degraded or Blocked</span></td>
                  </tr>
                  <tr>
                    <td><strong>Hardware Encryption</strong></td>
                    <td className="highlight"><span className="comparison-check"><Check size={16} /> Client-Side AES-256-GCM</span></td>
                    <td><span className="comparison-cross"><X size={16} /> Plaintext on Cloud DBs</span></td>
                  </tr>
                  <tr>
                    <td><strong>Cognitive Active Recall</strong></td>
                    <td className="highlight"><span className="comparison-check"><Check size={16} /> Integrated Spaced Repetition</span></td>
                    <td><span className="comparison-cross"><X size={16} /> Requires Extra Plugin / App</span></td>
                  </tr>
                  <tr>
                    <td><strong>Account Requirement</strong></td>
                    <td className="highlight"><span className="comparison-check"><Check size={16} /> Zero Registration Required</span></td>
                    <td><span className="comparison-cross"><X size={16} /> Mandatory Email Login</span></td>
                  </tr>
                  <tr>
                    <td><strong>Notion Migration</strong></td>
                    <td className="highlight"><span className="comparison-check"><Check size={16} /> In-Browser ZIP Extraction</span></td>
                    <td><span className="comparison-cross"><X size={16} /> Cloud Upload Processing</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ====================================================================
            Section 5: Migration & Notion Import
            ==================================================================== */}
        <section id="migration" className="landing-section landing-section-border" aria-labelledby="heading-migration">
          <div className="landing-container">
            <div className="feature-split">
              <div>
                <div className="section-tag blue">Frictionless Migration</div>
                <h2 id="heading-migration" className="section-heading">
                  Bring Your Existing Knowledge With You
                </h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '24px' }}>
                  MANIAC provides a private, local-first alternative to cloud-centered workspace tools, with pages, databases, trackers, rich blocks, and interconnected knowledge.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                    <Upload size={16} style={{ color: 'var(--info)' }} />
                    <span>Upload standard Notion HTML / Markdown / CSV export ZIP</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                    <FolderTree size={16} style={{ color: 'var(--info)' }} />
                    <span>Recursive DOM traversal recreates nested sub-page hierarchies</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                    <Shield size={16} style={{ color: 'var(--success)' }} />
                    <span>100% In-Browser JSZip extraction and Dexie database conversion</span>
                  </div>
                </div>

                <Link to="/app" className="btn-hero-secondary">
                  Import Notion Workspace
                </Link>
              </div>

              <div className="feature-split-visual">
                <div style={{ textAlign: 'center', padding: '36px 20px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-xl)', background: 'var(--block-bg-tint-blue)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--info)' }}>
                    <Upload size={28} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Client-Side Notion ZIP Parser
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', maxWidth: '320px', margin: '0 auto 20px' }}>
                    Drag and drop your exported ZIP file directly in the settings panel to migrate instantly.
                  </p>
                  <Link to="/app" className="btn-hero-primary" style={{ fontSize: '13px', padding: '10px 22px' }}>
                    Launch Workspace &amp; Import
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            Section 6: Frequently Asked Questions (FAQ)
            ==================================================================== */}
        <section id="faq" className="landing-section landing-section-border" aria-labelledby="heading-faq">
          <div className="landing-container">
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <div className="section-tag blue">Clarifications &amp; Details</div>
              <h2 id="heading-faq" className="section-heading">
                Frequently Asked Questions
              </h2>
              <p className="section-lead" style={{ margin: '0 auto' }}>
                Factual answers regarding architecture, local data storage, capabilities, and data security.
              </p>
            </div>

            <div className="faq-grid">
              <details className="faq-item" open={activeFaq === 0} onClick={(e) => { e.preventDefault(); toggleFaq(0); }}>
                <summary className="faq-summary">
                  <span>What is MANIAC?</span>
                  <ChevronDown size={18} style={{ transform: activeFaq === 0 ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-fast)' }} />
                </summary>
                <div className="faq-content">
                  MANIAC is a sovereign, local-first workspace for notes, knowledge management, tasks, databases, and cognitive learning. Its core mission is to turn chaos into a system by unifying modular block editing, relational databases, habit tracking, bidirectional backlinks, and cognitive active recall in a distraction-free client-side environment.
                </div>
              </details>

              <details className="faq-item" open={activeFaq === 1} onClick={(e) => { e.preventDefault(); toggleFaq(1); }}>
                <summary className="faq-summary">
                  <span>Where is my data stored?</span>
                  <ChevronDown size={18} style={{ transform: activeFaq === 1 ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-fast)' }} />
                </summary>
                <div className="faq-content">
                  All your data is stored locally on your device inside your browser's IndexedDB storage using Dexie.js. Your notes, databases, and trackers are never uploaded to our servers or stored in an external cloud database.
                </div>
              </details>

              <details className="faq-item" open={activeFaq === 2} onClick={(e) => { e.preventDefault(); toggleFaq(2); }}>
                <summary className="faq-summary">
                  <span>Does MANIAC work completely offline?</span>
                  <ChevronDown size={18} style={{ transform: activeFaq === 2 ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-fast)' }} />
                </summary>
                <div className="faq-content">
                  Yes. Because all storage and logic execute entirely on the client side, MANIAC functions with zero internet connection once loaded. You can write notes, organize databases, and practice active recall in offline environments without latency or synchronization errors.
                </div>
              </details>

              <details className="faq-item" open={activeFaq === 3} onClick={(e) => { e.preventDefault(); toggleFaq(3); }}>
                <summary className="faq-summary">
                  <span>Can I import my workspace from Notion?</span>
                  <ChevronDown size={18} style={{ transform: activeFaq === 3 ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-fast)' }} />
                </summary>
                <div className="faq-content">
                  Yes. MANIAC includes a native client-side Notion ZIP parser. You can export your Notion workspace as an HTML/Markdown ZIP package and upload it directly into MANIAC. Our engine preserves nested sub-page trees, toggle blocks, list indentations, and text formatting.
                </div>
              </details>

              <details className="faq-item" open={activeFaq === 4} onClick={(e) => { e.preventDefault(); toggleFaq(4); }}>
                <summary className="faq-summary">
                  <span>How does the Active Recall system work?</span>
                  <ChevronDown size={18} style={{ transform: activeFaq === 4 ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-fast)' }} />
                </summary>
                <div className="faq-content">
                  Any page can be toggled into an Active Recall practice node. MANIAC calculates spaced repetition review intervals based on the forgetting curve. When you review a note in the Workspace Review queue, you grade your recall difficulty, which automatically schedules the optimal future review date.
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* ====================================================================
            Ecosystem Network Strip
            ==================================================================== */}
        <section className="landing-section" style={{ padding: '48px 0 0 0' }} aria-label="Ecosystem Partners">
          <div className="landing-container">
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Sparkles size={20} style={{ color: 'var(--accent-ember)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>Part of a Sovereign Productivity Ecosystem</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Explore complementary tools designed for high-performance cognitive workflows.</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <a
                  href="https://getrealign.in/"
                  target="_blank"
                  rel="noopener"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--bg-hover)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', transition: 'border-color var(--transition-fast)' }}
                >
                  <span>ReAlign</span>
                  <ArrowUpRight size={13} style={{ color: 'var(--accent-ember)' }} />
                </a>
                <a
                  href="https://convercell.netlify.app/"
                  target="_blank"
                  rel="noopener"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--bg-hover)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', transition: 'border-color var(--transition-fast)' }}
                >
                  <span>Convercell</span>
                  <ArrowUpRight size={13} style={{ color: 'var(--info)' }} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            Section 7: Final Call to Action
            ==================================================================== */}
        <section className="landing-section landing-section-border" aria-labelledby="heading-start">
          <div className="landing-container">
            <div className="landing-cta-card">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <ManiacLogo size="lg" />
              </div>
              <div className="section-tag ember" style={{ marginBottom: '8px' }}>
                Turn chaos into a system.
              </div>
              <h2 id="heading-start" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '16px' }}>
                Start Building Your Sovereign Workspace
              </h2>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 32px' }}>
                Instant browser boot. No registration forms, no cloud lock-in, and full local data sovereignty.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <Link to="/app" className="btn-hero-primary" style={{ padding: '14px 36px' }}>
                  Open MANIAC <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ====================================================================
          Semantic Footer
          ==================================================================== */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <ManiacLogo size="xs" />
                <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '16px', letterSpacing: '-0.02em' }}>MANIAC</span>
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-tertiary)', maxWidth: '280px', marginBottom: '16px' }}>
                Turn chaos into a system. The sovereign, local-first workspace for knowledge, structured data, and productivity.
              </p>
              <div style={{ fontSize: '12px', color: 'var(--success)' }}>
                ● Local IndexedDB Storage
              </div>
            </div>

            <div>
              <div className="footer-col-title">Capabilities</div>
              <ul className="footer-links-list">
                <li><button type="button" onClick={() => scrollToSection('features')} className="footer-link-btn">Block Editor</button></li>
                <li><button type="button" onClick={() => scrollToSection('databases')} className="footer-link-btn">Relational Databases</button></li>
                <li><button type="button" onClick={() => scrollToSection('features')} className="footer-link-btn">Active Recall SRS</button></li>
                <li><button type="button" onClick={() => scrollToSection('features')} className="footer-link-btn">Knowledge Graph</button></li>
                <li><button type="button" onClick={() => scrollToSection('migration')} className="footer-link-btn">Notion Migration</button></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Architecture</div>
              <ul className="footer-links-list">
                <li><button type="button" onClick={() => scrollToSection('local-first')} className="footer-link-btn">Local-First Storage</button></li>
                <li><button type="button" onClick={() => scrollToSection('comparison')} className="footer-link-btn">Comparison Matrix</button></li>
                <li><button type="button" onClick={() => scrollToSection('local-first')} className="footer-link-btn">AES-256 Security</button></li>
                <li><button type="button" onClick={() => scrollToSection('faq')} className="footer-link-btn">Frequently Asked Questions</button></li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Ecosystem</div>
              <ul className="footer-links-list">
                <li>
                  <a
                    href="https://getrealign.in/"
                    target="_blank"
                    rel="noopener"
                    className="footer-link"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>ReAlign</span>
                    <ArrowUpRight size={12} style={{ opacity: 0.7 }} />
                  </a>
                </li>
                <li>
                  <a
                    href="https://convercell.netlify.app/"
                    target="_blank"
                    rel="noopener"
                    className="footer-link"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>Convercell</span>
                    <ArrowUpRight size={12} style={{ opacity: 0.7 }} />
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Workspace</div>
              <ul className="footer-links-list">
                <li><Link to="/app" className="footer-link">Launch Workspace</Link></li>
                <li><Link to="/app" className="footer-link">Command Palette</Link></li>
                <li><Link to="/app" className="footer-link">Workspace Review</Link></li>
                <li><Link to="/app" className="footer-link">Local Backups</Link></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <div>
              © {new Date().getFullYear()} MANIAC. All data stored strictly on your device.
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <Link to="/app" className="footer-link">Open App</Link>
              <button type="button" onClick={scrollToTop} className="footer-link-btn">Back to Top ↑</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
