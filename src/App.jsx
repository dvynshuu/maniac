import React, { lazy, Suspense } from 'react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import ManiacLogo from './components/Common/ManiacLogo';

// Code-split routes
const LandingPage = lazy(() => import('./pages/LandingPage'));
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
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public SEO Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Private Workspace Application */}
        <Route path="/app/*" element={<WorkspaceApp />} />

        {/* Backwards-compatibility for legacy /page/:pageId URLs */}
        <Route path="/page/:pageId" element={<LegacyPageRedirect />} />

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
