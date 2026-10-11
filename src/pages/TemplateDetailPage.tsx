import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Download, 
  Copy, 
  Check, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  ChevronDown, 
  Clock, 
  BarChart, 
  Shield, 
  Zap, 
  ArrowLeft,
  Share2
} from 'lucide-react';
import ManiacLogo from '../components/Common/ManiacLogo';
import SEO from '../seo/SEO';
import { TEMPLATES, getTemplateById } from '../data/templatesData';
import { getTemplateDetailStructuredData } from '../seo/structuredData';
import { cloneSnapshotToWorkspace, compressSnapshot } from '../utils/shareUtils';
import './TemplateDetailPage.css';

export default function TemplateDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const template = getTemplateById(slug);

  const [cloning, setCloning] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  if (!template) {
    return (
      <div className="tpl-detail-notfound">
        <SEO 
          title="Template Not Found | MANIAC"
          description="The requested productivity template could not be found."
          robots="noindex, follow"
        />
        <div className="tpl-container tpl-notfound-container">
          <h1>Template Not Found</h1>
          <p className="tpl-notfound-desc">
            The template you are looking for does not exist or has been relocated.
          </p>
          <Link to="/templates" className="btn-detail-primary">
            Browse All Templates <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  const structuredData = getTemplateDetailStructuredData(template);
  const relatedTemplates = TEMPLATES.filter(t => t.id !== template.id).slice(0, 3);

  const handleClone = async () => {
    setCloning(true);
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
      alert('Failed to clone template into workspace. Please try again.');
      setCloning(false);
    }
  };

  const handleCopyShareLink = async () => {
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
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Copy link failed:', err);
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${template.id}-maniac-template.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="tpl-detail-page">
      <SEO 
        title={`${template.title} — Free Workspace Template | MANIAC`}
        description={template.metaDescription}
        canonical={`https://maniacc.vercel.app/templates/${template.id}`}
        structuredData={structuredData}
      />

      {/* Atmospheric Background */}
      <div className="tpl-detail-ambient" aria-hidden="true" />
      <div className="tpl-detail-grid" aria-hidden="true" />

      {/* Header */}
      <header className="tpl-detail-header">
        <div className="tpl-container">
          <nav className="tpl-detail-nav" aria-label="Main Navigation">
            <Link to="/" className="tpl-detail-brand">
              <ManiacLogo size="sm" />
              <span className="tpl-detail-brand-title">MANIAC</span>
            </Link>

            <div className="tpl-detail-nav-links">
              <Link to="/" className="tpl-detail-nav-link">Home</Link>
              <Link to="/notion-alternative" className="tpl-detail-nav-link">Notion Alternative</Link>
              <Link to="/obsidian-alternative" className="tpl-detail-nav-link">Obsidian Alternative</Link>
              <Link to="/templates" className="tpl-detail-nav-link active">Templates</Link>
            </div>

            <div className="tpl-detail-nav-actions">
              <button 
                type="button" 
                onClick={handleClone} 
                disabled={cloning}
                className="btn-detail-primary"
              >
                {cloning ? 'Cloning...' : 'Use Template'} <ArrowRight size={14} />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="tpl-detail-breadcrumb-bar">
        <div className="tpl-container">
          <nav aria-label="Breadcrumb" className="tpl-detail-breadcrumb">
            <Link to="/" className="tpl-breadcrumb-link">Home</Link>
            <span className="tpl-breadcrumb-sep">/</span>
            <Link to="/templates" className="tpl-breadcrumb-link">Templates</Link>
            <span className="tpl-breadcrumb-sep">/</span>
            <span className="tpl-breadcrumb-current">{template.title}</span>
          </nav>
        </div>
      </div>

      <main>
        {/* Template Hero */}
        <section className="tpl-detail-hero">
          <div className="tpl-container">
            <div className="tpl-hero-meta">
              <span className="tpl-category-badge">{template.category}</span>
              <div className="tpl-pill">
                <Clock size={12} />
                <span>{template.estimatedSetupMinutes} min setup</span>
              </div>
              <div className="tpl-pill">
                <BarChart size={12} />
                <span>{template.difficulty}</span>
              </div>
            </div>

            <div className="tpl-hero-header">
              <div className="tpl-hero-icon" aria-hidden="true">{template.icon}</div>
              <h1 className="tpl-hero-title">{template.title}</h1>
            </div>

            <p className="tpl-hero-summary">{template.summary}</p>

            <div className="tpl-hero-actions">
              <button 
                type="button" 
                onClick={handleClone} 
                disabled={cloning}
                className="btn-detail-primary-large"
              >
                <Sparkles size={16} />
                <span>{cloning ? 'Cloning to Workspace...' : 'Use This Template in MANIAC'}</span>
              </button>
              
              <button 
                type="button" 
                onClick={handleCopyShareLink}
                className="btn-detail-secondary"
              >
                {copiedLink ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Share URL'}</span>
              </button>

              <button 
                type="button" 
                onClick={handleExportJson}
                className="btn-detail-ghost"
                title="Download JSON Snapshot"
              >
                <Download size={16} />
                <span>Export JSON</span>
              </button>
            </div>

            <div className="tpl-trust-strip">
              <div className="tpl-trust-item">
                <CheckCircle2 size={14} className="tpl-trust-icon" />
                <span>100% Free &amp; Open Client</span>
              </div>
              <div className="tpl-trust-item">
                <CheckCircle2 size={14} className="tpl-trust-icon" />
                <span>Zero Account or Signup Required</span>
              </div>
              <div className="tpl-trust-item">
                <CheckCircle2 size={14} className="tpl-trust-icon" />
                <span>Stored in Browser IndexedDB</span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Block Preview */}
        <section className="tpl-detail-section">
          <div className="tpl-container">
            <div className="tpl-section-header">
              <h2 className="tpl-section-title">Interactive Template Preview</h2>
              <p className="tpl-section-subtitle">
                Inspect the modular blocks, formatting, and prompts included in this template.
              </p>
            </div>

            <div className="tpl-preview-canvas">
              <div className="tpl-preview-topbar">
                <div className="tpl-window-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <div className="tpl-preview-status">
                  <span>{template.icon} {template.title}</span>
                </div>
                <div className="tpl-preview-badge">
                  READ-ONLY PREVIEW
                </div>
              </div>

              <div className="tpl-preview-content">
                {template.blocks.map((block, idx) => (
                  <div key={idx} className={`tpl-block-item block-${block.type}`}>
                    {block.type === 'heading1' && (
                      <h2 className="preview-h1">{block.content}</h2>
                    )}
                    {block.type === 'heading2' && (
                      <h3 className="preview-h2">{block.content}</h3>
                    )}
                    {block.type === 'heading3' && (
                      <h4 className="preview-h3">{block.content}</h4>
                    )}
                    {block.type === 'callout' && (
                      <div className="preview-callout">
                        <span className="preview-callout-icon">{block.properties?.icon || '💡'}</span>
                        <div className="preview-callout-text">{block.content}</div>
                      </div>
                    )}
                    {block.type === 'toggle' && (
                      <details className="preview-toggle" open>
                        <summary className="preview-toggle-summary">{block.content}</summary>
                        <div className="preview-toggle-content">{block.properties?.details}</div>
                      </details>
                    )}
                    {block.type === 'todo' && (
                      <div className="preview-todo">
                        <input type="checkbox" checked={!!block.properties?.checked} readOnly className="preview-checkbox" />
                        <span className={block.properties?.checked ? 'todo-done' : ''}>{block.content}</span>
                      </div>
                    )}
                    {block.type === 'bullet' && (
                      <div className="preview-bullet">
                        <span className="bullet-dot">•</span>
                        <span dangerouslySetInnerHTML={{ __html: block.content }} />
                      </div>
                    )}
                    {block.type === 'quote' && (
                      <blockquote className="preview-quote">
                        "{block.content}"
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Guide & How-To Section */}
        <section className="tpl-detail-section tpl-detail-section-alt">
          <div className="tpl-container">
            <div className="tpl-guide-grid">
              <div>
                <h2 className="tpl-guide-title">Key Capabilities Included</h2>
                <ul className="tpl-feature-list">
                  {template.features.map((feat, idx) => (
                    <li key={idx} className="tpl-feature-item">
                      <CheckCircle2 size={16} className="tpl-feature-icon" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <h3 className="tpl-guide-subtitle tpl-guide-mt">Why Use MANIAC for this Workflow?</h3>
                <p className="tpl-guide-desc">
                  Traditional cloud tools store your personal habits, study decks, and sprint roadmaps on central servers subject to latency, paywalls, and privacy vulnerabilities.
                </p>
                <p className="tpl-guide-desc">
                  MANIAC executes completely client-side in your browser with IndexedDB persistence, 0ms boot times, full offline capability, and optional AES-256-GCM vault encryption.
                </p>
              </div>

              <div>
                <h2 className="tpl-guide-title">Step-by-Step Setup Guide</h2>
                <div className="tpl-steps-list">
                  {template.usageGuide.map((step, idx) => (
                    <div key={idx} className="tpl-step-item">
                      <div className="tpl-step-number">{idx + 1}</div>
                      <div className="tpl-step-text">{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Template FAQs */}
        {template.faqs && template.faqs.length > 0 && (
          <section className="tpl-detail-section">
            <div className="tpl-container">
              <div className="tpl-section-header">
                <h2 className="tpl-section-title">Frequently Asked Questions</h2>
                <p className="tpl-section-subtitle">
                  Common questions about configuring and practicing with this template.
                </p>
              </div>

              <div className="tpl-faq-list">
                {template.faqs.map((faq, index) => (
                  <div key={index} className="tpl-faq-item">
                    <button 
                      className="tpl-faq-trigger"
                      onClick={() => toggleFaq(index)}
                      aria-expanded={openFaq === index}
                    >
                      <span>{faq.q}</span>
                      <ChevronDown size={18} className={`tpl-chevron ${openFaq === index ? 'rotate' : ''}`} />
                    </button>
                    {openFaq === index && (
                      <div className="tpl-faq-answer">
                        <p>{faq.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Related Templates */}
        <section className="tpl-detail-section tpl-detail-section-alt">
          <div className="tpl-container">
            <div className="tpl-section-header">
              <h2 className="tpl-section-title">Explore Related Templates</h2>
              <p className="tpl-section-subtitle">
                Expand your sovereign digital operating system with complementary workspaces.
              </p>
            </div>

            <div className="tpl-related-grid">
              {relatedTemplates.map(rel => (
                <Link to={`/templates/${rel.id}`} key={rel.id} className="tpl-related-card">
                  <div className="tpl-related-icon">{rel.icon}</div>
                  <div className="tpl-related-cat">{rel.category}</div>
                  <h3 className="tpl-related-title">{rel.title}</h3>
                  <p className="tpl-related-desc">{rel.summary}</p>
                  <span className="tpl-related-cta">
                    View Template <ArrowRight size={13} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="tpl-bottom-cta">
          <div className="tpl-container">
            <div className="tpl-cta-card">
              <ManiacLogo size="lg" />
              <h2 className="tpl-cta-title">Turn Chaos into a System</h2>
              <p className="tpl-cta-text">
                Load "{template.title}" into your private workspace in seconds.
              </p>
              <button 
                type="button" 
                onClick={handleClone} 
                disabled={cloning}
                className="btn-detail-primary-large"
              >
                <Sparkles size={16} />
                <span>{cloning ? 'Opening Workspace...' : 'Use This Template Now'}</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Semantic Footer */}
      <footer className="tpl-detail-footer">
        <div className="tpl-container">
          <div className="tpl-footer-inner">
            <div className="tpl-footer-brand">
              <ManiacLogo size="xs" />
              <span className="tpl-footer-brand-title">MANIAC</span>
              <p className="tpl-footer-desc">
                Local-first workspace for notes, databases, and cognitive learning.
              </p>
            </div>

            <div className="tpl-footer-links">
              <div className="tpl-footer-col">
                <span className="tpl-footer-header">Templates</span>
                <Link to="/templates" className="tpl-footer-link">All Templates</Link>
                <Link to="/templates/active-recall-srs" className="tpl-footer-link">Active Recall Hub</Link>
                <Link to="/templates/para-method-second-brain" className="tpl-footer-link">PARA Second Brain</Link>
                <Link to="/templates/student-study-hub" className="tpl-footer-link">Student Study Hub</Link>
              </div>
              <div className="tpl-footer-col">
                <span className="tpl-footer-header">Alternatives</span>
                <Link to="/notion-alternative" className="tpl-footer-link">Notion Alternative</Link>
                <Link to="/obsidian-alternative" className="tpl-footer-link">Obsidian Alternative</Link>
                <Link to="/active-recall-notes" className="tpl-footer-link">Active Recall Notes</Link>
              </div>
              <div className="tpl-footer-col">
                <span className="tpl-footer-header">Workspace</span>
                <Link to="/app" className="tpl-footer-link">Launch App</Link>
                <Link to="/" className="tpl-footer-link">Home Overview</Link>
              </div>
            </div>
          </div>
          <div className="tpl-footer-bottom">
            <span>© {new Date().getFullYear()} MANIAC. All data stored strictly on your local device.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
