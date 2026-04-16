import { useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { useUIStore } from '../../stores/uiStore';
import { buildPageTree } from '../../utils/helpers';
import SidebarPageItem from './SidebarPageItem';
import { PanelLeftClose, PanelLeft, Plus, Settings, Download, Upload, Clock, Star, Home, Search } from 'lucide-react';
import { db } from '../../db/database';

function Sidebar() {
  const pages = usePageStore((s) => s.pages);
  const addPage = usePageStore((s) => s.addPage);
  const setCurrentPage = usePageStore((s) => s.setCurrentPage);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const navigate = useNavigate();
  const location = useLocation();
  const importInputRef = useRef(null);

  // Memoize expensive page tree build
  const activePages = useMemo(() => pages.filter((p) => !p.isArchived), [pages]);
  const pageTree = useMemo(() => buildPageTree(activePages), [activePages]);
  const favoritePages = useMemo(() => pages.filter(p => p.isFavorite), [pages]);
  const recentPages = useMemo(() => 
    [...pages].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5), 
    [pages]
  );

  const handleNewPage = async () => {
    const page = await addPage();
    setCurrentPage(page.id);
    navigate(`/page/${page.id}`);
  };

  const handleExport = async () => {
    const allPages = await db.pages.toArray();
    const blocks = await db.blocks.toArray();
    const trackers = await db.trackers.toArray();
    const entries = await db.tracker_entries.toArray();

    const data = { pages: allPages, blocks, trackers, entries };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maniac-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.pages) await db.pages.bulkPut(data.pages);
      if (data.blocks) await db.blocks.bulkPut(data.blocks);
      if (data.trackers) await db.trackers.bulkPut(data.trackers);
      if (data.entries) await db.tracker_entries.bulkPut(data.entries);
      
      // Reload everything
      await usePageStore.getState().loadPages();
      alert('Import successful!');
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
    e.target.value = '';
  };

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-header" style={{ padding: '24px 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
              M
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>The Monolith</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>LOCAL-FIRST SYNC ACTIVE</div>
            </div>
            <button className="sidebar-toggle" onClick={toggleSidebar}>
              <PanelLeftClose size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: '0 16px 8px' }}>
          <button className="new-page-btn" onClick={handleNewPage}>
            <Plus size={16} />
            <span>New Page</span>
          </button>
        </div>

        {/* Search shortcut */}
        <div style={{ padding: '0 12px 8px' }}>
          <button className="sidebar-search-btn" onClick={() => useUIStore.getState().openCommandPalette()}>
            <Search size={14} />
            <span>Search...</span>
            <span className="sidebar-search-kbd">⌘K</span>
          </button>
        </div>

        <div className="sidebar-nav" style={{ padding: '0 12px' }}>
          <div className="sidebar-section-label" style={{ marginTop: 8 }}>WORKSPACE</div>
          
          <div 
            className={`sidebar-page-item ${location.pathname === '/' ? 'active' : ''}`} 
            style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: location.pathname === '/' ? 'var(--text-primary)' : 'var(--text-secondary)', background: location.pathname === '/' ? 'var(--bg-active)' : 'transparent', marginBottom: 2 }}
            onClick={() => navigate('/')}
          >
            <Home size={16} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Dashboard</span>
          </div>

          {/* Favorites Section */}
          {favoritePages.length > 0 && (
            <>
              <div className="sidebar-section-label" style={{ marginTop: 16 }}>FAVORITES</div>
              {favoritePages.map(page => (
                <div 
                  key={page.id}
                  className={`sidebar-page-item ${location.pathname === `/page/${page.id}` ? 'active' : ''}`}
                  style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', marginBottom: 2 }}
                  onClick={() => { setCurrentPage(page.id); navigate(`/page/${page.id}`); }}
                >
                  <Star size={14} style={{ color: 'var(--warning)', fill: 'var(--warning)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.title || 'Untitled'}</span>
                </div>
              ))}
            </>
          )}

          {pageTree.length > 0 && (
            <>
              <div className="sidebar-section-label" style={{ marginTop: 16 }}>YOUR PAGES</div>
              {pageTree.map((page) => (
                <SidebarPageItem key={page.id} page={page} depth={0} />
              ))}
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={14} />
                <span>All data stored locally</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                  className="btn btn-icon" 
                  onClick={() => importInputRef.current?.click()} 
                  title="Import Data from JSON"
                  style={{ width: '24px', height: '24px' }}
              >
                  <Upload size={12} />
              </button>
              <button 
                  className="btn btn-icon" 
                  onClick={handleExport} 
                  title="Export Data as JSON"
                  style={{ width: '24px', height: '24px' }}
              >
                  <Download size={12} />
              </button>
            </div>
          </div>
          <input ref={importInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </aside>

      {!sidebarOpen && (
        <button
          className="topbar-toggle"
          onClick={toggleSidebar}
          style={{ position: 'fixed', top: 12, left: 12, zIndex: 30 }}
          title="Open sidebar"
        >
          <PanelLeft size={18} />
        </button>
      )}
    </>
  );
}

export default Sidebar;
