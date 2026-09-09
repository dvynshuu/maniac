import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Download, 
  ArrowRight, 
  Sparkles, 
  Check, 
  Copy, 
  ExternalLink,
  Shield,
  Zap,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import ManiacLogo from '../components/Common/ManiacLogo';
import SEO from '../seo/SEO';
import { decompressSnapshot, cloneSnapshotToWorkspace } from '../utils/shareUtils';
import './SharedPagePreview.css';

export default function SharedPagePreview() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cloning, setCloning] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function loadSnapshot() {
      setLoading(true);
      setError(null);

      // Check URL hash (#data=...) or query param (?data=...)
      let dataStr = '';
      const hash = window.location.hash;
      if (hash.startsWith('#data=')) {
        dataStr = hash.slice(6);
      } else {
        const searchParams = new URLSearchParams(window.location.search);
        dataStr = searchParams.get('data') || '';
      }

      if (!dataStr) {
        setError('No snapshot data found in URL. Please verify the shared link.');
        setLoading(false);
        return;
      }

      try {
        const data = await decompressSnapshot(dataStr);
        if (!data || !data.title) {
          throw new Error('Snapshot content could not be read or is invalid.');
        }
        setSnapshot(data);
      } catch (err) {
        setError('Failed to decompress shared document. The link may be incomplete or corrupted.');
      } finally {
        setLoading(false);
      }
    }

    loadSnapshot();
  }, []);

  const handleClone = async () => {
    if (!snapshot || cloning) return;
    setCloning(true);
    try {
      const clonedPage = await cloneSnapshotToWorkspace(snapshot);
      navigate(`/app/page/${clonedPage.id}`);
    } catch (err) {
      console.error('Clone failed:', err);
      alert('Failed to clone snapshot to your local workspace. Please try again.');
      setCloning(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="shared-page-container">
      <SEO 
        title={snapshot ? `${snapshot.title} — Shared via MANIAC` : 'Shared Document — MANIAC'}
        description={snapshot ? `Read and clone "${snapshot.title}" into your private, local-first MANIAC workspace.` : 'View shared documents and templates in MANIAC.'}
        canonical="https://maniacc.vercel.app/share"
      />

      {/* Top Floating Viral Bar */}
      <header className="shared-viral-banner">
        <div className="shared-banner-content">
          <div className="shared-brand-meta">
            <Link to="/" className="shared-brand-link" title="MANIAC Home">
              <ManiacLogo size="xs" />
              <span className="shared-brand-text">MANIAC</span>
            </Link>
            <span className="shared-badge">Read-Only Preview</span>
          </div>

          <div className="shared-banner-actions">
            <button 
              type="button" 
              onClick={handleCopyLink} 
              className="btn-share-secondary"
              title="Copy shareable link"
            >
              {copiedLink ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
            </button>

            {snapshot && (
              <button 
                type="button" 
                onClick={handleClone} 
                className="btn-share-primary"
                disabled={cloning}
              >
                <Download size={14} />
                <span>{cloning ? 'Cloning to Vault...' : 'Clone to My Workspace'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Document Body */}
      <main className="shared-main-canvas">
        {loading && (
          <div className="shared-loading-state">
            <ManiacLogo size="sm" animate />
            <p>Decompressing document from URL...</p>
          </div>
        )}

        {!loading && error && (
          <div className="shared-error-card">
            <AlertCircle size={32} className="error-icon" />
            <h2>Document Unavailable</h2>
            <p>{error}</p>
            <div className="error-actions">
              <Link to="/app" className="btn-share-primary">
                Open Your Workspace <ArrowRight size={14} />
              </Link>
              <Link to="/" className="btn-share-secondary">
                Learn About MANIAC
              </Link>
            </div>
          </div>
        )}

        {!loading && snapshot && (
          <article className="shared-doc-card">
            {/* Cover image if available */}
            {snapshot.coverImage && (
              <div className="shared-doc-cover">
                <img src={snapshot.coverImage} alt="Document Cover" />
              </div>
            )}

            <div className="shared-doc-inner">
              {/* Icon & Title */}
              <div className="shared-doc-header">
                {snapshot.icon && <div className="shared-doc-icon">{snapshot.icon}</div>}
                <h1 className="shared-doc-title">{snapshot.title}</h1>
                <div className="shared-doc-meta">
                  <span>{snapshot.blocks?.length || 0} blocks</span>
                  <span>•</span>
                  <span>100% Client-Side Snapshot</span>
                </div>
              </div>

              {/* Blocks */}
              <div className="shared-blocks-list">
                {snapshot.blocks?.map((block, i) => (
                  <SharedBlockItem key={block.id || i} block={block} />
                ))}
              </div>
            </div>
          </article>
        )}

        {/* Viral Bottom Footer Callout */}
        <section className="shared-bottom-pitch">
          <div className="pitch-icon-box">
            <Zap size={22} />
          </div>
          <div className="pitch-copy">
            <h3>Turn chaos into a system.</h3>
            <p>
              MANIAC is a local-first workspace for notes, databases, active recall, and sovereign personal computing. 
              No cloud accounts required, zero server latency, AES-256 encrypted.
            </p>
          </div>
          <div className="pitch-cta">
            <Link to="/app" className="btn-pitch-launch">
              <span>Start Free Workspace</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function SharedBlockItem({ block }) {
  const content = block.content || '';
  const type = block.type || 'text';

  switch (type) {
    case 'heading1':
      return <h2 className="sb-h1" dangerouslySetInnerHTML={{ __html: content }} />;
    case 'heading2':
      return <h3 className="sb-h2" dangerouslySetInnerHTML={{ __html: content }} />;
    case 'heading3':
      return <h4 className="sb-h3" dangerouslySetInnerHTML={{ __html: content }} />;
    case 'bullet':
      return (
        <div className="sb-bullet">
          <span className="sb-dot">•</span>
          <span dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      );
    case 'numbered':
      return (
        <div className="sb-numbered">
          <span className="sb-number">1.</span>
          <span dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      );
    case 'todo':
      return (
        <div className="sb-todo">
          <input type="checkbox" checked={!!block.properties?.checked} readOnly />
          <span className={block.properties?.checked ? 'sb-done' : ''} dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      );
    case 'quote':
      return <blockquote className="sb-quote" dangerouslySetInnerHTML={{ __html: content }} />;
    case 'code':
      return (
        <pre className="sb-code">
          <code>{content.replace(/<[^>]*>/g, '')}</code>
        </pre>
      );
    case 'callout':
      return (
        <div className="sb-callout">
          <span className="sb-callout-icon">{block.properties?.icon || '💡'}</span>
          <div className="sb-callout-text" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      );
    case 'divider':
      return <hr className="sb-divider" />;
    default:
      return <p className="sb-text" dangerouslySetInnerHTML={{ __html: content || '&nbsp;' }} />;
  }
}
