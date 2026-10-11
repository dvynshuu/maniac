import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Brain, 
  ArrowRight, 
  Check, 
  X, 
  Sparkles, 
  Zap, 
  Repeat, 
  CheckCircle2, 
  Calendar, 
  TrendingUp, 
  Layers, 
  ChevronDown,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import ManiacLogo from '../components/Common/ManiacLogo';
import SEO from '../seo/SEO';
import { getActiveRecallStructuredData } from '../seo/structuredData';
import './ActiveRecallNotes.css';

export default function ActiveRecallNotes() {
  const [revealed, setRevealed] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState('4 days');
  const [reviewCount, setReviewCount] = useState(1);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleRate = (interval) => {
    setSelectedInterval(interval);
    setReviewCount(prev => prev + 1);
    setRevealed(false);
  };

  const faqData = [
    {
      q: 'How does Active Recall in MANIAC work?',
      a: 'In MANIAC, any note, toggle block, or document can be flagged for Active Recall. When you enter Workspace Review, MANIAC hides the answers and presents prompts in an interactive review queue. After self-testing, you rate your recall difficulty (Again, Hard, Good, Easy), and our Leitner / SM-2 spaced repetition algorithm schedules the optimal future review date based on the Ebbinghaus forgetting curve.'
    },
    {
      q: 'Why not just use Notion for notes and Anki for flashcards?',
      a: 'Switching between Notion and Anki forces dual maintenance: you write notes in one app, then spend hours manually copying sentences into flashcards in another. When information changes, you must update both. In MANIAC, your notes ARE your flashcards. You study with full surrounding context in 0ms offline.'
    },
    {
      q: 'Does it work offline without an internet connection?',
      a: 'Yes, 100%. All notes, flashcard states, review intervals, and streak statistics are stored locally in your browser\'s IndexedDB. You can review flashcards on an airplane, subway, or in exam halls with zero network latency.'
    },
    {
      q: 'Can I import my existing study notes from Notion?',
      a: 'Yes. Export your Notion study workspace as a ZIP package, upload it into MANIAC\'s client-side parser, and your toggle lists will immediately be available for active recall practice without sending data to any cloud server.'
    },
    {
      q: 'Is there a limit on how many flashcards or notes I can review?',
      a: 'None. MANIAC is completely free and unmetered with no subscriptions, cloud limits, or review quotas.'
    }
  ];

  const structuredData = getActiveRecallStructuredData(faqData);

  return (
    <div className="srs-page">
      <SEO 
        title="Best Note-Taking App with Native Active Recall & Spaced Repetition | MANIAC"
        description="Stop copying notes into Anki. MANIAC unifies modular notes, relational databases, and built-in Leitner spaced repetition flashcards with 0ms offline speed."
        canonical="https://maniacc.vercel.app/active-recall-notes"
        structuredData={structuredData}
      />

      {/* Atmospheric Glow */}
      <div className="srs-ambient-glow" aria-hidden="true" />
      <div className="srs-grid-bg" aria-hidden="true" />

      {/* Navigation Header */}
      <header className="srs-header">
        <div className="srs-container">
          <nav className="srs-nav" aria-label="Main Navigation">
            <Link to="/" className="srs-brand" aria-label="MANIAC Homepage">
              <ManiacLogo size="sm" />
              <span className="srs-brand-title">MANIAC</span>
            </Link>

            <div className="srs-nav-links">
              <Link to="/" className="srs-nav-link">Home</Link>
              <Link to="/notion-alternative" className="srs-nav-link">Notion Alternative</Link>
              <Link to="/obsidian-alternative" className="srs-nav-link">Obsidian Alternative</Link>
              <Link to="/templates" className="srs-nav-link">Templates</Link>
            </div>

            <div className="srs-nav-actions">
              <Link to="/app" className="btn-srs-primary">
                Open Workspace <ArrowRight size={14} />
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="srs-breadcrumb-bar">
        <div className="srs-container">
          <nav aria-label="Breadcrumb" className="srs-breadcrumb-nav">
            <Link to="/" className="srs-breadcrumb-link">Home</Link>
            <span className="srs-breadcrumb-sep">/</span>
            <span className="srs-breadcrumb-current">Active Recall Notes</span>
          </nav>
        </div>
      </div>

      <main>
        {/* Hero Section */}
        <section className="srs-hero">
          <div className="srs-container">
            <div className="srs-badge">
              <Brain size={14} />
              <span>Cognitive Retention Engine</span>
            </div>

            <h1 className="srs-title">
              The Note-Taking App with Native <span className="srs-gradient-text">Active Recall &amp; Spaced Repetition</span>
            </h1>

            <p className="srs-subtitle">
              Stop copy-pasting your lecture notes into Anki. MANIAC unites modular rich text documents, relational databases, and built-in Leitner spaced repetition into a sovereign, 0ms offline workspace.
            </p>

            <div className="srs-cta-group">
              <Link to="/app" className="btn-srs-primary-large">
                Start Studying in MANIAC <ArrowRight size={16} />
              </Link>
              <Link to="/templates/active-recall-srs" className="btn-srs-secondary">
                Get Active Recall Template
              </Link>
            </div>

            {/* Live Interactive SRS Practice Card Demo */}
            <div className="srs-simulator-card">
              <div className="srs-sim-header">
                <div className="srs-sim-title">
                  <Repeat size={15} className="srs-sim-icon" />
                  <span>Interactive Practice Deck Simulator</span>
                </div>
                <div className="srs-sim-meta">
                  <span>Card {reviewCount} of 10</span>
                  <span className="srs-sim-dot" />
                  <span>Optimal Interval: {selectedInterval}</span>
                </div>
              </div>

              <div className="srs-sim-body">
                <div className="srs-sim-question-label">Active Retrieval Prompt:</div>
                <div className="srs-sim-question">
                  What is the Ebbinghaus Forgetting Curve, and how does spaced repetition counteract memory decay?
                </div>

                {revealed ? (
                  <div className="srs-sim-answer">
                    <div className="srs-sim-answer-label">Retrieved Answer:</div>
                    <p>
                      The Ebbinghaus Forgetting Curve shows that humans lose approximately 70% of new information within 24–48 hours if not reviewed. Spaced repetition counteracts this decay by presenting recall tests at progressively expanding intervals right as memory begins to fade, resetting the decay curve and consolidating neural traces into permanent long-term memory.
                    </p>
                    <div className="srs-sim-rate-buttons">
                      <button type="button" className="btn-rate rate-again" onClick={() => handleRate('10 mins')}>
                        Again <span className="rate-sub">10m</span>
                      </button>
                      <button type="button" className="btn-rate rate-hard" onClick={() => handleRate('1 day')}>
                        Hard <span className="rate-sub">1d</span>
                      </button>
                      <button type="button" className="btn-rate rate-good" onClick={() => handleRate('4 days')}>
                        Good <span className="rate-sub">4d</span>
                      </button>
                      <button type="button" className="btn-rate rate-easy" onClick={() => handleRate('10 days')}>
                        Easy <span className="rate-sub">10d</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="btn-reveal" onClick={() => setRevealed(true)}>
                    <Eye size={16} /> Reveal Model Answer &amp; Self-Grade
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* The 3 Pillars Section */}
        <section className="srs-section srs-section-alt">
          <div className="srs-container">
            <div className="srs-section-header">
              <h2 className="srs-section-title">Why Students &amp; Researchers Love MANIAC</h2>
              <p className="srs-section-subtitle">
                Engineered specifically for medical school, STEM disciplines, bar exams, and lifelong learning.
              </p>
            </div>

            <div className="srs-grid-3">
              <div className="srs-card">
                <div className="srs-card-icon pink">
                  <Brain size={24} />
                </div>
                <h3 className="srs-card-title">Zero Friction Workflow</h3>
                <p className="srs-card-text">
                  Write lecture notes naturally with rich headings, code snippets, LaTeX math, and toggles. Click "Practice" in the header to instantly review those exact toggles as spaced repetition flashcards without exporting or re-typing.
                </p>
              </div>

              <div className="srs-card">
                <div className="srs-card-icon blue">
                  <Zap size={24} />
                </div>
                <h3 className="srs-card-title">0ms Instant Review</h3>
                <p className="srs-card-text">
                  Cloud apps stutter and spin on spotty university Wi-Fi. MANIAC operates 100% inside your browser's IndexedDB engine, giving you instantaneous card flipping, instant search, and zero lag.
                </p>
              </div>

              <div className="srs-card">
                <div className="srs-card-icon green">
                  <BookOpen size={24} />
                </div>
                <h3 className="srs-card-title">Retain Full Context</h3>
                <p className="srs-card-text">
                  Anki flashcards strip away the surrounding chapter. In MANIAC, you can jump directly from a failed flashcard into the full lecture note and relational database to review the broader conceptual framework.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Head-to-Head Comparison */}
        <section className="srs-section">
          <div className="srs-container">
            <div className="srs-section-header">
              <h2 className="srs-section-title">MANIAC vs Notion + Anki Workflow</h2>
              <p className="srs-section-subtitle">
                Compare the unified cognitive workspace against disjointed traditional tools.
              </p>
            </div>

            <div className="srs-table-wrapper">
              <table className="srs-table">
                <thead>
                  <tr>
                    <th>Workflow Capability</th>
                    <th className="srs-th-highlight">MANIAC</th>
                    <th>Notion</th>
                    <th>Anki</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Unified Notes &amp; Flashcards</strong></td>
                    <td className="srs-td-highlight"><span className="srs-check"><Check size={16} /> Native (Single workspace)</span></td>
                    <td><span className="srs-cross"><X size={16} /> Notes only</span></td>
                    <td><span className="srs-cross"><X size={16} /> Flashcards only</span></td>
                  </tr>
                  <tr>
                    <td><strong>Spaced Repetition Algorithm</strong></td>
                    <td className="srs-td-highlight"><span className="srs-check"><Check size={16} /> Built-in Leitner scheduler</span></td>
                    <td><span className="srs-cross"><X size={16} /> None (manual formulas)</span></td>
                    <td><span className="srs-check"><Check size={16} /> SM-2 algorithm</span></td>
                  </tr>
                  <tr>
                    <td><strong>Relational Databases</strong></td>
                    <td className="srs-td-highlight"><span className="srs-check"><Check size={16} /> Tables, Boards, Calendars</span></td>
                    <td><span className="srs-check"><Check size={16} /> Cloud databases</span></td>
                    <td><span className="srs-cross"><X size={16} /> No databases</span></td>
                  </tr>
                  <tr>
                    <td><strong>Offline Speed</strong></td>
                    <td className="srs-td-highlight"><span className="srs-check"><Check size={16} /> 0ms local IndexedDB</span></td>
                    <td><span className="srs-cross"><X size={16} /> High cloud latency</span></td>
                    <td><span className="srs-check"><Check size={16} /> Fast local desktop</span></td>
                  </tr>
                  <tr>
                    <td><strong>Price / Cloud Gating</strong></td>
                    <td className="srs-td-highlight"><span className="srs-check"><Check size={16} /> $0 Free Forever</span></td>
                    <td><span className="srs-cross"><X size={16} /> $10/mo Plus tier</span></td>
                    <td><span className="srs-check"><Check size={16} /> Free ($25 iOS app)</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="srs-section srs-section-alt">
          <div className="srs-container">
            <div className="srs-section-header">
              <h2 className="srs-section-title">Frequently Asked Questions</h2>
              <p className="srs-section-subtitle">
                Everything you need to know about spaced repetition, data security, and templates.
              </p>
            </div>

            <div className="srs-faq-list">
              {faqData.map((faq, index) => (
                <div key={index} className="srs-faq-item">
                  <button 
                    className="srs-faq-trigger"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={openFaq === index}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className={`srs-chevron ${openFaq === index ? 'rotate' : ''}`} />
                  </button>
                  {openFaq === index && (
                    <div className="srs-faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="srs-bottom-cta">
          <div className="srs-container">
            <div className="srs-cta-card">
              <ManiacLogo size="lg" />
              <h2 className="srs-cta-title">Build Permanent Knowledge Today</h2>
              <p className="srs-cta-text">
                Start your first active recall study session in 30 seconds. No account creation required, stored safely on your device.
              </p>
              <div className="srs-cta-actions">
                <Link to="/app" className="btn-srs-primary-large">
                  Open Workspace <ArrowRight size={16} />
                </Link>
                <Link to="/templates/active-recall-srs" className="btn-srs-secondary">
                  Browse Study Templates
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Semantic Footer */}
      <footer className="srs-footer">
        <div className="srs-container">
          <div className="srs-footer-inner">
            <div className="srs-footer-brand">
              <ManiacLogo size="xs" />
              <span className="srs-footer-brand-title">MANIAC</span>
              <p className="srs-footer-desc">
                Sovereign notes, relational databases, and cognitive spaced repetition.
              </p>
            </div>

            <div className="srs-footer-links">
              <div className="srs-footer-col">
                <span className="srs-footer-col-header">Pages</span>
                <Link to="/notion-alternative" className="srs-footer-link">Notion Alternative</Link>
                <Link to="/obsidian-alternative" className="srs-footer-link">Obsidian Alternative</Link>
                <Link to="/active-recall-notes" className="srs-footer-link">Active Recall Notes</Link>
              </div>
              <div className="srs-footer-col">
                <span className="srs-footer-col-header">Study Templates</span>
                <Link to="/templates/active-recall-srs" className="srs-footer-link">Active Recall Hub</Link>
                <Link to="/templates/student-study-hub" className="srs-footer-link">Student Semester Hub</Link>
                <Link to="/templates/para-method-second-brain" className="srs-footer-link">PARA Second Brain</Link>
                <Link to="/templates" className="srs-footer-link">All Templates</Link>
              </div>
              <div className="srs-footer-col">
                <span className="srs-footer-col-header">Workspace</span>
                <Link to="/app" className="srs-footer-link">Launch App</Link>
                <Link to="/" className="srs-footer-link">Home</Link>
              </div>
            </div>
          </div>
          <div className="srs-footer-bottom">
            <span>© {new Date().getFullYear()} MANIAC. Stored strictly on your local device.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Eye({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
