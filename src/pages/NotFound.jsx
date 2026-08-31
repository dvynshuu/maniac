import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import ManiacLogo from '../components/Common/ManiacLogo';
import SEO from '../seo/SEO';
import { SITE_URL } from '../seo/constants';

export default function NotFound() {
  return (
    <div className="not-found-page" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#050508',
      color: '#ffffff',
      padding: '24px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <SEO
        title="404 — Page Not Found | MANIAC"
        description="The requested page could not be located in this workspace vault."
        canonical={`${SITE_URL}/404`}
        robots="noindex, nofollow"
      />

      {/* Subtle background glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(249, 115, 22, 0.04) 50%, transparent 70%)',
        pointerEvents: 'none',
        borderRadius: '50%'
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <ManiacLogo size="lg" animate />
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 14px',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '12px',
          fontWeight: 600,
          color: '#94a3b8',
          marginBottom: '20px'
        }}>
          <Compass size={14} style={{ color: '#f97316' }} />
          <span>404 ERROR • NODE UNREACHABLE</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 2.75rem)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
          marginBottom: '16px',
          background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Page Not Found
        </h1>

        <p style={{
          fontSize: '15px',
          lineHeight: 1.6,
          color: 'rgba(255, 255, 255, 0.65)',
          marginBottom: '32px'
        }}>
          The node or route you are attempting to reach does not exist in this workspace. It may have been moved, renamed, or deleted.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <ArrowLeft size={16} /> Return to Homepage
          </Link>

          <Link
            to="/app"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.25)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            Open Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
