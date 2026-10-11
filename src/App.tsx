import React, { lazy, Suspense } from 'react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import ManiacLogo from './components/Common/ManiacLogo';

// Code-split routes
const LandingPage = lazy(() => import('./pages/LandingPage'));
const NotionAlternative = lazy(() => import('./pages/NotionAlternative'));
const ObsidianAlternative = lazy(() => import('./pages/ObsidianAlternative'));
const ActiveRecallNotes = lazy(() => import('./pages/ActiveRecallNotes'));
const TemplateGallery = lazy(() => import('./pages/TemplateGallery'));
const TemplateDetailPage = lazy(() => import('./pages/TemplateDetailPage'));
const SharedPagePreview = lazy(() => import('./pages/SharedPagePreview'));
const WorkspaceApp = lazy(() => import('./components/Layout/WorkspaceApp'));
const NotFound = lazy(() => import('./pages/NotFound'));

function RouteLoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#050508',
      color: '#ffffff',
      gap: '16px'
    }}>
      <ManiacLogo size="md" animate />
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.45)',
        letterSpacing: '0.05em'
      }}>
        INITIALIZING MANIAC...
      </div>
    </div>
  );
}

function LegacyPageRedirect() {
  const { pageId } = useParams();
  return <Navigate to={`/app/page/${pageId}`} replace />;
}

export default function App() {
  return (
    <>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* Public SEO Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Dedicated Programmatic SEO Pages */}
          <Route path="/notion-alternative" element={<NotionAlternative />} />
          <Route path="/obsidian-alternative" element={<ObsidianAlternative />} />
          <Route path="/active-recall-notes" element={<ActiveRecallNotes />} />
          <Route path="/templates" element={<TemplateGallery />} />
          <Route path="/templates/:slug" element={<TemplateDetailPage />} />

          {/* Viral Snapshot / Share Preview */}
          <Route path="/share" element={<SharedPagePreview />} />

          {/* Private Workspace Application */}
          <Route path="/app/*" element={<WorkspaceApp />} />

          {/* Backwards-compatibility for legacy /page/:pageId URLs */}
          <Route path="/page/:pageId" element={<LegacyPageRedirect />} />

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
