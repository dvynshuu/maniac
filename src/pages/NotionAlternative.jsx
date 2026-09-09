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
  Upload, 
  HardDrive, 
  ChevronDown,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import ManiacLogo from '../components/Common/ManiacLogo';
import SEO from '../seo/SEO';
import './NotionAlternative.css';

export default function NotionAlternative() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqData = [
    {
      q: 'Why should I switch from Notion to MANIAC?',
      a: 'Notion requires constant cloud connectivity, suffers from noticeable server latency, and stores your personal thoughts in plaintext on third-party cloud servers. MANIAC is local-first: it boots in 0ms, works 100% offline, stores all data in your browser IndexedDB with optional AES-256 hardware encryption, and includes native active recall spaced repetition.'
    },
    {
      q: 'Can I import my existing Notion workspace into MANIAC?',
      a: 'Yes. MANIAC features a built-in client-side Notion ZIP parser. Export your Notion workspace as HTML/Markdown ZIP, drag it into MANIAC, and it converts your pages, hierarchy, and markdown blocks instantly on your device without uploading anything to a server.'
    },
    {
      q: 'Does MANIAC support relational databases like Notion?',
      a: 'Yes. MANIAC includes flexible relational databases with Table, Kanban Board, and Calendar views, complete with custom properties, filtering, sorting, and inline calculations.'
    },
    {
      q: 'How does MANIAC differ from Obsidian?',
      a: 'Obsidian relies on plain markdown files with a plugin-heavy ecosystem and does not natively provide Notion-style block drag-and-drop or relational database tables out of the box. MANIAC delivers a cohesive Notion-like block canvas and rich databases combined with native Anki-style spaced repetition and a 2D knowledge graph.'
    },
    {
      q: 'Is MANIAC completely free and private?',
      a: 'Yes. MANIAC runs entirely on your device with no registration forms, no telemetry tracking, and no cloud paywalls. Your data remains your sovereign property.'
    }
  ];

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': 'https://maniacc.vercel.app/notion-alternative#webpage',
      'name': 'The Best Local-First Notion Alternative — MANIAC',
      'description': 'Looking for an offline Notion alternative? MANIAC gives you Notion-style databases, block editing, and active recall with 0ms latency and AES-256 encryption.',
      'url': 'https://maniacc.vercel.app/notion-alternative'
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faqData.map(f => ({
        '@type': 'Question',
        'name': f.q,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': f.a
        }
      }))
    }
  ];

  return (
    <div className="alt-page">
      <SEO 
        title="Best Offline Notion Alternative — Local-First Workspace | MANIAC"
        description="Looking for an offline Notion alternative? MANIAC delivers block notes, relational databases, active recall, and AES-256 encryption with 0ms latency."
        canonical="https://maniacc.vercel.app/notion-alternative"
        structuredData={structuredData}
      />

      {/* Atmospheric Backgrounds */}
      <div className="alt-ambient-glow" aria-hidden="true" />
      <div className="alt-grid-bg" aria-hidden="true" />

      {/* Header Navigation */}
      <header className="alt-header">
        <div className="alt-container">
          <nav className="alt-nav">
            <Link to="/" className="alt-brand">
              <ManiacLogo size="sm" />
              <span className="alt-brand-title">MANIAC</span>
            </Link>

            <div className="alt-nav-links">
              <Link to="/" className="alt-nav-link">Home</Link>
              <Link to="/templates" className="alt-nav-link">Templates</Link>
              <a href="#comparison" className="alt-nav-link">Comparison</a>
              <a href="#faq" className="alt-nav-link">FAQ</a>
            </div>

            <div className="alt-nav-actions">
              <Link to="/app" className="btn-alt-primary">
                Launch Workspace <ArrowRight size={14} />
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="alt-hero">
          <div className="alt-container">
            <div className="alt-badge">
              <Sparkles size={13} />
              <span>THE SOVEREIGN NOTION ALTERNATIVE</span>
            </div>

            <h1 className="alt-hero-title">
              The Local-First, Zero-Latency <br />
              <span className="alt-title-gradient">Alternative to Notion</span>
            </h1>

            <p className="alt-hero-subtitle">
              Everything you love about block-based documents and relational databases—without the cloud lag, forced login walls, server downtime, or plaintext data inspection.
            </p>

            <div className="alt-hero-cta">
              <Link to="/app" className="btn-alt-primary-lg">
                Open Free Workspace <ArrowRight size={16} />
              </Link>
              <Link to="/app" className="btn-alt-secondary-lg">
                <Upload size={16} />
                <span>Import Notion ZIP</span>
              </Link>
            </div>

            <div className="alt-trust-strip">
              <span>✓ 100% Offline Capable</span>
              <span>•</span>
              <span>✓ Zero Account Required</span>
              <span>•</span>
              <span>✓ Client-Side AES-256 Encryption</span>
              <span>•</span>
              <span>✓ Instant 0ms Interaction</span>
            </div>
          </div>
        </section>

        {/* The 4 Core Pillars of Superiority */}
        <section className="alt-section">
          <div className="alt-container">
            <div className="alt-section-header">
              <div className="alt-tag">ARCHITECTURAL EVOLUTION</div>
              <h2 className="alt-section-title">Why Knowledge Workers Are Leaving the Cloud</h2>
              <p className="alt-section-desc">
                Cloud-based note apps were built for centralized SaaS monetization. MANIAC was engineered for individual cognitive sovereignty and raw speed.
              </p>
            </div>

            <div className="alt-pillars-grid">
              <div className="alt-pillar-card">
                <div className="pillar-icon-box orange">
                  <Zap size={22} />
                </div>
                <h3>0ms Latency vs 1,200ms Cloud Wait</h3>
                <p>
                  Every keypress, block reorder, and database filter queries IndexedDB on your CPU. No loading skeletons, no WebSocket latency, and no network stutter.
                </p>
              </div>

              <div className="alt-pillar-card">
                <div className="pillar-icon-box red">
                  <Lock size={22} />
                </div>
                <h3>AES-256 Hardware Encryption</h3>
                <p>
                  Notion stores your personal journals and proprietary business databases in plaintext on centralized databases. MANIAC allows locking pages with client-derived hardware keys.
                </p>
              </div>

              <div className="alt-pillar-card">
                <div className="pillar-icon-box purple">
                  <Brain size={22} />
                </div>
                <h3>Active Recall &amp; Spaced Repetition</h3>
                <p>
                  Notion is passive storage where knowledge goes to die. MANIAC features an integrated active recall practice engine so your notes transform into durable long-term memory.
                </p>
              </div>

              <div className="alt-pillar-card">
                <div className="pillar-icon-box blue">
                  <HardDrive size={22} />
                </div>
                <h3>Zero Vendor Lock-In &amp; Offline Freedom</h3>
                <p>
                  Board a flight, work in the mountains, or disconnect from Wi-Fi. MANIAC operates identically offline and allows full Markdown/JSON exports at any moment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Head-to-Head Comparison Matrix */}
        <section id="comparison" className="alt-section alt-section-bordered">
          <div className="alt-container">
            <div className="alt-section-header">
              <div className="alt-tag">FEATURE BREAKDOWN</div>
              <h2 className="alt-section-title">MANIAC vs Notion vs Obsidian</h2>
              <p className="alt-section-desc">
                Compare architecture, speed, privacy, and productivity capabilities side by side.
              </p>
            </div>

            <div className="alt-table-wrapper">
              <table className="alt-table">
                <thead>
                  <tr>
                    <th>Capability</th>
                    <th className="highlight">MANIAC</th>
                    <th>Notion</th>
                    <th>Obsidian</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Data Storage Architecture</strong></td>
                    <td className="highlight"><Check size={16} className="text-success" /> Local IndexedDB (Zero Cloud)</td>
                    <td><X size={16} className="text-danger" /> Central Cloud Servers</td>
                    <td><Check size={16} className="text-success" /> Local Markdown Files</td>
                  </tr>
                  <tr>
                    <td><strong>Offline Operation</strong></td>
                    <td className="highlight"><Check size={16} className="text-success" /> 100% Native &amp; Permanent</td>
                    <td><X size={16} className="text-danger" /> Degraded / Unreliable</td>
                    <td><Check size={16} className="text-success" /> 100% Native</td>
                  </tr>
                  <tr>
                    <td><strong>Relational Databases (Table/Board/Calendar)</strong></td>
                    <td className="highlight"><Check size={16} className="text-success" /> Built-in Native</td>
                    <td><Check size={16} className="text-success" /> Built-in Native</td>
                    <td><X size={16} className="text-danger" /> Requires Third-Party Community Plugins</td>
                  </tr>
                  <tr>
                    <td><strong>Client-Side Hardware Encryption</strong></td>
                    <td className="highlight"><Check size={16} className="text-success" /> AES-256-GCM Hardware Vault</td>
                    <td><X size={16} className="text-danger" /> Plaintext on Cloud Servers</td>
                    <td><X size={16} className="text-danger" /> Requires Community Plugins</td>
                  </tr>
                  <tr>
                    <td><strong>Active Recall &amp; Spaced Repetition</strong></td>
                    <td className="highlight"><Check size={16} className="text-success" /> Native Integrated Engine</td>
                    <td><X size={16} className="text-danger" /> Not Available</td>
                    <td><X size={16} className="text-danger" /> Requires Complex Plugins</td>
                  </tr>
                  <tr>
                    <td><strong>Interactive 2D Knowledge Graph</strong></td>
                    <td className="highlight"><Check size={16} className="text-success" /> Integrated Force Graph</td>
                    <td><X size={16} className="text-danger" /> Not Available</td>
                    <td><Check size={16} className="text-success" /> Built-in</td>
                  </tr>
                  <tr>
                    <td><strong>Notion ZIP Direct Migration</strong></td>
                    <td className="highlight"><Check size={16} className="text-success" /> 1-Click Client-Side Parser</td>
                    <td><span className="text-muted">—</span></td>
                    <td><X size={16} className="text-danger" /> Requires Manual Scripting</td>
                  </tr>
                  <tr>
                    <td><strong>Registration / Account Requirement</strong></td>
                    <td className="highlight"><Check size={16} className="text-success" /> Zero (Instant Browser Launch)</td>
                    <td><X size={16} className="text-danger" /> Mandatory Cloud Login</td>
                    <td><Check size={16} className="text-success" /> Zero</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Notion Migration Section */}
        <section className="alt-section">
          <div className="alt-container">
            <div className="alt-migration-box">
              <div className="migration-content">
                <div className="alt-tag">SEAMLESS TRANSITION</div>
                <h2>Switch from Notion in Under 60 Seconds</h2>
                <p>
                  Export your Notion workspace as a standard Markdown &amp; HTML ZIP package. Drag the archive directly into MANIAC—our client-side engine parses your nested pages, tables, and media entirely in your browser.
                </p>
                <div className="migration-steps">
                  <div className="step-item">
                    <span className="step-num">1</span>
                    <span>In Notion: Settings → Export all workspace content (Markdown &amp; CSV).</span>
                  </div>
                  <div className="step-item">
                    <span className="step-num">2</span>
                    <span>Open MANIAC → Settings → Import Notion Package.</span>
                  </div>
                  <div className="step-item">
                    <span className="step-num">3</span>
                    <span>Experience zero-latency local-first computing immediately.</span>
                  </div>
                </div>
              </div>
              <div className="migration-cta">
                <Link to="/app" className="btn-alt-primary-lg">
                  Launch &amp; Import Now <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="alt-section alt-section-bordered">
          <div className="alt-container">
            <div className="alt-section-header">
              <div className="alt-tag">FREQUENTLY ASKED QUESTIONS</div>
              <h2 className="alt-section-title">Everything You Need to Know</h2>
            </div>

            <div className="alt-faq-list">
              {faqData.map((item, index) => (
                <div key={index} className={`alt-faq-item ${openFaq === index ? 'active' : ''}`}>
                  <button 
                    type="button" 
                    className="alt-faq-question"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={openFaq === index}
                  >
                    <span>{item.q}</span>
                    <ChevronDown size={18} className="faq-chevron" />
                  </button>
                  {openFaq === index && (
                    <div className="alt-faq-answer">
                      <p>{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="alt-section alt-cta-section">
          <div className="alt-container">
            <div className="alt-cta-card">
              <ManiacLogo size="md" />
              <h2>Ready to Turn Chaos into a System?</h2>
              <p>Experience the freedom of sovereign, local-first computing today. No credit card, no sign-up forms.</p>
              <div className="alt-hero-cta">
                <Link to="/app" className="btn-alt-primary-lg">
                  Launch MANIAC Workspace <ArrowRight size={16} />
                </Link>
                <Link to="/templates" className="btn-alt-secondary-lg">
                  Explore Ready Templates
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="alt-footer">
        <div className="alt-container">
          <div className="alt-footer-content">
            <div className="alt-footer-brand">
              <ManiacLogo size="xs" />
              <span>MANIAC — Sovereign Local-First Workspace</span>
            </div>
            <div className="alt-footer-links">
              <Link to="/">Home</Link>
              <Link to="/templates">Templates</Link>
              <Link to="/app">Workspace</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
