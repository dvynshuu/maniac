import { useNavigate, useLocation } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { useUIStore } from '../../stores/uiStore';
import { buildPageTree } from '../../utils/helpers';
import SidebarPageItem from './SidebarPageItem';
import { PanelLeftClose, PanelLeft, Plus, Settings, Download, Clock, Pin, Database, Network, File, Home } from 'lucide-react';
import { db } from '../../db/database';

function Sidebar() {
  const pages = usePageStore((s) => s.pages);
  const addPage = usePageStore((s) => s.addPage);
  const setCurrentPage = usePageStore((s) => s.setCurrentPage);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const navigate = useNavigate();
  const location = useLocation();

  const pageTree = buildPageTree(pages.filter((p) => !p.isArchived));

  const handleNewPage = async () => {
    const page = await addPage();
    setCurrentPage(page.id);
    navigate(`/page/${page.id}`);
  };

  const handleExport = async () => {
    const pages = await db.pages.toArray();
    const blocks = await db.blocks.toArray();
    const trackers = await db.trackers.toArray();
    const entries = await db.tracker_entries.toArray();

    const data = { pages, blocks, trackers, entries };
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

        <div style={{ padding: '0 16px 16px' }}>
          <button className="new-page-btn" onClick={handleNewPage}>
            <Plus size={16} />
            <span>New Page</span>
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
          <div className="sidebar-page-item" style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', marginBottom: 2 }}>
            <Clock size={16} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Recent Pages</span>
          </div>
          <div className="sidebar-page-item" style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', marginBottom: 2 }}>
            <Pin size={16} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Pinned Items</span>
          </div>
          <div className="sidebar-page-item" style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', marginBottom: 2 }}>
            <Database size={16} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Databases</span>
          </div>
          <div className="sidebar-page-item" style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', marginBottom: 2 }}>
            <Network size={16} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Graph View</span>
          </div>
          <div className="sidebar-page-item" style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', marginBottom: 2 }}>
            <File size={16} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Templates</span>
          </div>
          <div className="sidebar-page-item" style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', marginBottom: 16 }}>
            <Settings size={16} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Settings</span>
          </div>

          {pageTree.length > 0 && (
            <>
              <div className="sidebar-section-label">YOUR PAGES</div>
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
