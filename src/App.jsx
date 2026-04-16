import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { seedDefaultData } from './db/database';
import { usePageStore } from './stores/pageStore';
import { useTrackerStore } from './stores/trackerStore';
import { useUIStore } from './stores/uiStore';
import AppLayout from './components/Layout/AppLayout';
import CommandPalette from './components/CommandPalette/CommandPalette';

// Lazy load heavy components
const PageEditor = lazy(() => import('./components/Editor/PageEditor'));
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div className="loading-spinner" />
        <span style={{ fontSize: '13px' }}>Loading...</span>
      </div>
    </div>
  );
}

function App() {
  const loadPages = usePageStore((s) => s.loadPages);
  const loadTrackers = useTrackerStore((s) => s.loadTrackers);
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen);
  const closeCommandPalette = useUIStore((s) => s.closeCommandPalette);

  useEffect(() => {
    const init = async () => {
      await seedDefaultData();
      await loadPages();
      await loadTrackers();
    };
    init();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useUIStore.getState().toggleCommandPalette();
      }
      if (e.key === 'Escape') {
        useUIStore.getState().closeCommandPalette();
        useUIStore.getState().closeContextMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <AppLayout>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/page/:pageId" element={<PageEditor />} />
          </Routes>
        </Suspense>
      </AppLayout>
      {commandPaletteOpen && <CommandPalette onClose={closeCommandPalette} />}
    </>
  );
}

export default App;
