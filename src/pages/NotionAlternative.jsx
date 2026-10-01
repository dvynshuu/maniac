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
import { getNotionAltStructuredData } from '../seo/structuredData';
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

  const structuredData = getNotionAltStructuredData(faqData);

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
          <nav className="alt-nav" aria-label="Main Navigation">
            <Link to="/" className="alt-brand" aria-label="MANIAC Homepage">
              <ManiacLogo size="sm" />
              <span className="alt-brand-title">MANIAC</span>
            </Link>

            <div className="alt-nav-links">
              <Link to="/" className="alt-nav-link">Home</Link>
              <Link to="/obsidian-alternative" className="alt-nav-link">Obsidian Alternative</Link>
              <Link to="/active-recall-notes" className="alt-nav-link">Active Recall</Link>
              <Link to="/templates" className="alt-nav-link">Templates</Link>
            </div>

            <div className="alt-nav-actions">
              <Link to="/app" className="btn-alt-primary">
                Launch Workspace <ArrowRight size={14} />
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="alt-breadcrumb-bar">
        <div className="alt-container">
          <nav aria-label="Breadcrumb" className="alt-breadcrumb-nav">
            <Link to="/" className="alt-breadcrumb-link">Home</Link>
            <span className="alt-breadcrumb-sep">/</span>
            <span className="alt-breadcrumb-current">Notion Alternative</span>
          </nav>
        </div>
      </div>

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

            <div className="alt-hero-stats">
              <div className="alt-stat">
                <span className="stat-val">0ms</span>
                <span className="stat-lbl">Cloud Latency</span>
              </div>
              <div className="alt-stat-divider" />
              <div className="alt-stat">
                <span className="stat-val">100%</span>
                <span className="stat-lbl">Offline Accessible</span>
              </div>
              <div className="alt-stat-divider" />
              <div className="alt-stat">
                <span className="stat-val">AES-256</span>
                <span className="stat-lbl">Vault Encryption</span>
              </div>
              <div className="alt-stat-divider" />
              <div className="alt-stat">
                <span className="stat-val">Free</span>
                <span className="stat-lbl">Zero Paywalls</span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Comparison Matrix */}
        <section id="comparison" className="alt-section">
          <div className="alt-container">
            <div className="alt-section-head">
              <h2>Detailed Feature Comparison</h2>
              <p>See how MANIAC compares directly to Notion across performance, sovereignty, and productivity.</p>
            </div>

            <div className="alt-table-container">
              <table className="alt-table">
                <thead>
                  <tr>
                    <th>Capability</th>
                    <th className="highlight-col">MANIAC (Local-First)</th>
                    <th>Notion (Cloud-Centric)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Data Storage Location</strong></td>
                    <td className="highlight-col"><span className="feature-check"><Check size={16} /> Client-Side IndexedDB</span></td>
                    <td><span className="feature-cross"><X size={16} /> Proprietary Cloud Servers</span></td>
                  </tr>
                  <tr>
                    <td><strong>Offline Functionality</strong></td>
                    <td className="highlight-col"><span className="feature-check"><Check size={16} /> Complete &amp; Native 0ms</span></td>
                    <td><span className="feature-cross"><X size={16} /> Highly Limited / Read Only</span></td>
                  </tr>
                  <tr>
                    <td><strong>Data Encryption</strong></td>
                    <td className="highlight-col"><span className="feature-check"><Check size={16} /> Hardware AES-256-GCM Vault</span></td>
                    <td><span className="feature-cross"><X size={16} /> Unencrypted at Rest from Notion Staff</span></td>
                  </tr>
                  <tr>
                    <td><strong>Relational Databases</strong></td>
                    <td className="highlight-col"><span className="feature-check"><Check size={16} /> Tables, Boards, Calendars</span></td>
                    <td><span className="feature-check"><Check size={16} /> Full Database Suite</span></td>
                  </tr>
                  <tr>
                    <td><strong>Active Recall &amp; SRS</strong></td>
                    <td className="highlight-col"><span className="feature-check"><Check size={16} /> Built-in Leitner Algorithm</span></td>
                    <td><span className="feature-cross"><X size={16} /> Not Supported Natively</span></td>
                  </tr>
                  <tr>
                    <td><strong>Notion ZIP Importer</strong></td>
                    <td className="highlight-col"><span className="feature-check"><Check size={16} /> In-Browser Extraction</span></td>
                    <td><span className="feature-cross"><X size={16} /> N/A</span></td>
                  </tr>
                  <tr>
                    <td><strong>Pricing &amp; Account</strong></td>
                    <td className="highlight-col"><span className="feature-check"><Check size={16} /> 100% Free, No Sign-up</span></td>
                    <td><span className="feature-cross"><X size={16} /> Mandatory Account &amp; Paid Plans</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Why Make the Switch */}
        <section className="alt-section alt-reasons-section">
          <div className="alt-container">
            <div className="alt-section-head">
              <h2>Why Discerning Knowledge Workers Switch</h2>
              <p>Designed from first principles to overcome the fundamental flaws of cloud-only workspaces.</p>
            </div>

            <div className="alt-reasons-grid">
              <div className="alt-reason-card">
                <div className="reason-icon-wrap ember">
                  <Zap size={22} />
                </div>
                <h3>Zero Latency Architecture</h3>
                <p>Notion requires constant network roundtrips to fetch pages and save edits. MANIAC writes synchronously to browser IndexedDB, eliminating all loading spinners and typing delays.</p>
              </div>

              <div className="alt-reason-card">
                <div className="reason-icon-wrap blue">
                  <Shield size={22} />
                </div>
                <h3>Sovereign Privacy</h3>
                <p>Cloud tools expose your private thoughts to data breaches, AI training pipelines, and employee inspection. MANIAC keeps your notes strictly on your device with hardware AES-256 encryption.</p>
              </div>

              <div className="alt-reason-card">
                <div className="reason-icon-wrap emerald">
                  <Brain size={22} />
                </div>
                <h3>Active Recall Integration</h3>
                <p>Stop merely collecting notes. MANIAC transforms any toggle block into an active recall flashcard, using spaced repetition to guarantee permanent knowledge retention.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="alt-section">
          <div className="alt-container">
            <div className="alt-section-head">
              <h2>Frequently Asked Questions</h2>
              <p>Everything you need to know about migrating from Notion to MANIAC.</p>
            </div>

            <div className="alt-faq-grid">
              {faqData.map((item, index) => (
                <div key={index} className={`alt-faq-item ${openFaq === index ? 'active' : ''}`}>
                  <button 
                    type="button" 
                    className="alt-faq-question"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={openFaq === index}
                  >
                    <span>{item.q}</span>
                    <ChevronDown size={18} className={`faq-chevron ${openFaq === index ? 'rotate' : ''}`} />
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
              <div className="alt-footer-brand-header">
                <ManiacLogo size="xs" />
                <span className="alt-footer-brand-title">MANIAC</span>
              </div>
              <p className="alt-footer-desc">Sovereign Local-First Workspace</p>
            </div>
            <div className="alt-footer-links">
              <Link to="/" className="alt-footer-link">Home</Link>
              <Link to="/obsidian-alternative" className="alt-footer-link">Obsidian Alternative</Link>
              <Link to="/active-recall-notes" className="alt-footer-link">Active Recall</Link>
              <Link to="/templates" className="alt-footer-link">Templates</Link>
              <Link to="/app" className="alt-footer-link">Workspace</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
