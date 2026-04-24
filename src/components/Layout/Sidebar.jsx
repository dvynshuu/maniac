import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { useUIStore } from '../../stores/uiStore';
import { buildPageTree } from '../../utils/helpers';
import { sanitize } from '../../utils/sanitizer';
import { validateBackupData } from '../../utils/validator';
import SidebarPageItem from './SidebarPageItem';
import { PanelLeftClose, PanelLeft, Plus, Settings, Download, Upload, Clock, Star, Home, Search, Trash2, Archive, X } from 'lucide-react';
import { db } from '../../db/database';

function Sidebar() {
  const pages = usePageStore((s) => s.pages);
  const addPage = usePageStore((s) => s.addPage);
  const deletePage = usePageStore((s) => s.deletePage);
  const archivePage = usePageStore((s) => s.archivePage);
  const setCurrentPage = usePageStore((s) => s.setCurrentPage);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const selectedPageIds = useUIStore((s) => s.selectedPageIds);
  const setSelectedPages = useUIStore((s) => s.setSelectedPages);
  const selectAllPages = useUIStore((s) => s.selectAllPages);
  const clearSelectedPages = useUIStore((s) => s.clearSelectedPages);
  const navigate = useNavigate();
  const location = useLocation();
  const importInputRef = useRef(null);
  const navRef = useRef(null);

  // Marquee selection state
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const cachedLayout = useRef([]);
  const scrollInterval = useRef(null);

  // Memoize expensive page tree build
  const activePages = useMemo(() => pages.filter((p) => !p.isArchived), [pages]);
  const pageTree = useMemo(() => buildPageTree(activePages), [activePages]);
  const favoritePages = useMemo(() => pages.filter(p => p.isFavorite), [pages]);

  const handleBulkDelete = async () => {
    const idsToDelete = [...selectedPageIds];
    if (idsToDelete.length === 0) return;
    
    // Clear selection immediately
    clearSelectedPages();

    // Start bulk delete process
    const { undo, commit } = await usePageStore.getState().bulkDeletePages(idsToDelete);
    
    let undone = false;
    useUIStore.getState().addToast(`Deleted ${idsToDelete.length} pages`, 'success', {
      label: 'Undo',
      onClick: () => {
        undone = true;
        undo();
      }
    });

    // Commit to database after 5 seconds if not undone
    setTimeout(() => {
      if (!undone) commit();
    }, 5000);
  };

  const handleBulkArchive = async () => {
    for (const id of selectedPageIds) {
      await archivePage(id);
    }
    clearSelectedPages();
    useUIStore.getState().addToast(`Archived ${selectedPageIds.length} pages`, 'success');
  };

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
    const blobsRaw = await db.blobs.toArray();
    
    // Convert Blobs to base64 strings for the JSON export
    const serializedBlobs = await Promise.all(blobsRaw.map(async (b) => {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(b.blob);
      });
      return { hash: b.hash, base64, mimeType: b.mimeType, createdAt: b.createdAt };
    }));

    const data = { pages: allPages, blocks, trackers, entries, blobs: serializedBlobs };
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
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON format.');
      }
      
      const validatedData = validateBackupData(file, data);
      useUIStore.getState().setPendingRestoreData(validatedData);
    } catch (err) {
      useUIStore.getState().addToast('Import failed: ' + err.message, 'error');
    }
    e.target.value = '';
  };

  const handleMouseDown = (e) => {
    // Only left click on the nav container
    if (e.button === 0 && navRef.current) {
      // Don't start selection if clicking a button or link directly
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.sidebar-toggle')) return;

      const rect = navRef.current.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const localX = startX - rect.left + navRef.current.scrollLeft;
      const localY = startY - rect.top + navRef.current.scrollTop;
      
      // Cache layout once on start
      const items = navRef.current.querySelectorAll('.page-item-wrapper');
      cachedLayout.current = Array.from(items).map(item => ({
        id: item.getAttribute('data-page-id'),
        rect: item.getBoundingClientRect()
      }));

      setDragStart({ x: localX, y: localY, startX, startY, isDragging: false });
      setDragCurrent({ x: localX, y: localY, currentX: startX, currentY: startY });
      
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        clearSelectedPages();
      }
    }
  };

  useEffect(() => {
    if (!dragStart) return;

    let lastSelected = [];

    const handleMouseMove = (e) => {
      if ((e.buttons & 1) !== 1) {
        cleanup();
        return;
      }
      
      if (!navRef.current) return;
      
      const currentX = e.clientX;
      const currentY = e.clientY;

      if (!dragStart.isDragging && (Math.abs(currentX - dragStart.startX) > 5 || Math.abs(currentY - dragStart.startY) > 5)) {
        setDragStart(prev => ({ ...prev, isDragging: true }));
      }

      if (!dragStart.isDragging) return;

      const rect = navRef.current.getBoundingClientRect();
      const localX = currentX - rect.left + navRef.current.scrollLeft;
      const localY = currentY - rect.top + navRef.current.scrollTop;

      setDragCurrent({ x: localX, y: localY, currentX, currentY });

      // Handle auto-scroll
      const SCROLL_THRESHOLD = 40;
      const SCROLL_SPEED = 15;
      
      if (currentY < rect.top + SCROLL_THRESHOLD) {
        startAutoScroll(-SCROLL_SPEED);
      } else if (currentY > rect.bottom - SCROLL_THRESHOLD) {
        startAutoScroll(SCROLL_SPEED);
      } else {
        stopAutoScroll();
      }

      // Fast intersection logic using cached layout
      const selectionRect = {
        left: Math.min(dragStart.startX, currentX),
        right: Math.max(dragStart.startX, currentX),
        top: Math.min(dragStart.startY, currentY),
        bottom: Math.max(dragStart.startY, currentY),
      };

      const newSelected = cachedLayout.current
        .filter(item => {
          const r = item.rect;
          return !(r.right < selectionRect.left || r.left > selectionRect.right || r.bottom < selectionRect.top || r.top > selectionRect.bottom);
        })
        .map(item => item.id);

      // Only update if selection changed (deep equal check)
      if (newSelected.length !== lastSelected.length || newSelected.some((id, i) => id !== lastSelected[i])) {
        lastSelected = newSelected;
        setSelectedPages(newSelected);
      }
    };

    const startAutoScroll = (speed) => {
      if (scrollInterval.current) return;
      scrollInterval.current = setInterval(() => {
        if (navRef.current) navRef.current.scrollTop += speed;
      }, 16);
    };

    const stopAutoScroll = () => {
      if (scrollInterval.current) {
        clearInterval(scrollInterval.current);
        scrollInterval.current = null;
      }
    };

    const cleanup = () => {
      stopAutoScroll();
      setDragStart(null);
      setDragCurrent(null);
      cachedLayout.current = [];
    };

    const handleMouseUp = (e) => {
      if (e.button === 0) {
        if (dragStart.isDragging) {
          window.__isDraggingSelection = true;
          setTimeout(() => { window.__isDraggingSelection = false; }, 100);
        }
        cleanup();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      stopAutoScroll();
    };
  }, [dragStart, setSelectedPages]);

  // Global "Select All" shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+A or Ctrl+A
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        // Only if sidebar or search is active or generally when in sidebar context
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        
        e.preventDefault();
        const allPageIds = pages.filter(p => !p.isArchived).map(p => p.id);
        selectAllPages(allPageIds);
        useUIStore.getState().addToast(`Selected all ${allPageIds.length} pages`, 'info');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages, selectAllPages]);

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

        <div 
          className="sidebar-nav" 
          style={{ padding: '0 12px', position: 'relative' }}
          ref={navRef}
          onMouseDown={handleMouseDown}
          onContextMenu={(e) => { if (dragStart) e.preventDefault(); }}
        >
          {dragStart && dragCurrent && (
            <div style={{
              position: 'absolute',
              border: '1px solid rgba(35, 131, 226, 0.8)',
              background: 'rgba(35, 131, 226, 0.15)',
              borderRadius: '2px',
              pointerEvents: 'none',
              zIndex: 100,
              left: Math.min(dragStart.x, dragCurrent.x),
              top: Math.min(dragStart.y, dragCurrent.y),
              width: Math.abs(dragCurrent.x - dragStart.x),
              height: Math.abs(dragCurrent.y - dragStart.y),
              boxShadow: '0 0 0 1px rgba(255,255,255,0.05)',
            }} />
          )}

          <div className="sidebar-section-label" style={{ marginTop: 8 }}>WORKSPACE</div>
          
          <div 
            className={`sidebar-page-item page-item-wrapper ${location.pathname === '/' ? 'active' : ''}`} 
            style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: location.pathname === '/' ? 'var(--text-primary)' : 'var(--text-secondary)', background: location.pathname === '/' ? 'var(--bg-active)' : 'transparent', marginBottom: 2 }}
            onClick={() => navigate('/')}
            data-page-id="dashboard"
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
                  className={`sidebar-page-item page-item-wrapper ${location.pathname === `/page/${page.id}` ? 'active' : ''} ${selectedPageIds.includes(page.id) ? 'selected' : ''}`}
                  style={{ 
                    padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', 
                    color: 'var(--text-secondary)', marginBottom: 2,
                    background: selectedPageIds.includes(page.id) ? 'rgba(35, 131, 226, 0.15)' : undefined
                  }}
                  onClick={() => { setCurrentPage(page.id); navigate(`/page/${page.id}`); }}
                  data-page-id={page.id}
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

        {/* Bulk Action Bar - Short Pop */}
        {selectedPageIds.length > 0 && (
          <div 
            onMouseDown={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              borderRadius: '24px', padding: '6px 12px', zIndex: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '8px',
              animation: 'slide-up 0.2s ease-out', whiteSpace: 'nowrap'
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-primary)', padding: '0 4px' }}>
              {selectedPageIds.length}
            </span>
            <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
            <button 
              onClick={handleBulkArchive}
              title="Archive"
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-active)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <Archive size={14} />
            </button>
            <button 
              onClick={handleBulkDelete}
              title="Delete"
              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              <Trash2 size={14} />
            </button>
            <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
            <button 
              onClick={clearSelectedPages}
              title="Clear Selection"
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-active)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
              <X size={14} />
            </button>
            <div style={{ width: 1, height: 16, background: 'var(--border-subtle)' }} />
            <button 
              onClick={() => {
                const allPageIds = pages.filter(p => !p.isArchived).map(p => p.id);
                selectAllPages(allPageIds);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 8px', fontSize: '11px', fontWeight: 600, borderRadius: '16px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-active)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              Select All
            </button>
          </div>
        )}

        <div className="sidebar-footer">
          <div style={{ padding: '0 0 8px' }}>
            <button
              className="sidebar-notion-import-btn"
              onClick={() => useUIStore.getState().openNotionImport()}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <Upload size={14} />
              <span>Import from Notion</span>
            </button>
          </div>
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
