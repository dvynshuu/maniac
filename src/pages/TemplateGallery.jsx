import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Download, 
  Copy, 
  Check, 
  ArrowRight, 
  Brain, 
  Layers, 
  Calendar, 
  Flame, 
  Sparkles,
  CheckCircle2,
  Table,
  Kanban
} from 'lucide-react';
import ManiacLogo from '../components/Common/ManiacLogo';
import SEO from '../seo/SEO';
import { cloneSnapshotToWorkspace, compressSnapshot } from '../utils/shareUtils';
import './TemplateGallery.css';

const TEMPLATES = [
  {
    id: 'active-recall-srs',
    title: 'Active Recall & Spaced Repetition Hub',
    category: 'Learning & Exams',
    icon: '🧠',
    description: 'Master complex subjects with spaced repetition flashcard blocks, recall prompts, and high-yield concept review queues.',
    blocks: [
      { type: 'heading1', content: 'Active Recall & Spaced Repetition Hub' },
      { type: 'callout', content: 'Tip: Test yourself using the toggles below before revealing answers. Rate your recall difficulty to optimize your retention interval.', properties: { icon: '⚡' } },
      { type: 'heading2', content: 'High-Yield Review Queue' },
      { type: 'toggle', content: 'Q: What is the primary difference between IndexedDB and LocalStorage in modern browsers?', properties: { details: 'IndexedDB is an asynchronous, transactional, indexed NoSQL database supporting large binary blobs and gigabytes of storage. LocalStorage is synchronous, blocking, and limited to ~5MB of string key-values.' } },
      { type: 'toggle', content: 'Q: How do Conflict-Free Replicated Data Types (CRDTs) guarantee convergence?', properties: { details: 'CRDTs mathematically ensure that concurrent edits can be merged in any arbitrary network order without requiring a central coordination server.' } },
      { type: 'heading2', content: 'Weekly Study Milestones' },
      { type: 'todo', content: 'Review Neuroscience & Memory Consolidation', properties: { checked: true } },
      { type: 'todo', content: 'Complete Chapter 4 Problem Set', properties: { checked: false } },
      { type: 'todo', content: 'Self-quiz on Cryptography primitives (AES-256-GCM)', properties: { checked: false } },
      { type: 'quote', content: 'Testing yourself is not just a measurement of what you know; it actively alters and strengthens your memory.' }
    ]
  },
  {
    id: 'para-method-second-brain',
    title: 'PARA Method: Second Brain System',
    category: 'Productivity & PKM',
    icon: '🏛️',
    description: 'Organize your entire digital life into Tiago Forte’s PARA framework: Projects, Areas, Resources, and Archives.',
    blocks: [
      { type: 'heading1', content: 'PARA Knowledge Architecture' },
      { type: 'callout', content: 'The PARA method organizes information by actionability rather than rigid subject taxonomy.', properties: { icon: '🎯' } },
      { type: 'heading2', content: '1. Active Projects (Definite Deadline)' },
      { type: 'bullet', content: '<strong>Project Apollo:</strong> Ship local-first encrypted workspace v2.0' },
      { type: 'bullet', content: '<strong>Personal Health:</strong> Complete half-marathon conditioning' },
      { type: 'heading2', content: '2. Areas of Responsibility (Continuous Standards)' },
      { type: 'bullet', content: 'System Architecture & Cryptographic Integrity' },
      { type: 'bullet', content: 'Personal Financial Independence & Capital Allocation' },
      { type: 'heading2', content: '3. Resources (Topics of Ongoing Interest)' },
      { type: 'bullet', content: 'Distributed Systems & CRDT Convergence Papers' },
      { type: 'bullet', content: 'Typography & Bespoke Digital Craft Principles' },
      { type: 'heading2', content: '4. Archives (Completed or Inactive)' },
      { type: 'bullet', content: '2025 Retrospective & System Log' }
    ]
  },
  {
    id: 'engineering-roadmap',
    title: 'Engineering Sprint & Roadmap Tracker',
    category: 'Engineering & Dev',
    icon: '🚀',
    description: 'Track milestones, epics, bug queues, and sprint tasks with relational databases and kanban status columns.',
    blocks: [
      { type: 'heading1', content: 'Engineering Sprint Board' },
      { type: 'callout', content: 'Prioritize tasks based on leverage and user impact. Strive for zero-latency execution.', properties: { icon: '🛠️' } },
      { type: 'heading2', content: 'Sprint Objectives' },
      { type: 'todo', content: 'Implement client-side compressed snapshot sharing', properties: { checked: true } },
      { type: 'todo', content: 'Add offline pre-rendered semantic HTML for crawlers', properties: { checked: true } },
      { type: 'todo', content: 'Refactor sort key compaction in Web Worker', properties: { checked: false } },
      { type: 'heading2', content: 'Architecture Principles' },
      { type: 'bullet', content: '<strong>Local-First:</strong> All writes touch IndexedDB before any network negotiation.' },
      { type: 'bullet', content: '<strong>Privacy First:</strong> Plaintext data never leaves the client unencrypted.' },
      { type: 'bullet', content: '<strong>Zero Lag:</strong> Keep animation loops at locked 60fps with CSS hardware acceleration.' }
    ]
  },
  {
    id: 'daily-performance-tracker',
    title: 'Daily Habit & Metric Mastery',
    category: 'Personal Growth',
    icon: '⚡',
    description: 'Build indestructible habits, log daily quantitative metrics, and maintain personal performance streaks.',
    blocks: [
      { type: 'heading1', content: 'Daily Performance & Habit Log' },
      { type: 'callout', content: 'Consistency compounds exponentially. Win the morning, win the day.', properties: { icon: '🔥' } },
      { type: 'heading2', content: 'Non-Negotiable Morning Routine' },
      { type: 'todo', content: 'Hydration: 500ml water + electrolytes', properties: { checked: true } },
      { type: 'todo', content: '20 minutes deep reading / active recall practice', properties: { checked: true } },
      { type: 'todo', content: '30 minutes high-intensity physical movement', properties: { checked: false } },
      { type: 'heading2', content: 'Deep Work Sprint (90 Minutes)' },
      { type: 'todo', content: 'Execute top-priority engineering deliverable with zero distractions', properties: { checked: false } },
      { type: 'heading2', content: 'Evening Reflection & Shutdown' },
      { type: 'todo', content: 'Log quantitative metrics & plan tomorrow’s 3 primary objectives', properties: { checked: false } }
    ]
  }
];

