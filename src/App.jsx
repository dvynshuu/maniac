import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { seedDefaultData } from './db/database';
import { usePageStore } from './stores/pageStore';
import { useTrackerStore } from './stores/trackerStore';
import { useUIStore } from './stores/uiStore';
import { useSecurityStore } from './stores/securityStore';
import { useIntelligenceStore } from './stores/intelligenceStore';
import { useCrossTabSync } from './hooks/useCrossTabSync';
import { undo, redo } from './core/commandBus';
import { startCompaction, stopCompaction } from './core/sortKeyCompaction';
import { terminateWorker } from './core/transformWorker';
import { persistenceWorker } from './core/commandBus';
import AppLayout from './components/Layout/AppLayout';
import CommandPalette from './components/CommandPalette/CommandPalette';
import UnlockScreen from './components/Layout/UnlockScreen';
import RestorePreviewModal from './components/Settings/RestorePreviewModal';
import NotionImportModal from './components/Settings/NotionImportModal';
import ToastContainer from './components/Common/ToastContainer';

// Register all command handlers on module load
import './core/commandHandlers';

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

  const isLocked = useSecurityStore(s => s.isLocked);
  const derivedKey = useSecurityStore(s => s.derivedKey);

  // Cross-tab sync
  useCrossTabSync();

  useEffect(() => {
    const init = async () => {
      await seedDefaultData();
      if (!isLocked) {
        await loadPages();
        await loadTrackers();
        await useIntelligenceStore.getState().analyze();
        // Start background performance services
        startCompaction();
      }
    };
    init();

    return () => {
      // Cleanup performance services on unmount
      stopCompaction();
      terminateWorker();
      persistenceWorker.postMessage({ type: 'FORCE_FLUSH' });
    };
  }, [isLocked]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useUIStore.getState().toggleCommandPalette();
      }
      // Command bus undo/redo (Ctrl+Z / Ctrl+Shift+Z)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        // Only intercept if not inside a TipTap editor
        const active = document.activeElement;
        const inEditor = active?.closest?.('.tiptap-editor');
        if (!inEditor) {
          e.preventDefault();
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        const active = document.activeElement;
        const inEditor = active?.closest?.('.tiptap-editor');
        if (!inEditor) {
          e.preventDefault();
          redo();
        }
      }
      if (e.key === 'Escape') {
        useUIStore.getState().closeCommandPalette();
        useUIStore.getState().closeContextMenu();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLocked) {
    return <UnlockScreen />;
  }

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
      <RestorePreviewModal />
      <NotionImportModal />
      <ToastContainer />
    </>
  );
}

export default App;
