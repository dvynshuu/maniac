import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, ArrowRight, LayoutTemplate, Sparkles, Brain, FileText } from 'lucide-react';
import ManiacLogo from '../components/Common/ManiacLogo';
import SEO from '../seo/SEO';
import { SITE_URL } from '../seo/constants';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found-page">
      <SEO
        title="404 — Page Not Found | MANIAC"
        description="The requested page could not be located in this workspace vault."
        canonical={`${SITE_URL}/404`}
        robots="noindex, nofollow"
      />

      {/* Atmospheric Ambient Glows & Grid */}
      <div className="not-found-ambient" aria-hidden="true" />
      <div className="not-found-grid" aria-hidden="true" />

      <main className="not-found-card">
        <div className="not-found-logo-box">
          <ManiacLogo size="lg" animate />
        </div>

        <div className="not-found-badge">
          <span className="not-found-badge-dot" />
          <span>404 ERROR • NODE UNREACHABLE</span>
        </div>

        <h1 className="not-found-title">
          Page Not Found
        </h1>

        <p className="not-found-text">
          The node or document you are attempting to reach does not exist in this workspace. It may have been relocated, renamed, or deleted.
        </p>

        <div className="not-found-actions">
          <Link to="/" className="btn-nf-secondary">
            <ArrowLeft size={15} />
            <span>Return Home</span>
          </Link>

          <Link to="/app" className="btn-nf-primary">
            <span>Open Workspace</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Directory Shortcuts */}
        <div className="not-found-directory">
          <span className="not-found-dir-label">Explore Sovereignty Workspaces</span>
          <div className="not-found-dir-links">
            <Link to="/templates" className="not-found-dir-pill">
              <LayoutTemplate size={13} />
              <span>Templates</span>
            </Link>
            <Link to="/notion-alternative" className="not-found-dir-pill">
              <FileText size={13} />
              <span>Notion Alternative</span>
            </Link>
            <Link to="/obsidian-alternative" className="not-found-dir-pill">
              <Sparkles size={13} />
              <span>Obsidian Alternative</span>
            </Link>
            <Link to="/active-recall-notes" className="not-found-dir-pill">
              <Brain size={13} />
              <span>Active Recall Notes</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
