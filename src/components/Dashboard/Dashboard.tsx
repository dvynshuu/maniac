import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { useUIStore } from '../../stores/uiStore';
import { useSecurityStore } from '../../stores/securityStore';
import { db } from '../../db/database';
import { SecurityService } from '../../utils/securityService';
import { 
  Settings, Bell, User, Clock, Zap, Pin, 
  RotateCcw, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Plus, Activity, Brain, AlertCircle, TrendingUp, Search, Flame,
  FileText, Shield, ArrowUpRight, CheckCircle2,
  BarChart3, RefreshCw,
  Terminal, ArrowRight
} from 'lucide-react';
import './Dashboard.css';
import { ProfilePopover } from './ProfilePopover';
import { NotificationsPopover } from './NotificationsPopover';
import { SettingsModal } from '../Settings/SettingsModal';
import { useIntelligenceStore } from '../../stores/intelligenceStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNotificationStore } from '../../stores/notificationStore';
import RecallChallengeModal from './RecallChallengeModal';
import EmojiIcon from '../Common/EmojiIcon';
import { getPlainText } from '../../utils/helpers';

const GraphView = lazy(() => import('./GraphView'));

// Helper for high-precision relative timestamps
function formatRelativeTime(timestamp: number | string | undefined | null): string {
  if (!timestamp) return '—';
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  if (Number.isNaN(time)) return '—';
  
  const diff = Date.now() - time;
  if (diff < 0) return 'Just now';
  if (diff < 60000) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function Dashboard() {
  const pages = usePageStore((s) => s.pages);
  const archivedPages = usePageStore((s) => s.archivedPages);
  const restorePage = usePageStore((s) => s.restorePage);
  const deletePage = usePageStore((s) => s.deletePage);
  const addPage = usePageStore((s) => s.addPage);
  const userProfileImage = useSettingsStore((s) => s.userProfileImage);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'Workspace' | 'Intelligence' | 'Calendar' | 'Archives'>('Workspace');
  const [activePopover, setActivePopover] = useState<'notifications' | 'profile' | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('Appearance');
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);

  const loadNotifications = useNotificationStore((s) => s.loadNotifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  // Active recall pages count for topbar badge
  const dueSrsCount = useMemo(() => {
    const srsPages = pages.filter(p => p.srsEnabled && !p.isArchived);
    return srsPages.filter(p => p.srsNextReview && p.srsNextReview <= Date.now()).length;
  }, [pages]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const openSettings = (tab = 'Appearance') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const togglePopover = (popover: 'notifications' | 'profile') => {
    setActivePopover(prev => (prev === popover ? null : popover));
  };

  const handleQuickNewPage = async () => {
    try {
      const page = await addPage();
      if (page?.id) {
        navigate(`/app/page/${page.id}`);
      }
    } catch (err) {
      console.error('Failed to create page', err);
    }
  };

  return (
    <div 
      className="editor-scroll bg-primary dashboard-wrapper" 
      style={{ height: '100%' }} 
      onClick={() => setActivePopover(null)}
    >
      {/* Settings Modal */}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} initialTab={settingsTab} />}

      {/* Hardware Instrument Topbar */}
      <header className="dashboard-topbar" style={{ paddingLeft: sidebarOpen ? '32px' : '56px' }}>
        <div className="dashboard-brand-container">
          {/* Milled Segmented Tab Switcher */}
          <nav className="dashboard-tabs" role="tablist" aria-label="Dashboard views">
            <button
              onClick={() => setActiveTab('Workspace')}
              role="tab"
              aria-selected={activeTab === 'Workspace'}
              className="dashboard-tab"
            >
              <Terminal size={14} className="tab-icon" />
              <span>Workspace</span>
            </button>

            <button
              onClick={() => setActiveTab('Intelligence')}
              role="tab"
              aria-selected={activeTab === 'Intelligence'}
              className="dashboard-tab"
            >
              <Brain size={14} className="tab-icon" />
              <span>Review</span>
              {dueSrsCount > 0 && (
                <span className="tab-badge due-badge" title={`${dueSrsCount} notes due for recall`}>
                  {dueSrsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('Calendar')}
              role="tab"
              aria-selected={activeTab === 'Calendar'}
              className="dashboard-tab"
            >
              <CalendarIcon size={14} className="tab-icon" />
              <span>Calendar</span>
            </button>

            <button
              onClick={() => setActiveTab('Archives')}
              role="tab"
              aria-selected={activeTab === 'Archives'}
              className="dashboard-tab"
            >
              <Trash2 size={14} className="tab-icon" />
              <span>Archives</span>
              {archivedPages.length > 0 && (
                <span className="tab-badge archive-badge">
                  {archivedPages.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Action Tray */}
        <div className="dashboard-actions" onClick={e => e.stopPropagation()}>
          {/* Fast Note CTA */}
          <button 
            className="topbar-action-btn primary"
            onClick={handleQuickNewPage}
            title="Create new note"
          >
            <Plus size={14} />
            <span className="topbar-btn-text">New Note</span>
          </button>

          {/* Quick Search Shortcut */}
          <button 
            className="topbar-action-btn secondary"
            onClick={() => openCommandPalette()}
            title="Search notes and commands (⌘K)"
          >
            <Search size={14} />
            <span className="topbar-btn-text">Search</span>
            <kbd className="topbar-kbd">⌘K</kbd>
          </button>

          <div className="topbar-divider" />

          {/* System Settings */}
          <button 
            aria-label="Settings" 
            className="topbar-icon-btn" 
            onClick={() => openSettings('Appearance')}
            title="Workspace Settings"
          >
            <Settings size={16} />
          </button>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button 
              aria-label="Notifications" 
              className="topbar-icon-btn" 
              onClick={() => togglePopover('notifications')}
              title="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && <span className="notification-badge" />}
            </button>
            {activePopover === 'notifications' && <NotificationsPopover onClose={() => setActivePopover(null)} />}
          </div>

          {/* Profile Popover */}
          <div style={{ position: 'relative' }}>
            <button 
              aria-label="Profile" 
              className="dashboard-profile-btn" 
              onClick={() => togglePopover('profile')}
              title="Profile & Vault Security"
            >
              <div className="dashboard-profile-avatar">
                {userProfileImage ? (
                  <img src={userProfileImage} alt="Profile" />
                ) : (
                  <User size={15} />
                )}
              </div>
            </button>
            {activePopover === 'profile' && (
              <ProfilePopover onClose={() => setActivePopover(null)} onOpenSettings={openSettings} />
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="editor-container dashboard-main-content">
        {activeTab === 'Workspace' && <WorkspaceTab pages={pages} navigate={navigate} />}
        {activeTab === 'Intelligence' && <IntelligenceTab navigate={navigate} />}
        {activeTab === 'Calendar' && <CalendarTab pages={pages} navigate={navigate} />}
        {activeTab === 'Archives' && (
          <ArchivesTab 
            archivedPages={archivedPages} 
            restore={restorePage} 
            permaDelete={deletePage} 
          />
        )}
      </main>
    </div>
  );
}

// ==========================================
// WorkspaceTab (Tactical Workstation)
// ==========================================
interface WorkspaceTabProps {
  pages: any[];
  navigate: (path: string) => void;
}

function WorkspaceTab({ pages, navigate }: WorkspaceTabProps) {
  const [recentPages, setRecentPages] = useState<any[]>([]);
  const [pinnedPages, setPinnedPages] = useState<any[]>([]);
  const [leadPageSnippet, setLeadPageSnippet] = useState<string>('');
  const [leadBlockCount, setLeadBlockCount] = useState<number>(0);
  
  const lastVisitedPageId = useUIStore(s => s.lastVisitedPageId);
  const onboardingStatus = useUIStore(s => s.onboardingStatus);
  const openCommandPalette = useUIStore(s => s.openCommandPalette);
  const addPage = usePageStore(s => s.addPage);
  
  const lastVisitedPage = useMemo(() => {
    return lastVisitedPageId ? pages.find(p => p.id === lastVisitedPageId && !p.isArchived) : null;
  }, [lastVisitedPageId, pages]);

  const key = useSecurityStore(s => s.derivedKey);
  const { nextActions, analyze, knowledgeVelocity } = useIntelligenceStore();

  useEffect(() => {
    analyze();
  }, [key, analyze]);

  // Load Pinned, Recent, and Lead Excerpt
  useEffect(() => {
    let isCancelled = false;

    const fetchWorkspaceData = async () => {
      try {
        const activePages = await db.pages.filter(p => !p.isArchived).toArray();

        // Determine Pinned: Explicit Favorites first, or top root active pages
        const favorites = activePages.filter(p => p.isFavorite && !p.isDatabaseRow);
        const pinnedList = favorites.length > 0 
          ? favorites.slice(0, 5) 
          : activePages.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 4);

        // Recent: ordered by updatedAt descending
        const recent = await db.pages
          .filter(p => !p.isArchived && !p.isDatabaseRow)
          .reverse()
          .sortBy('updatedAt');

        const recentList = recent.slice(0, 6);

        // Title Decryption Helper
        const decryptPageList = async (list: any[]) => {
          return Promise.all(list.map(async p => {
            if (key && p._isEncrypted && p.title) {
              try {
                const decrypted = await SecurityService.decrypt(p.title, key);
                return { ...p, title: decrypted || '🔒 Encrypted Node' };
              } catch {
                return { ...p, title: '🔒 Decryption Failed' };
              }
            }
            return p;
          }));
        };

        const [decryptedPinned, decryptedRecent] = await Promise.all([
          decryptPageList(pinnedList),
          decryptPageList(recentList)
        ]);

        if (isCancelled) return;

        setPinnedPages(decryptedPinned);
        setRecentPages(decryptedRecent);

        // Fetch lead card details if pinned pages exist
        if (decryptedPinned.length > 0) {
          const leadId = decryptedPinned[0].id;
          const blocks = await db.blocks.where('pageId').equals(leadId).toArray();
          if (isCancelled) return;
          
          setLeadBlockCount(blocks.length);

          const textBlock = blocks.find(b => b.content && typeof b.content === 'string' && b.content.trim().length > 0);
          if (textBlock) {
            let content = textBlock.content;
            if (key && textBlock._isEncrypted) {
              try {
                content = (await SecurityService.decrypt(content, key)) || '';
              } catch {
                content = '';
              }
            }
            setLeadPageSnippet(getPlainText(content));
          } else {
            setLeadPageSnippet('');
          }
        }
      } catch (err) {
        console.error('Failed to load workspace data', err);
      }
    };

    fetchWorkspaceData();

    return () => {
      isCancelled = true;
    };
  }, [key, pages.length]);

  // Compute metrics
  const totalActiveNodes = useMemo(() => pages.filter(p => !p.isArchived).length, [pages]);
  const activeWeekNodes = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return pages.filter(p => !p.isArchived && new Date(p.updatedAt).getTime() > oneWeekAgo).length;
  }, [pages]);

  const dueSrsCount = useMemo(() => {
    const srsPages = pages.filter(p => p.srsEnabled && !p.isArchived);
    return srsPages.filter(p => p.srsNextReview && p.srsNextReview <= Date.now()).length;
  }, [pages]);

  const handleCreateNew = async () => {
    const page = await addPage();
    if (page?.id) {
      navigate(`/app/page/${page.id}`);
    }
  };

  return (
    <div className="workspace-tab-container">
      {/* Executive Telemetry Header */}
      <section className="dashboard-telemetry-header">
        <div className="telemetry-top-row">
          <div className="telemetry-stamp">
            <Shield size={12} className="telemetry-stamp-icon" />
            <span>VAULT OS // RUNNING IN LOCAL MEMORY // ZERO CLOUD LEAK</span>
          </div>
          <div className="telemetry-time-stamp">
            <span>SYS_TIME: {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
          </div>
        </div>

        <div className="telemetry-content-row">
          <div className="telemetry-headline-group">
            <h1 className="telemetry-heading">Workspace Central</h1>
            <p className="telemetry-subheading">
              Local-first encrypted knowledge graph, relational databases, and tactical focus.
            </p>
          </div>

          <div className="telemetry-controls-group">
            <button className="telemetry-btn primary" onClick={handleCreateNew}>
              <Plus size={15} />
              <span>Create Note</span>
            </button>
            <button className="telemetry-btn secondary" onClick={() => openCommandPalette()}>
              <Search size={14} />
              <span>Index</span>
              <kbd>⌘K</kbd>
            </button>
          </div>
        </div>

        {/* 4-Metric Machine HUD */}
        <div className="telemetry-hud-strip">
          <div className="hud-metric-tile">
            <span className="hud-metric-label">TOTAL NODES</span>
            <div className="hud-metric-value-row">
              <span className="hud-metric-value">{totalActiveNodes}</span>
              <span className="hud-metric-delta">PAGES</span>
            </div>
          </div>

          <div className="hud-divider" />

          <div className="hud-metric-tile">
            <span className="hud-metric-label">ACTIVE (7D)</span>
            <div className="hud-metric-value-row">
              <span className="hud-metric-value">{activeWeekNodes}</span>
              <span className="hud-metric-delta text-success">
                {totalActiveNodes > 0 ? `${Math.round((activeWeekNodes / totalActiveNodes) * 100)}%` : '0%'}
              </span>
            </div>
          </div>

          <div className="hud-divider" />

          <div className="hud-metric-tile">
            <span className="hud-metric-label">BLOCK FOOTPRINT</span>
            <div className="hud-metric-value-row">
              <span className="hud-metric-value">{knowledgeVelocity?.totalBlocks || 0}</span>
              <span className="hud-metric-delta">BLOCKS</span>
            </div>
          </div>

          <div className="hud-divider" />

          <div className="hud-metric-tile">
            <span className="hud-metric-label">RECALL STATUS</span>
            <div className="hud-metric-value-row">
              <span className={`hud-metric-value ${dueSrsCount > 0 ? 'text-amber' : 'text-success'}`}>
                {dueSrsCount > 0 ? dueSrsCount : 'OK'}
              </span>
              <span className="hud-metric-delta">
                {dueSrsCount > 0 ? 'DUE CHECKS' : 'SYNCHRONIZED'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Fast-Resume Active Session Dock */}
      {lastVisitedPage && (
        <div 
          className="resume-dock-bar" 
          onClick={() => navigate(`/app/page/${lastVisitedPage.id}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(`/app/page/${lastVisitedPage.id}`);
            }
          }}
        >
          <div className="resume-dock-left">
            <div className="resume-beacon">
              <span className="resume-beacon-dot" />
              <span className="resume-beacon-label">RESUME SESSION</span>
            </div>
            <div className="resume-dock-node">
              <EmojiIcon emoji={lastVisitedPage.icon || '📄'} size="18px" />
              <span className="resume-dock-title">{lastVisitedPage.title || 'Untitled'}</span>
            </div>
          </div>

          <div className="resume-dock-right">
            <span className="resume-dock-meta">
              Updated {formatRelativeTime(lastVisitedPage.updatedAt)}
            </span>
            <button 
              className="resume-dock-btn button-tactile-sm" 
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/app/page/${lastVisitedPage.id}`);
              }}
            >
              <span>Continue</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}


      {/* Asymmetrical Workstation Split Grid */}
      <div className="dashboard-split-pane">
        
        {/* LEFT COLUMN: Pinned Bento & Activity Ledger */}
        <div className="dashboard-pane-left">
          
          {/* Priority Pinned Bento Grid */}
          <section className="workstation-section">
            <div className="section-header-machined">
              <div className="section-header-title-group">
                <Pin size={14} className="section-header-icon" />
                <h2 className="section-header-text">Priority Nodes</h2>
              </div>
              <span className="section-header-tag">
                {pinnedPages.length} {pinnedPages.length === 1 ? 'NODE' : 'NODES'}
              </span>
            </div>

            {pinnedPages.length > 0 ? (
              <div className="bento-matrix">
                {/* Lead Card (Span 2 col) */}
                <article 
                  className="bento-tile bento-lead"
                  onClick={() => navigate(`/app/page/${pinnedPages[0].id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/app/page/${pinnedPages[0].id}`);
                    }
                  }}
                >
                  <div className="bento-tile-top">
                    <div className="bento-node-badge">
                      <EmojiIcon emoji={pinnedPages[0].icon || '📄'} size="20px" />
                      <span className="bento-index-stamp">LEAD // 01</span>
                    </div>
                    <span className="bento-timestamp">
                      {formatRelativeTime(pinnedPages[0].updatedAt)}
                    </span>
                  </div>

                  <div className="bento-lead-content">
                    <h3 className="bento-lead-title">
                      {pinnedPages[0].title || 'Untitled Node'}
                    </h3>
                    <p className="bento-lead-snippet">
                      {leadPageSnippet || 'Open this node to structure notes, relational tables, and research.'}
                    </p>
                  </div>

                  <div className="bento-lead-footer">
                    <span className="bento-tag">
                      <FileText size={11} />
                      <span>{leadBlockCount} BLOCKS</span>
                    </span>
                    <span className="bento-open-link">
                      <span>Open Note</span>
                      <ArrowUpRight size={13} />
                    </span>
                  </div>
                </article>

                {/* Secondary Pinned Cards */}
                {pinnedPages.slice(1).map((page, idx) => (
                  <article
                    key={page.id}
                    className="bento-tile bento-sub"
                    onClick={() => navigate(`/app/page/${page.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/app/page/${page.id}`);
                      }
                    }}
                  >
                    <div className="bento-tile-top">
                      <div className="bento-sub-icon">
                        <EmojiIcon emoji={page.icon || '📄'} size="16px" />
                      </div>
                      <span className="bento-index-stamp">0{idx + 2}</span>
                    </div>

                    <h4 className="bento-sub-title">
                      {page.title || 'Untitled Node'}
                    </h4>

                    <div className="bento-sub-footer">
                      <Clock size={11} />
                      <span>{formatRelativeTime(page.updatedAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="bento-empty-machined">
                <Pin size={24} className="bento-empty-icon" />
                <h3 className="bento-empty-title">No priority nodes docked</h3>
                <p className="bento-empty-text">
                  Star or favorite key documents from the page options menu to dock them on your priority station.
                </p>
                <button className="telemetry-btn primary" onClick={handleCreateNew}>
                  <Plus size={14} />
                  <span>Create First Node</span>
                </button>
              </div>
            )}
          </section>

          {/* Chronological Activity Ledger */}
          <section className="workstation-section" style={{ marginTop: '28px' }}>
            <div className="section-header-machined">
              <div className="section-header-title-group">
                <Clock size={14} className="section-header-icon" />
                <h2 className="section-header-text">Chronological Ledger</h2>
              </div>
              <span className="section-header-tag">RECENT EDITS</span>
            </div>

            <div className="ledger-container">
              {recentPages.length > 0 ? (
                <div className="ledger-table" role="list">
                  {recentPages.map((page) => (
                    <div
                      key={page.id}
                      className="ledger-row"
                      role="listitem"
                      onClick={() => navigate(`/app/page/${page.id}`)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/app/page/${page.id}`);
                        }
                      }}
                    >
                      <div className="ledger-cell-main">
                        <div className="ledger-icon-box">
                          <EmojiIcon emoji={page.icon || '📄'} size="15px" />
                        </div>
                        <div className="ledger-title-group">
                          <span className="ledger-title">{page.title || 'Untitled'}</span>
                          <span className="ledger-id-stamp">#{page.id.slice(0, 6)}</span>
                        </div>
                      </div>

                      <div className="ledger-cell-meta">
                        <span className="ledger-timestamp">
                          {formatRelativeTime(page.updatedAt)}
                        </span>
                        <ArrowRight size={13} className="ledger-arrow" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ledger-empty">
                  <span>No recent activity logged in this workspace session.</span>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: Tactical Action Radar & Neural Graph */}
        <div className="dashboard-pane-right">
          
          {/* Tactical Action Radar */}
          <section className="workstation-section">
            <div className="section-header-machined">
              <div className="section-header-title-group">
                <Zap size={14} className="section-header-icon text-amber" />
                <h2 className="section-header-text">Tactical Queue</h2>
              </div>
              <span className="section-header-tag text-amber">
                {nextActions.length} PENDING
              </span>
            </div>

            <div className="action-radar-container">
              {nextActions.length > 0 ? (
                nextActions.slice(0, 5).map((action) => (
                  <div
                    key={action.id}
                    className="tactical-item"
                    onClick={() => navigate(`/app/page/${action.pageId}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/app/page/${action.pageId}`);
                      }
                    }}
                  >
                    <div className="tactical-item-head">
                      <span className={`priority-pill priority-${action.priority || 1}`}>
                        {action.priority === 3 ? 'CRITICAL' : action.priority === 2 ? 'ELEVATED' : 'ACTIVE'}
                      </span>
                      <span className="tactical-source">GO TO SOURCE →</span>
                    </div>

                    <p className="tactical-item-text">
                      {action.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="tactical-empty-card">
                  <CheckCircle2 size={24} className="text-success" />
                  <span className="tactical-empty-title">All tasks cleared</span>
                  <span className="tactical-empty-sub">
                    No active or uncompleted todos detected across your workspace.
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Neural Knowledge Constellation */}
          <section className="workstation-section" style={{ marginTop: '28px' }}>
            <div className="section-header-machined">
              <div className="section-header-title-group">
                <Activity size={14} className="section-header-icon text-primary" />
                <h2 className="section-header-text">Neural Topology</h2>
              </div>
              <span className="section-header-tag">INTERACTIVE</span>
            </div>

            <div className="bezel-instrument-frame">
              <div className="bezel-corner corner-tl">+</div>
              <div className="bezel-corner corner-tr">+</div>
              <div className="bezel-corner corner-bl">+</div>
              <div className="bezel-corner corner-br">+</div>

              <div className="bezel-graph-content">
                <Suspense fallback={
                  <div className="h-full w-full flex items-center justify-center text-xs font-mono text-neutral-500">
                    INITIALIZING KNOWLEDGE TOPOLOGY...
                  </div>
                }>
                  <GraphView pages={pages} />
                </Suspense>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// ==========================================
// Intelligence Tab (Cognitive OS & Spaced Repetition)
// ==========================================
interface IntelligenceTabProps {
  navigate: (path: string) => void;
}

function IntelligenceTab({ navigate }: IntelligenceTabProps) {
  const { nextActions, forgetting, weeklyFocus, knowledgeVelocity, analyze, isAnalyzing } = useIntelligenceStore();
  const key = useSecurityStore(s => s.derivedKey);
  const pages = usePageStore(s => s.pages);
  const updatePage = usePageStore(s => s.updatePage);
  const srsStreak = useSettingsStore(s => s.srsStreak);
  const [srsModalOpen, setSrsModalOpen] = useState(false);

  const srsPages = useMemo(() => pages.filter(p => p.srsEnabled && !p.isArchived), [pages]);
  const duePages = useMemo(() => srsPages.filter(p => p.srsNextReview && p.srsNextReview <= Date.now()), [srsPages]);

  useEffect(() => {
    analyze();
  }, [key, analyze]);

  // Generate 7-day activity chart labels
  const last7DaysLabels = useMemo(() => {
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        label: dayNames[d.getDay()],
        isToday: i === 6
      };
    });
  }, []);

  if (isAnalyzing && !nextActions.length) {
    return (
      <div className="intelligence-loading-state">
        <div className="machined-spinner" />
        <h3 className="loading-title">Analyzing Workspace Synapses...</h3>
        <p className="loading-desc">Calculating memory decay, spaced repetition queues, and relational density.</p>
      </div>
    );
  }

  const retentionScore = srsPages.length > 0 
    ? Math.round(((srsPages.length - duePages.length) / srsPages.length) * 100)
    : 100;

  return (
    <div className="intelligence-view-container animate-fade-in">
      {/* Intelligence Header */}
      <header className="intelligence-os-header">
        <div className="intelligence-title-row">
          <Brain size={22} className="intelligence-os-icon" />
          <h2 className="intelligence-os-title">Cognitive Diagnostics & Review</h2>
        </div>
        <p className="intelligence-os-subtitle">
          Spaced repetition retention queue, memory decay prevention, and knowledge growth velocity.
        </p>
      </header>

      {/* Active Recall Station */}
      <section className="srs-instrument-bay">
        <div className="srs-bay-header">
          <div className="srs-bay-info">
            <div className="srs-bay-icon-box">
              <Brain size={20} />
            </div>
            <div>
              <div className="srs-bay-title-group">
                <h3 className="srs-bay-title">Active Recall Station</h3>
                <span className="srs-bay-badge">
                  {srsPages.length} ENROLLED
                </span>
              </div>
              <p className="srs-bay-description">
                {srsPages.length === 0
                  ? 'Enable Spaced Repetition on your notes to activate automated cognitive recall schedules.'
                  : duePages.length === 0
                    ? 'All recall queues are synchronized. Synaptic memory traces are reinforced and stable.'
                    : `${duePages.length} ${duePages.length === 1 ? 'note requires' : 'notes require'} memory recall checks today.`}
              </p>
            </div>
          </div>

          <div className="srs-streak-chassis">
            <Flame size={16} className="text-amber" />
            <span className="srs-streak-label">STREAK:</span>
            <span className="srs-streak-num">{srsStreak || 0}d</span>
          </div>
        </div>

        {srsPages.length > 0 && (
          <div className="srs-telemetry-row">
            <div className="srs-progress-chassis">
              <div 
                className="srs-progress-bar-fill"
                style={{ width: `${retentionScore}%` }}
              />
              <div className="srs-tick-mark tick-25" />
              <div className="srs-tick-mark tick-50" />
              <div className="srs-tick-mark tick-75" />
            </div>
            <div className="srs-retention-metric">
              <span className="srs-retention-val">{retentionScore}%</span>
              <span className="srs-retention-tag">RETENTION STABILITY</span>
            </div>
          </div>
        )}

        <div className="srs-bay-actions">
          {duePages.length > 0 ? (
            <button 
              className="telemetry-btn primary"
              onClick={() => setSrsModalOpen(true)}
            >
              <Brain size={15} />
              <span>Launch Recall Session ({duePages.length} Due)</span>
            </button>
          ) : srsPages.length === 0 ? (
            <div className="srs-manual-hint">
              <span>HOW TO ENROLL: Open any page and toggle "Active Recall" in the header menu.</span>
            </div>
          ) : (
            <button 
              className="telemetry-btn secondary"
              onClick={() => setSrsModalOpen(true)}
            >
              <RefreshCw size={14} />
              <span>Review All ({srsPages.length} Total)</span>
            </button>
          )}
        </div>
      </section>

      {/* Recall Challenge Modal */}
      {srsModalOpen && (
        <RecallChallengeModal 
          duePages={duePages.length > 0 ? duePages : srsPages} 
          updatePage={updatePage} 
          onClose={() => setSrsModalOpen(false)} 
        />
      )}

      {/* Tri-Fold Cognitive Matrix */}
      <div className="intelligence-matrix-grid">
        {/* Col 1: Tactical Priorities */}
        <section className="intel-card">
          <div className="intel-card-header">
            <Zap size={15} className="text-amber" />
            <h3 className="intel-card-title">What should I execute next?</h3>
          </div>
          <div className="intel-card-body">
            {nextActions.length > 0 ? (
              nextActions.slice(0, 5).map(action => (
                <div
                  key={action.id}
                  className="intel-item-row"
                  onClick={() => navigate(`/app/page/${action.pageId}`)}
                  role="button"
                  tabIndex={0}
                >
                  <span className={`intel-priority-badge p-${action.priority || 1}`}>
                    P{action.priority || 1}
                  </span>
                  <span className="intel-item-text">{action.content}</span>
                  <ArrowRight size={12} className="intel-row-arrow" />
                </div>
              ))
            ) : (
              <div className="intel-empty-block">No pending tasks detected.</div>
            )}
          </div>
        </section>

        {/* Col 2: Memory Decay & Stale Nodes */}
        <section className="intel-card">
          <div className="intel-card-header">
            <AlertCircle size={15} className="text-warning" />
            <h3 className="intel-card-title">What am I forgetting?</h3>
          </div>
          <div className="intel-card-body">
            {forgetting?.stalePages?.length > 0 && (
              <div className="intel-sub-group">
                <span className="intel-group-label">STALE NODES (&gt;7 DAYS)</span>
                {forgetting.stalePages.slice(0, 3).map((page: any) => (
                  <div 
                    key={page.id} 
                    className="intel-item-row" 
                    onClick={() => navigate(`/app/page/${page.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <EmojiIcon emoji={page.icon || '📄'} size="13px" />
                    <span className="intel-item-text">{page.title || 'Untitled'}</span>
                    <span className="intel-stale-stamp">STALE</span>
                  </div>
                ))}
              </div>
            )}

            {forgetting?.abandonedTodos?.length > 0 && (
              <div className="intel-sub-group" style={{ marginTop: '12px' }}>
                <span className="intel-group-label">ABANDONED TODOS (&gt;14 DAYS)</span>
                {forgetting.abandonedTodos.slice(0, 3).map((todo: any) => (
                  <div 
                    key={todo.id} 
                    className="intel-item-row" 
                    onClick={() => navigate(`/app/page/${todo.pageId}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <Clock size={12} className="text-tertiary" />
                    <span className="intel-item-text">{todo.content}</span>
                  </div>
                ))}
              </div>
            )}

            {(!forgetting?.stalePages?.length && !forgetting?.abandonedTodos?.length) && (
              <div className="intel-empty-block">All active knowledge nodes are fresh.</div>
            )}
          </div>
        </section>

        {/* Col 3: Weekly Focus & Trackers */}
        <section className="intel-card">
          <div className="intel-card-header">
            <TrendingUp size={15} className="text-success" />
            <h3 className="intel-card-title">What matters this week?</h3>
          </div>
          <div className="intel-card-body">
            {weeklyFocus ? (
              <div className="weekly-intel-summary">
                <div className="weekly-active-tile">
                  <span className="weekly-val">{weeklyFocus.activePages}</span>
                  <span className="weekly-sub">Active nodes modified this week</span>
                </div>

                {weeklyFocus.trackerStats?.length > 0 && (
                  <div className="weekly-trackers-wrap">
                    <span className="intel-group-label">TOP TRACKER ACTIVITY</span>
                    <div className="tracker-tag-cloud">
                      {weeklyFocus.trackerStats.map((stat: any) => (
                        <div key={stat.id} className="tracker-pill-chip">
                          <span className="tracker-chip-name">{stat.name}</span>
                          <span className="tracker-chip-count">{stat.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="intel-empty-block">Insufficient telemetry logged this week.</div>
            )}
          </div>
        </section>
      </div>

      {/* Knowledge Velocity & Vault Diagnostics Engine */}
      <section className="velocity-engine-card">
        <div className="velocity-header-row">
          <div className="velocity-title-group">
            <BarChart3 size={18} className="text-primary" />
            <h3 className="velocity-title">Knowledge Velocity Matrix</h3>
          </div>
          <div className="velocity-depth-chip">
            <span className="depth-dot" />
            <span>DEPTH LEVEL {knowledgeVelocity?.depthLevel || 1} // {
              (knowledgeVelocity?.depthLevel || 1) >= 4 ? 'MONOLITH GRAPH' :
              (knowledgeVelocity?.depthLevel || 1) === 3 ? 'SYNAPTIC NETWORK' :
              (knowledgeVelocity?.depthLevel || 1) === 2 ? 'STRUCTURED TAXONOMY' : 'INCUBATING VAULT'
            }</span>
          </div>
        </div>

        {/* Telemetry Numbers Grid */}
        <div className="velocity-stats-grid">
          <div className="velocity-stat-cell">
            <span className="stat-label">TOTAL BLOCKS</span>
            <span className="stat-value">{knowledgeVelocity?.totalBlocks || 0}</span>
          </div>
          <div className="velocity-stat-cell">
            <span className="stat-label">24H ACTIVITY</span>
            <span className="stat-value">{knowledgeVelocity?.dayBlocks || 0}</span>
          </div>
          <div className="velocity-stat-cell">
            <span className="stat-label">7D VELOCITY</span>
            <span className="stat-value">{knowledgeVelocity?.weekBlocks || 0}</span>
          </div>
          <div className="velocity-stat-cell">
            <span className="stat-label">GRAPH RELATIONS</span>
            <span className="stat-value">{knowledgeVelocity?.totalRelations || 0}</span>
          </div>
        </div>

        {/* Daily Distribution Chart */}
        <div className="velocity-chart-wrapper">
          <div className="velocity-bars-container">
            {(knowledgeVelocity?.dailyActivity || [10, 15, 20, 25, 30, 40, 50]).map((h: number, i: number) => {
              const dayMeta = last7DaysLabels[i] || { label: `D${i+1}`, isToday: false };
              return (
                <div key={i} className={`velocity-bar-col ${dayMeta.isToday ? 'today-col' : ''}`}>
                  <div className="bar-track">
                    <div 
                      className="bar-fill" 
                      style={{ height: `${Math.max(8, h)}%` }} 
                      title={`${dayMeta.label}: ${h}% capacity`}
                    />
                  </div>
                  <span className="bar-day-label">{dayMeta.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

// ==========================================
// Calendar Tab (Production Matrix & Time Map)
// ==========================================
interface CalendarTabProps {
  pages: any[];
  navigate: (path: string) => void;
}

function CalendarTab({ pages, navigate }: CalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  const monthNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // Map pages to dates
  const activitiesByDate: Record<number, any[]> = {};
  pages.forEach(p => {
    if (p.isArchived) return;
    const d = new Date(p.createdAt);
    if (d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth()) {
      const day = d.getDate();
      if (!activitiesByDate[day]) activitiesByDate[day] = [];
      activitiesByDate[day].push(p);
    }
  });

  const totalEventsInMonth = Object.values(activitiesByDate).reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div className="calendar-view-container animate-fade-in">
      {/* Calendar Header */}
      <header className="calendar-control-header">
        <div className="calendar-title-group">
          <div className="calendar-stamp-row">
            <CalendarIcon size={14} className="calendar-stamp-icon" />
            <span>TIME SERIES MATRIX // CHRONO LOG</span>
          </div>
          <h2 className="calendar-month-heading">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <span className="calendar-meta-sub">
            {totalEventsInMonth} {totalEventsInMonth === 1 ? 'node' : 'nodes'} created in this cycle
          </span>
        </div>

        <div className="calendar-stepper-group">
          <button onClick={prevMonth} className="stepper-btn" aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="stepper-today-btn">
            TODAY
          </button>
          <button onClick={nextMonth} className="stepper-btn" aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {/* Weekday Labels */}
      <div className="calendar-weekday-strip">
        {dayNames.map(d => (
          <div key={d} className="calendar-weekday-cell">{d}</div>
        ))}
      </div>

      {/* Days Matrix */}
      <div className="calendar-matrix-grid">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-matrix-cell empty" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const activities = activitiesByDate[day] || [];
          const isToday = day === new Date().getDate() && 
            currentDate.getMonth() === new Date().getMonth() && 
            currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div 
              key={day} 
              className={`calendar-matrix-cell ${isToday ? 'cell-today' : ''} ${activities.length > 0 ? 'has-activity' : ''}`}
            >
              <div className="cell-header">
                <span className="cell-day-num">{day}</span>
                {activities.length > 0 && (
                  <span className="cell-event-pill">{activities.length}</span>
                )}
              </div>

              <div className="cell-events-list">
                {activities.map(a => (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/app/page/${a.id}`)}
                    className="cell-event-chip"
                    title={a.title || 'Untitled'}
                  >
                    <EmojiIcon emoji={a.icon || '📄'} size="11px" />
                    <span className="cell-event-title">{a.title || 'Untitled'}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// Archives Tab (Deep Vault Quarantine)
// ==========================================
interface ArchivesTabProps {
  archivedPages: any[];
  restore: (id: string) => Promise<any>;
  permaDelete: (id: string) => Promise<any>;
}

function ArchivesTab({ archivedPages, restore, permaDelete }: ArchivesTabProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (confirmDeleteId) {
      const timer = setTimeout(() => setConfirmDeleteId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmDeleteId]);

  if (archivedPages.length === 0) {
    return (
      <div className="vault-quarantine-empty animate-fade-in">
        <Trash2 size={44} className="quarantine-empty-icon" />
        <h3 className="quarantine-empty-title">Vault Quarantine is Empty</h3>
        <p className="quarantine-empty-desc">
          Archived documents are safely stored in local quarantine before permanent destruction. No decommissioned nodes detected.
        </p>
      </div>
    );
  }

  return (
    <div className="vault-quarantine-container animate-fade-in">
      <header className="quarantine-header">
        <div className="quarantine-stamp-row">
          <Trash2 size={14} className="text-warning" />
          <span>VAULT QUARANTINE // TOMBSTONE REGISTRY</span>
        </div>
        <h2 className="quarantine-heading">Quarantined Nodes</h2>
        <p className="quarantine-subheading">
          {archivedPages.length} {archivedPages.length === 1 ? 'node is' : 'nodes are'} decommissioned in offline storage. Nodes can be restored to active registry or purged permanently.
        </p>
      </header>

      <div className="quarantine-list" role="list">
        {archivedPages.map((page) => (
          <div key={page.id} className="quarantine-row" role="listitem">
            <div className="quarantine-row-info">
              <div className="quarantine-icon-box">
                <EmojiIcon emoji={page.icon || '📄'} size="18px" />
              </div>
              <div className="quarantine-text-group">
                <h4 className="quarantine-item-title">{page.title || 'Untitled Node'}</h4>
                <div className="quarantine-meta-line">
                  <span>Archived {formatRelativeTime(page.updatedAt)}</span>
                  <span className="quarantine-meta-sep">/</span>
                  <span className="quarantine-meta-id">ID: #{page.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>

            <div className="quarantine-actions">
              <button
                onClick={() => restore(page.id)}
                className="quarantine-btn restore"
                title="Restore node to active workspace"
              >
                <RotateCcw size={13} />
                <span>Restore Node</span>
              </button>

              <button
                onClick={() => {
                  if (confirmDeleteId === page.id) {
                    permaDelete(page.id);
                    setConfirmDeleteId(null);
                  } else {
                    setConfirmDeleteId(page.id);
                  }
                }}
                className={`quarantine-btn purge ${confirmDeleteId === page.id ? 'confirming' : ''}`}
                title="Permanently remove node from IndexedDB"
              >
                <Trash2 size={13} />
                <span>{confirmDeleteId === page.id ? 'Confirm Purge?' : 'Permanent Purge'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