export default function TemplateGallery() {
  const navigate = useNavigate();
  const [cloningId, setCloningId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Learning & Exams', 'Productivity & PKM', 'Engineering & Dev', 'Personal Growth'];

  const filteredTemplates = activeCategory === 'All' 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.category === activeCategory);

  const handleClone = async (template) => {
    setCloningId(template.id);
    try {
      const snapshot = {
        title: template.title,
        icon: template.icon,
        fullWidth: true,
        blocks: template.blocks.map(b => ({
          ...b,
          sortOrder: 'm'
        }))
      };
      const clonedPage = await cloneSnapshotToWorkspace(snapshot);
      navigate(`/app/page/${clonedPage.id}`);
    } catch (err) {
      console.error('Clone failed:', err);
      alert('Failed to clone template. Please try again.');
      setCloningId(null);
    }
  };

  const handleCopyShareLink = async (template) => {
    try {
      const snapshot = {
        title: template.title,
        icon: template.icon,
        fullWidth: true,
        blocks: template.blocks.map(b => ({
          ...b,
          sortOrder: 'm'
        }))
      };
      const compressed = await compressSnapshot(snapshot);
      const shareUrl = `${window.location.origin}/share#data=${compressed}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.error('Copy link failed:', err);
    }
  };

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': 'https://maniacc.vercel.app/templates#collection',
      'name': 'Free Local-First Productivity & Active Recall Templates — MANIAC',
      'description': 'Browse free, 1-click cloneable templates for Notion alternative MANIAC: Active Recall decks, PARA method hubs, sprint trackers, and habit logs.',
      'url': 'https://maniacc.vercel.app/templates'
    }
  ];

  return (
    <div className="tpl-page">
      <SEO 
        title="Free Local-First Productivity & Active Recall Templates | MANIAC"
        description="Browse free, 1-click cloneable templates for MANIAC: Active Recall flashcards, PARA method second brain, sprint trackers, and habit logs."
        canonical="https://maniacc.vercel.app/templates"
        structuredData={structuredData}
      />

      {/* Atmospheric Glow */}
      <div className="tpl-ambient-glow" aria-hidden="true" />
      <div className="tpl-grid-bg" aria-hidden="true" />

      {/* Navigation */}
      <header className="tpl-header">
        <div className="tpl-container">
          <nav className="tpl-nav">
            <Link to="/" className="tpl-brand">
              <ManiacLogo size="sm" />
              <span className="tpl-brand-title">MANIAC</span>
            </Link>

            <div className="tpl-nav-links">
              <Link to="/" className="tpl-nav-link">Home</Link>
              <Link to="/notion-alternative" className="tpl-nav-link">Notion Alternative</Link>
              <Link to="/templates" className="tpl-nav-link active">Templates</Link>
            </div>

            <div className="tpl-nav-actions">
              <Link to="/app" className="btn-tpl-primary">
                Launch Workspace <ArrowRight size={14} />
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="tpl-hero">
          <div className="tpl-container">
            <div className="tpl-badge">
              <Sparkles size={13} />
              <span>READY-TO-USE WORKSPACE BLUEPRINTS</span>
            </div>

            <h1 className="tpl-hero-title">
              Turn Chaos into a System with <br />
              <span className="tpl-title-gradient">Sovereign Templates</span>
            </h1>

            <p className="tpl-hero-subtitle">
              Clone curated workspaces directly into your local browser vault in one click. No account, no cloud sync lag, and full offline autonomy.
            </p>

            {/* Category Filter Pills */}
            <div className="tpl-category-filters">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`tpl-cat-pill ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Templates Grid */}
        <section className="tpl-grid-section">
          <div className="tpl-container">
            <div className="tpl-cards-grid">
              {filteredTemplates.map(template => (
                <div key={template.id} className="tpl-card">
                  <div className="tpl-card-top">
                    <span className="tpl-icon">{template.icon}</span>
                    <span className="tpl-category-tag">{template.category}</span>
                  </div>

                  <h3 className="tpl-card-title">{template.title}</h3>
                  <p className="tpl-card-desc">{template.description}</p>

                  <div className="tpl-card-blocks-preview">
                    <span className="preview-label">Contains:</span>
                    <span className="preview-pill">{template.blocks.length} modular blocks</span>
                    <span className="preview-pill">Active Recall</span>
                  </div>

                  <div className="tpl-card-actions">
                    <button
                      type="button"
                      onClick={() => handleClone(template)}
                      className="btn-tpl-clone"
                      disabled={cloningId === template.id}
                    >
                      <Download size={15} />
                      <span>{cloningId === template.id ? 'Cloning...' : 'Clone to Vault'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyShareLink(template)}
                      className="btn-tpl-share"
                      title="Copy public template link to share with friends"
                    >
                      {copiedId === template.id ? <Check size={15} className="text-success" /> : <Copy size={15} />}
                      <span>{copiedId === template.id ? 'Copied' : 'Share'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Community Share Callout */}
        <section className="tpl-share-pitch-section">
          <div className="tpl-container">
            <div className="tpl-share-pitch-card">
              <div className="pitch-visual">
                <ManiacLogo size="lg" />
              </div>
              <div className="pitch-text">
                <h2>Build &amp; Share Your Own Templates</h2>
                <p>
                  Any page you create in MANIAC can be shared as a lightweight, compressed web link. Send your study revision decks or sprint dashboards to friends—they can preview and clone your layout instantly without signing up.
                </p>
                <div className="pitch-action-row">
                  <Link to="/app" className="btn-tpl-primary-lg">
                    Open Workspace &amp; Create Template <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="tpl-footer">
        <div className="tpl-container">
          <div className="tpl-footer-inner">
            <div className="tpl-footer-brand">
              <ManiacLogo size="xs" />
              <span>MANIAC Template Hub</span>
            </div>
            <div className="tpl-footer-links">
              <Link to="/">Home</Link>
              <Link to="/notion-alternative">Notion Alternative</Link>
              <Link to="/app">Workspace</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
