import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Check, 
  X, 
  ArrowRight, 
  Shield, 
  Zap, 
  Brain, 
  Database, 
  Lock, 
  HardDrive, 
  ChevronDown,
  Sparkles,
  Layers,
  ArrowUpRight,
  FolderTree,
  Table,
  Kanban
} from 'lucide-react';
import ManiacLogo from '../components/Common/ManiacLogo';
import SEO from '../seo/SEO';
import { getObsidianAltStructuredData } from '../seo/structuredData';
import './ObsidianAlternative.css';

export default function ObsidianAlternative() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqData = [
    {
      q: 'Why choose MANIAC over Obsidian for personal knowledge management?',
      a: 'Obsidian relies on plain markdown files and requires dozens of third-party community plugins (like Dataview, Kanban, and Projects) that frequently break on updates. MANIAC provides native Notion-style relational databases (Table, Kanban, Calendar), modular drag-and-drop block editing, built-in active recall spaced repetition, and client-side AES-256 encryption right out of the box with zero plugins required.'
    },
    {
      q: 'Does MANIAC have bi-directional linking and a knowledge graph like Obsidian?',
      a: 'Yes. MANIAC features full bidirectional @ and [[ backlinks and an interactive real-time 2D force graph visualization of connected pages and thoughts, built directly into the core engine.'
    },
    {
      q: 'How does MANIAC handle offline storage without markdown files?',
      a: 'MANIAC stores all notes and databases in your browser\'s IndexedDB engine using Dexie.js. This architecture delivers instantaneous 0ms search, high-volume relational queries, and zero file-system latency, while maintaining 100% offline functionality. You can export your entire vault as JSON or Markdown anytime with a single click.'
    },
    {
      q: 'Do I have to pay for sync like Obsidian Sync ($8/month)?',
      a: 'No. MANIAC does not gate your data behind subscription paywalls. It runs locally and supports CRDT-based multi-tab synchronization and instant compressed snapshot sharing completely free of charge.'
    },
    {
      q: 'Can I import my existing notes from Obsidian or Notion?',
      a: 'Yes. MANIAC includes a client-side parser that accepts standard markdown archives and Notion export ZIPs, recreating your hierarchical sub-page tree, callouts, and lists entirely within your browser.'
    }
  ];

  const structuredData = getObsidianAltStructuredData(faqData);

  return (
    <div className="obs-page">
      <SEO 
        title="Best Obsidian Alternative with Native Databases & Blocks | MANIAC"
        description="Looking for an Obsidian alternative with Notion-style databases and drag-and-drop blocks? MANIAC delivers local-first speed, active recall, and AES-256 encryption."
        canonical="https://maniacc.vercel.app/obsidian-alternative"
        structuredData={structuredData}
      />

      {/* Atmospheric Backgrounds */}
      <div className="obs-ambient-glow" aria-hidden="true" />
      <div className="obs-grid-bg" aria-hidden="true" />

      {/* Header Navigation */}
      <header className="obs-header">
        <div className="obs-container">
          <nav className="obs-nav" aria-label="Main Navigation">
            <Link to="/" className="obs-brand" aria-label="MANIAC Homepage">
              <ManiacLogo size="sm" />
              <span className="obs-brand-title">MANIAC</span>
            </Link>

            <div className="obs-nav-links">
              <Link to="/" className="obs-nav-link">Home</Link>
              <Link to="/notion-alternative" className="obs-nav-link">Notion Alternative</Link>
              <Link to="/templates" className="obs-nav-link">Templates</Link>
            </div>

            <div className="obs-nav-actions">
              <Link to="/app" className="btn-obs-primary">
                Launch Workspace <ArrowRight size={14} />
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Breadcrumb Strip */}
      <div className="obs-breadcrumb-bar">
        <div className="obs-container">
          <nav aria-label="Breadcrumb" className="obs-breadcrumb-nav">
            <Link to="/" className="obs-breadcrumb-link">Home</Link>
            <span className="obs-breadcrumb-sep">/</span>
            <span className="obs-breadcrumb-current">Obsidian Alternative</span>
          </nav>
        </div>
      </div>

      <main>
        {/* Hero Section */}
        <section className="obs-hero">
          <div className="obs-container">
            <div className="obs-badge">
              <Sparkles size={14} className="obs-badge-icon" />
              <span>The Local-First Evolution</span>
            </div>

            <h1 className="obs-title">
              The Local-First Obsidian Alternative with <span className="obs-gradient-text">Native Databases &amp; Blocks</span>
            </h1>

            <p className="obs-subtitle">
              Love Obsidian’s local-first privacy, but tired of wrestling with 30 community plugins just to get tables and kanban boards? MANIAC combines Notion-grade modular blocks and relational databases with Obsidian’s offline speed and sovereign encryption.
            </p>

            <div className="obs-cta-group">
              <Link to="/app" className="btn-obs-primary-large">
                Open MANIAC Workspace <ArrowRight size={16} />
              </Link>
              <Link to="/templates" className="btn-obs-secondary">
                Explore Templates
              </Link>
            </div>

            <div className="obs-metrics-bar">
              <div className="obs-metric">
                <span className="obs-metric-val">0ms</span>
                <span className="obs-metric-lbl">Boot Latency</span>
              </div>
              <div className="obs-metric-sep" />
              <div className="obs-metric">
                <span className="obs-metric-val">100%</span>
                <span className="obs-metric-lbl">Native Databases</span>
              </div>
              <div className="obs-metric-sep" />
              <div className="obs-metric">
                <span className="obs-metric-val">Zero</span>
                <span className="obs-metric-lbl">Plugin Dependency</span>
              </div>
              <div className="obs-metric-sep" />
              <div className="obs-metric">
                <span className="obs-metric-val">$0</span>
                <span className="obs-metric-lbl">Forever Free</span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Comparison Matrix */}
        <section className="obs-section">
          <div className="obs-container">
            <div className="obs-section-header">
              <h2 className="obs-section-title">MANIAC vs Obsidian: Architectural Comparison</h2>
              <p className="obs-section-subtitle">
                A factual, line-by-line comparison of data sovereignty, database capabilities, and user experience.
              </p>
            </div>

            <div className="obs-table-wrapper">
              <table className="obs-table">
                <thead>
                  <tr>
                    <th>Capability</th>
                    <th className="obs-th-highlight">MANIAC</th>
                    <th>Obsidian</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Relational Databases</strong></td>
                    <td className="obs-td-highlight"><span className="obs-check"><Check size={16} /> Native Tables, Boards, Calendars</span></td>
                    <td><span className="obs-cross"><X size={16} /> Requires Dataview/Projects plugins</span></td>
                  </tr>
                  <tr>
                    <td><strong>Drag-and-Drop Modular Canvas</strong></td>
                    <td className="obs-td-highlight"><span className="obs-check"><Check size={16} /> Block-based TipTap editor</span></td>
                    <td><span className="obs-cross"><X size={16} /> Flat markdown text files</span></td>
                  </tr>
                  <tr>
                    <td><strong>Active Recall &amp; Spaced Repetition</strong></td>
                    <td className="obs-td-highlight"><span className="obs-check"><Check size={16} /> Native Leitner SRS practice engine</span></td>
                    <td><span className="obs-cross"><X size={16} /> Requires Anki integration plugins</span></td>
                  </tr>
                  <tr>
                    <td><strong>2D Knowledge Graph &amp; Backlinks</strong></td>
                    <td className="obs-td-highlight"><span className="obs-check"><Check size={16} /> Built-in 2D Force Graph</span></td>
                    <td><span className="obs-check"><Check size={16} /> Built-in Graph View</span></td>
                  </tr>
                  <tr>
                    <td><strong>Hardware-Grade Vault Encryption</strong></td>
                    <td className="obs-td-highlight"><span className="obs-check"><Check size={16} /> Client-Side AES-256-GCM with PBKDF2</span></td>
                    <td><span className="obs-cross"><X size={16} /> Plaintext files on local disk</span></td>
                  </tr>
                  <tr>
                    <td><strong>Multi-Device Zero-Install Access</strong></td>
                    <td className="obs-td-highlight"><span className="obs-check"><Check size={16} /> Instant browser boot anywhere</span></td>
                    <td><span className="obs-cross"><X size={16} /> Requires Electron desktop installer</span></td>
                  </tr>
                  <tr>
                    <td><strong>Cloud Paywall / Sync Pricing</strong></td>
                    <td className="obs-td-highlight"><span className="obs-check"><Check size={16} /> $0 (Free forever, CRDT sync)</span></td>
                    <td><span className="obs-cross"><X size={16} /> $8/month ($96/yr) for Obsidian Sync</span></td>
                  </tr>
                  <tr>
                    <td><strong>Notion Migration</strong></td>
                    <td className="obs-td-highlight"><span className="obs-check"><Check size={16} /> 1-Click in-browser ZIP extractor</span></td>
                    <td><span className="obs-cross"><X size={16} /> Manual conversion scripting</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Why Users Switch Section */}
        <section className="obs-section obs-section-alt">
          <div className="obs-container">
            <div className="obs-section-header">
              <h2 className="obs-section-title">The Three Big Pain Points of Obsidian Solved</h2>
              <p className="obs-section-subtitle">
                Why power knowledge workers are choosing MANIAC as their primary thinking environment.
              </p>
            </div>

            <div className="obs-grid-3">
              <div className="obs-card">
                <div className="obs-card-icon red">
                  <Database size={24} />
                </div>
                <h3 className="obs-card-title">1. Real Databases, Not Hacky Scripts</h3>
                <p className="obs-card-text">
                  In Obsidian, building a simple project management board requires installing Dataview, learning custom query syntax, and hoping community plugins don't corrupt your YAML frontmatter. MANIAC gives you true relational databases with custom properties, board filters, and calendar views out of the box.
                </p>
              </div>

              <div className="obs-card">
                <div className="obs-card-icon blue">
                  <Brain size={24} />
                </div>
                <h3 className="obs-card-title">2. Study Where You Write</h3>
                <p className="obs-card-text">
                  Obsidian users frequently maintain notes in Obsidian and separate flashcards in Anki. MANIAC eliminates this cognitive fragmentation: toggle blocks in any note can be practiced immediately in the built-in Leitner spaced repetition review queue.
                </p>
              </div>

              <div className="obs-card">
                <div className="obs-card-icon green">
                  <Shield size={24} />
                </div>
                <h3 className="obs-card-title">3. True Military-Grade Cryptography</h3>
                <p className="obs-card-text">
                  Obsidian leaves your notes in raw, unencrypted markdown files on your drive, vulnerable to rogue scripts or malware. MANIAC offers client-side Web Crypto AES-256-GCM vault locking so your proprietary research remains strictly confidential.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className="obs-section">
          <div className="obs-container">
            <div className="obs-section-header">
              <h2 className="obs-section-title">Frequently Asked Questions</h2>
              <p className="obs-section-subtitle">
                Clear answers regarding migration, encryption, and local-first architecture.
              </p>
            </div>

            <div className="obs-faq-list">
              {faqData.map((faq, index) => (
                <div key={index} className="obs-faq-item">
                  <button 
                    className="obs-faq-trigger"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={openFaq === index}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className={`obs-chevron ${openFaq === index ? 'rotate' : ''}`} />
                  </button>
                  {openFaq === index && (
                    <div className="obs-faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="obs-bottom-cta">
          <div className="obs-container">
            <div className="obs-cta-card">
              <ManiacLogo size="lg" />
              <h2 className="obs-cta-title">Upgrade Your Local-First Thinking</h2>
              <p className="obs-cta-text">
                Instant browser boot. Zero plugins to configure. Experience the union of Notion's structured databases and Obsidian's offline sovereignty.
              </p>
              <div className="obs-cta-actions">
                <Link to="/app" className="btn-obs-primary-large">
                  Launch MANIAC Workspace <ArrowRight size={16} />
                </Link>
                <Link to="/notion-alternative" className="btn-obs-secondary">
                  Compare with Notion
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Semantic Footer */}
      <footer className="obs-footer">
        <div className="obs-container">
          <div className="obs-footer-inner">
            <div className="obs-footer-brand">
              <ManiacLogo size="xs" />
              <span className="obs-footer-brand-title">MANIAC</span>
              <p className="obs-footer-desc">
                The local-first workspace for notes, databases, and cognitive learning.
              </p>
            </div>

            <div className="obs-footer-links">
              <div className="obs-footer-col">
                <span className="obs-footer-col-header">Comparisons</span>
                <Link to="/notion-alternative" className="obs-footer-link">Notion Alternative</Link>
                <Link to="/obsidian-alternative" className="obs-footer-link">Obsidian Alternative</Link>
                <Link to="/active-recall-notes" className="obs-footer-link">Active Recall Notes</Link>
              </div>
              <div className="obs-footer-col">
                <span className="obs-footer-col-header">Templates</span>
                <Link to="/templates/active-recall-srs" className="obs-footer-link">Active Recall Hub</Link>
                <Link to="/templates/para-method-second-brain" className="obs-footer-link">PARA Second Brain</Link>
                <Link to="/templates/engineering-roadmap" className="obs-footer-link">Engineering Roadmap</Link>
                <Link to="/templates" className="obs-footer-link">View All Templates</Link>
              </div>
              <div className="obs-footer-col">
                <span className="obs-footer-col-header">Workspace</span>
                <Link to="/app" className="obs-footer-link">Launch Workspace</Link>
                <Link to="/" className="obs-footer-link">Home Overview</Link>
              </div>
            </div>
          </div>
          <div className="obs-footer-bottom">
            <span>© {new Date().getFullYear()} MANIAC. Stored strictly on your local device.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
