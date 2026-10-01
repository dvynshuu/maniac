import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Download, 
  Copy, 
  Check, 
  ArrowRight, 
  Sparkles,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import ManiacLogo from '../components/Common/ManiacLogo';
import SEO from '../seo/SEO';
import { TEMPLATES, TEMPLATE_CATEGORIES } from '../data/templatesData';
import { getTemplatesCollectionStructuredData } from '../seo/structuredData';
import { cloneSnapshotToWorkspace, compressSnapshot } from '../utils/shareUtils';
import './TemplateGallery.css';

export default function TemplateGallery() {
  const navigate = useNavigate();
  const [cloningId, setCloningId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');

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

  const structuredData = getTemplatesCollectionStructuredData(TEMPLATES);

  return (
    <div className="tpl-page">
      <SEO 
        title="Free Local-First Productivity & Active Recall Templates | MANIAC"
        description="Browse free, 1-click cloneable templates for MANIAC: Active Recall flashcards, PARA method second brain, sprint trackers, student hubs, and habit logs."
        canonical="https://maniacc.vercel.app/templates"
        structuredData={structuredData}
      />

      {/* Atmospheric Glow */}
      <div className="tpl-ambient-glow" aria-hidden="true" />
      <div className="tpl-grid-bg" aria-hidden="true" />

      {/* Navigation */}
      <header className="tpl-header">
        <div className="tpl-container">
          <nav className="tpl-nav" aria-label="Main Navigation">
            <Link to="/" className="tpl-brand" aria-label="MANIAC Homepage">
              <ManiacLogo size="sm" />
              <span className="tpl-brand-title">MANIAC</span>
            </Link>

            <div className="tpl-nav-links">
              <Link to="/" className="tpl-nav-link">Home</Link>
              <Link to="/notion-alternative" className="tpl-nav-link">Notion Alternative</Link>
              <Link to="/obsidian-alternative" className="tpl-nav-link">Obsidian Alternative</Link>
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

      {/* Breadcrumb Strip */}
      <div className="tpl-breadcrumb-bar">
        <div className="tpl-container">
          <nav aria-label="Breadcrumb" className="tpl-breadcrumb-nav">
            <Link to="/" className="tpl-breadcrumb-link">Home</Link>
            <span className="tpl-breadcrumb-sep">/</span>
            <span className="tpl-breadcrumb-current">Templates</span>
          </nav>
        </div>
      </div>

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
              {TEMPLATE_CATEGORIES.map(cat => (
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
                    <span className="tpl-icon" aria-hidden="true">{template.icon}</span>
                    <span className="tpl-category-tag">{template.category}</span>
                  </div>

                  <h2 className="tpl-card-title">
                    <Link to={`/templates/${template.id}`}>
                      {template.title}
                    </Link>
                  </h2>
                  <p className="tpl-card-desc">{template.summary}</p>

                  <div className="tpl-card-blocks-preview">
                    <span className="preview-label">Contains:</span>
                    <span className="preview-pill">{template.blocks.length} modular blocks</span>
                    <span className="preview-pill">{template.difficulty}</span>
                  </div>

                  {/* Direct Link to Guide & Details */}
                  <Link 
                    to={`/templates/${template.id}`} 
                    className="tpl-card-guide-link"
                  >
                    <span>View Template Guide &amp; Preview</span>
                    <ArrowRight size={13} />
                  </Link>

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
              <div className="tpl-footer-logo-row">
                <ManiacLogo size="xs" />
                <span className="tpl-footer-brand-title">MANIAC</span>
              </div>
              <p className="tpl-footer-desc">
                Turn chaos into a system with local-first modular knowledge workspaces.
              </p>
            </div>
            <div className="tpl-footer-links">
              <div className="tpl-footer-col">
                <span className="tpl-footer-col-title">Navigation</span>
                <Link to="/" className="tpl-footer-link">Home</Link>
                <Link to="/notion-alternative" className="tpl-footer-link">Notion Alternative</Link>
                <Link to="/obsidian-alternative" className="tpl-footer-link">Obsidian Alternative</Link>
                <Link to="/active-recall-notes" className="tpl-footer-link">Active Recall Notes</Link>
              </div>
              <div className="tpl-footer-col">
                <span className="tpl-footer-col-title">Top Templates</span>
                <Link to="/templates/active-recall-srs" className="tpl-footer-link">Active Recall Hub</Link>
                <Link to="/templates/para-method-second-brain" className="tpl-footer-link">PARA Second Brain</Link>
                <Link to="/templates/engineering-roadmap" className="tpl-footer-link">Engineering Roadmap</Link>
                <Link to="/templates/student-study-hub" className="tpl-footer-link">Student Study Hub</Link>
              </div>
              <div className="tpl-footer-col">
                <span className="tpl-footer-col-title">Workspace</span>
                <Link to="/app" className="tpl-footer-link">Launch App</Link>
              </div>
            </div>
          </div>
          <div className="tpl-footer-bottom">
            © {new Date().getFullYear()} MANIAC. All data stored strictly on your local device.
          </div>
        </div>
      </footer>
    </div>
  );
}
