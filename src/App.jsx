import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { seedDefaultData } from './db/database';
import { usePageStore } from './stores/pageStore';
import { useTrackerStore } from './stores/trackerStore';
import { useUIStore } from './stores/uiStore';
import AppLayout from './components/Layout/AppLayout';
import PageEditor from './components/Editor/PageEditor';
import CommandPalette from './components/CommandPalette/CommandPalette';

import Dashboard from './components/Dashboard/Dashboard';
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
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/page/:pageId" element={<PageEditor />} />
        </Routes>
      </AppLayout>
      {commandPaletteOpen && <CommandPalette onClose={closeCommandPalette} />}
    </>
  );
}

export default App;
