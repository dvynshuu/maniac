import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { seedDefaultData } from '../../db/database';
import { usePageStore } from '../../stores/pageStore';
import { useTrackerStore } from '../../stores/trackerStore';
import { useUIStore } from '../../stores/uiStore';
import { useSecurityStore } from '../../stores/securityStore';
import { useIntelligenceStore } from '../../stores/intelligenceStore';
import { useBacklinkStore } from '../../stores/backlinkStore';
import { useCrossTabSync } from '../../hooks/useCrossTabSync';
import { undo, redo } from '../../core/commandBus';
import { startCompaction, stopCompaction } from '../../core/sortKeyCompaction';
import { terminateWorker } from '../../core/transformWorker';
import { persistenceWorker } from '../../core/commandBus';
import AppLayout from './AppLayout';
import CommandPalette from '../CommandPalette/CommandPalette';
import ManiacLogo from '../Common/ManiacLogo';
import UnlockScreen from './UnlockScreen';
import RestorePreviewModal from '../Settings/RestorePreviewModal';
import NotionImportModal from '../Settings/NotionImportModal';
import { useSettingsStore } from '../../stores/settingsStore';
import ToastContainer from '../Common/ToastContainer';
import SEO from '../../seo/SEO';
import { SITE_URL } from '../../seo/constants';

// Register all command handlers on module load
import '../../core/commandHandlers';

// Lazy load heavy components
const PageEditor = lazy(() => import('../Editor/PageEditor'));
const Dashboard = lazy(() => import('../Dashboard/Dashboard'));

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '40px 64px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
        <ManiacLogo size="sm" animate />
        <div className="skeleton" style={{ width: '120px', height: '18px' }} />
      </div>
      <div className="skeleton skeleton-title" style={{ width: '40%', height: '36px', marginBottom: '24px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="skeleton skeleton-text" style={{ width: '90%' }} />
        <div className="skeleton skeleton-text" style={{ width: '75%' }} />
        <div className="skeleton skeleton-text" style={{ width: '85%' }} />
        <div className="skeleton skeleton-text" style={{ width: '60%' }} />
      </div>
    </div>
  );
}

export default function WorkspaceApp() {
  const loadPages = usePageStore((s) => s.loadPages);
  const loadTrackers = useTrackerStore((s) => s.loadTrackers);
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen);
  const closeCommandPalette = useUIStore((s) => s.closeCommandPalette);

  const isLocked = useSecurityStore(s => s.isLocked);

  // Settings
  const theme = useSettingsStore(s => s.theme);
  const fontFamily = useSettingsStore(s => s.fontFamily);
  const fontSize = useSettingsStore(s => s.fontSize);
  const accentColor = useSettingsStore(s => s.accentColor);

  useEffect(() => {
    const applyTheme = (t) => {
      let activeTheme = t;
      if (t === 'system') {
        activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', activeTheme);
      document.documentElement.style.colorScheme = activeTheme;
    };

    applyTheme(theme);

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e) => {
        const active = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', active);
        document.documentElement.style.colorScheme = active;
      };
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-sans',
      fontFamily === 'JetBrains Mono' ? "var(--font-mono)" :
      fontFamily === 'System' ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" :
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    );
  }, [fontFamily]);

  useEffect(() => {
    const sizes = { compact: '14px', default: '16px', comfortable: '18px' };
    document.documentElement.style.fontSize = sizes[fontSize] || '16px';
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', accentColor);
  }, [accentColor]);

  // Cross-tab sync
  useCrossTabSync();

  useEffect(() => {
    const init = async () => {
      await seedDefaultData();
      if (!isLocked) {
        await loadPages();
        await loadTrackers();
        await useBacklinkStore.getState().rebuildIndex();
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
    return (
      <>
        <SEO
          title="MANIAC Workspace — Unlock"
          description="Enter master key to unlock MANIAC local-first workspace."
          robots="noindex, nofollow"
          canonical={`${SITE_URL}/app`}
        />
        <UnlockScreen />
      </>
    );
  }

  return (
    <>
      <SEO
        title="MANIAC Workspace"
        description="Local-first knowledge, notes, and productivity workspace."
        robots="noindex, nofollow"
        canonical={`${SITE_URL}/app`}
      />
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
