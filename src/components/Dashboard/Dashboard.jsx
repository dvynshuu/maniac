import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { useUIStore } from '../../stores/uiStore';
import { useSecurityStore } from '../../stores/securityStore';
import { db } from '../../db/database';
import { SecurityService } from '../../utils/securityService';
import { Settings, Bell, User, Clock, HardDrive, Zap, Pin, Maximize2, RotateCcw, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { batchDecrypt } from '../../utils/cryptoWorker';
import './Dashboard.css';
import { ProfilePopover } from './ProfilePopover';
import { NotificationsPopover } from './NotificationsPopover';
import { SettingsModal } from '../Settings/SettingsModal';
import { useIntelligenceStore } from '../../stores/intelligenceStore';
import { OnboardingNarrative } from './OnboardingNarrative';
import { Activity, Brain, AlertCircle, TrendingUp, Search } from 'lucide-react';
import GraphView from './GraphView';

function Dashboard() {
  const pages = usePageStore((s) => s.pages);
  const archivedPages = usePageStore((s) => s.archivedPages);
  const restorePage = usePageStore((s) => s.restorePage);
  const deletePage = usePageStore((s) => s.deletePage);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Workspace');
  const [activePopover, setActivePopover] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('Appearance');
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  const openSettings = (tab = 'Appearance') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const togglePopover = (popover) => {
    if (activePopover === popover) setActivePopover(null);
    else setActivePopover(popover);
  };
  
  return (
    <div className="editor-scroll bg-primary" style={{ height: '100%' }} onClick={() => setActivePopover(null)}>
      {/* Settings Modal */}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} initialTab={settingsTab} />}

      {/* Dashboard Topbar */}
      <div className="dashboard-topbar" style={{ paddingLeft: sidebarOpen ? '32px' : '56px' }}>
        <div className="dashboard-brand-container">
          <div className="dashboard-brand-title">Maniac OS</div>
          <div className="dashboard-tabs" role="tablist">
            {['Workspace', 'Intelligence', 'Calendar', 'Archives'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                role="tab"
                aria-selected={activeTab === tab}
                className="dashboard-tab"
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="dashboard-actions" onClick={e => e.stopPropagation()}>
          <button aria-label="Settings" className="icon-btn" onClick={() => openSettings('Appearance')}>
            <Settings size={18} />
          </button>
          
          <div style={{ position: 'relative' }}>
            <button aria-label="Notifications" className="icon-btn" onClick={() => togglePopover('notifications')}>
              <Bell size={18} />
            </button>
            {activePopover === 'notifications' && <NotificationsPopover onClose={() => setActivePopover(null)} />}
          </div>

          <div style={{ position: 'relative' }}>
            <button aria-label="Profile" className="dashboard-profile-btn" onClick={() => togglePopover('profile')}>
              <div className="dashboard-profile-avatar">
                <User size={16} />
              </div>
            </button>
            {activePopover === 'profile' && <ProfilePopover onClose={() => setActivePopover(null)} onOpenSettings={openSettings} />}
          </div>
        </div>
      </div>

      <div className="editor-container" style={{ maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {activeTab === 'Workspace' && <WorkspaceTab pages={pages} navigate={navigate} />}
        {activeTab === 'Intelligence' && <IntelligenceTab navigate={navigate} />}
        {activeTab === 'Calendar' && <CalendarTab pages={pages} navigate={navigate} />}
        {activeTab === 'Archives' && <ArchivesTab archivedPages={archivedPages} restore={restorePage} permaDelete={deletePage} />}
      </div>
    </div>
  );
}

// ==========================================
// Intelligence Tab (Decision Engine)
// ==========================================
function IntelligenceTab({ navigate }) {
  const { nextActions, forgetting, weeklyFocus, knowledgeVelocity, analyze, isAnalyzing } = useIntelligenceStore();
  const key = useSecurityStore(s => s.derivedKey);

  useEffect(() => {
    analyze();
  }, [key]);

  if (isAnalyzing && !nextActions.length) {
    return (
      <div style={{ padding: '64px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 24px' }}></div>
        <div style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 600 }}>Analyzing nodes...</div>
        <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: '8px' }}>Scanning for patterns and stale thoughts.</div>
      </div>
    );
  }

  return (
    <div className="intelligence-container animate-fade-in">
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Brain size={24} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Decision Engine</h2>
        </div>
        <p style={{ fontSize: '16px', color: 'var(--text-tertiary)', margin: 0 }}>Intelligence derived from your behavior and content.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
        {/* Next Actions */}
        <div className="intelligence-card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Zap size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>What should I do next?</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {nextActions.length > 0 ? nextActions.map(action => (
              <div 
                key={action.id} 
                className="intelligence-item"
                onClick={() => navigate(`/page/${action.pageId}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   {action.priority > 0 && <span className={`priority-tag p-${action.priority}`}>!</span>}
                   <span style={{ fontSize: '14px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{action.content}</span>
                </div>
              </div>
            )) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>No pending tasks detected.</div>
            )}
          </div>
        </div>

        {/* Forgetting */}
        <div className="intelligence-card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <AlertCircle size={18} color="var(--warning)" />
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>What am I forgetting?</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {forgetting.stalePages.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold', marginBottom: '8px' }}>STALE PAGES</div>
                {forgetting.stalePages.slice(0, 3).map(page => (
                  <div key={page.id} className="intelligence-item" onClick={() => navigate(`/page/${page.id}`)}>
                    <span style={{ fontSize: '13px' }}>{page.icon || '📄'} {page.title}</span>
                  </div>
                ))}
              </div>
            )}
            {forgetting.abandonedTodos.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold', marginBottom: '8px' }}>ABANDONED TASKS</div>
                {forgetting.abandonedTodos.slice(0, 3).map(todo => (
                  <div key={todo.id} className="intelligence-item" onClick={() => navigate(`/page/${todo.pageId}`)}>
                    <span style={{ fontSize: '13px' }}>{todo.content}</span>
                  </div>
                ))}
              </div>
            )}
            {forgetting.stalePages.length === 0 && forgetting.abandonedTodos.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>Your memory is synchronized.</div>
            )}
          </div>
        </div>

        {/* Weekly Focus */}
        <div className="intelligence-card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <TrendingUp size={18} color="var(--success)" />
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>What matters this week?</h3>
          </div>
          {weeklyFocus ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{weeklyFocus.activePages}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Active Nodes this week</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold', marginBottom: '8px' }}>TOP TRACKERS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {weeklyFocus.trackerStats.map(stat => (
                    <div key={stat.id} style={{ background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>
                      {stat.name}: {stat.count}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>Insufficient data for this week.</div>
          )}
        </div>
      </div>

      {/* Logic for Feedback Loop */}
      <div className="intelligence-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Knowledge Growth Curve</h3>
        <div style={{ height: '200px', width: '100%', background: 'var(--bg-elevated)', borderRadius: '12px', display: 'flex', alignItems: 'flex-end', padding: '20px', gap: '10px' }}>
           {(knowledgeVelocity?.dailyActivity || [5,5,5,5,5,5,5]).map((h, i) => (
             <div key={i} style={{ flex: 1, height: `${h}%`, background: 'var(--accent-primary)', opacity: 0.2 + (i * 0.1), borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease-out' }}></div>
           ))}
        </div>
        <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-tertiary)' }}>Maniac is becoming more personalized as you add more nodes. Current personalization depth: <b>Level {knowledgeVelocity?.depthLevel || 1}</b></p>
      </div>
    </div>
  );
}

// ==========================================
// Workspace Tab
// ==========================================
function WorkspaceTab({ pages, navigate }) {
  const [recentPages, setRecentPages] = useState([]);
  const [pinnedPages, setPinnedPages] = useState([]);
  const lastVisitedPageId = useUIStore(s => s.lastVisitedPageId);
  const onboardingStatus = useUIStore(s => s.onboardingStatus);
  const lastVisitedPage = lastVisitedPageId ? pages.find(p => p.id === lastVisitedPageId) : null;
  const key = useSecurityStore(s => s.derivedKey);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const recent = await db.pages.orderBy('updatedAt').reverse().limit(4).toArray();
        // Since isFavorite isn't indexed yet, we'll fetch mock pinned via createdAt limit
        const pinned = await db.pages.orderBy('createdAt').limit(3).toArray();
        
        // Decrypt titles if needed
        const decryptTitles = async (list) => {
           return Promise.all(list.map(async p => {
             if (key && p._isEncrypted && p.title) {
               try {
                 const decrypted = await SecurityService.decrypt(p.title, key);
                 return { ...p, title: decrypted || '🔒 Decryption Failed' };
               } catch {
                 return { ...p, title: '🔒 Decryption Failed' };
               }
             }
             return p;
           }));
        };

        setRecentPages(await decryptTitles(recent));
        setPinnedPages(await decryptTitles(pinned));
      } catch (err) {
        console.error(err);
      }
    };
    fetchPages();
  }, [key, pages.length]); // Re-run when new pages are created

  return (
    <>
      {/* Smart Resurfacing */}
      {lastVisitedPage && (
        <div 
          className="interactive-card"
          onClick={() => navigate(`/page/${lastVisitedPage.id}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/page/${lastVisitedPage.id}`); } }}
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px 24px', marginBottom: '24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <RotateCcw size={18} color="var(--accent-primary)" />
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Continue where you left off</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{lastVisitedPage.icon || '📄'} {lastVisitedPage.title || 'Untitled'}</span>
            <ChevronRight size={16} color="var(--text-tertiary)" />
          </div>
        </div>
      )}

      {/* Onboarding Narrative Widget */}
      {!onboardingStatus?.isComplete && (
        <OnboardingNarrative onComplete={() => useUIStore.getState().updateOnboarding('isComplete')} />
      )}

      {/* Header Section */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: '8px' }}>CURATOR SYSTEM V1.0</div>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '32px' }}>Welcome back, Maniac.</h1>
        
        {/* Metrics */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', width: '140px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '8px' }}>KNOWLEDGE VELOCITY</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{useIntelligenceStore.getState().knowledgeVelocity.velocity} <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>%</span></div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', width: '140px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '8px' }}>TOTAL NODES</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{pages.length} <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>obj</span></div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', width: '140px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '8px' }}>STATUS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '4px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></div>
              Decision Engine Active
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Pinned Pages */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, marginBottom: '4px' }}>Pinned Pages</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>Your immediate priority nodes</p>
            </div>
            <button className="text-link-btn">View Workspace</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {pinnedPages.length > 0 ? pinnedPages.map(page => (
              <div 
                key={page.id} 
                onClick={() => navigate(`/page/${page.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/page/${page.id}`); } }}
                className="interactive-card"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all var(--transition-fast)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '24px' }}>{page.icon || '📄'}</div>
                  <Pin size={14} color="var(--text-tertiary)" />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {page.title || 'Untitled'}
                </div>
              </div>
            )) : (
              <div className="empty-state-container" style={{ gridColumn: '1 / -1', padding: '24px' }}>
                <Pin className="empty-state-icon" size={24} style={{ marginBottom: '8px' }} />
                <div className="empty-state-title" style={{ fontSize: '14px', marginBottom: '4px' }}>No pinned pages</div>
                <div className="empty-state-desc" style={{ fontSize: '12px' }}>Important nodes will appear here.</div>
              </div>
            )}
          </div>
        </div>

        {/* Graph View Card */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <GraphView pages={pages} />
        </div>
      </div>
      
      {/* Recent Pages List */}
      <div style={{ marginTop: '8px', paddingBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentPages.length > 0 ? recentPages.map(page => (
                <div 
                  key={page.id} 
                  onClick={() => navigate(`/page/${page.id}`)} 
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/page/${page.id}`); } }}
                  className="interactive-card"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-tertiary)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-secondary)' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ fontSize: '18px' }}>{page.icon || '📄'}</div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{page.title || 'Untitled'}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{new Date(page.updatedAt).toLocaleDateString()}</div>
                </div>
            )) : (
              <div className="empty-state-container" style={{ padding: '24px' }}>
                <Clock className="empty-state-icon" size={32} style={{ marginBottom: '12px' }} />
                <div className="empty-state-title" style={{ fontSize: '16px', marginBottom: '4px' }}>No recent activity</div>
                <div className="empty-state-desc">Workspace nodes you view or edit will appear here.</div>
              </div>
            )}
          </div>
      </div>
    </>
  );
}

// ==========================================
// Calendar Tab
// ==========================================
function CalendarTab({ pages, navigate }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  // Map pages to dates
  const activitiesByDate = {};
  pages.forEach(p => {
    // We map by creation date or update date depending on the goal. Using creation date.
    const d = new Date(p.createdAt);
    if (d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth()) {
      const day = d.getDate();
      if (!activitiesByDate[day]) activitiesByDate[day] = [];
      activitiesByDate[day].push(p);
    }
  });

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', margin: '4px 0 0 0' }}>Activity tracking and creation logs</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={prevMonth} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '8px', padding: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrentDate(new Date())} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '8px', padding: '8px 16px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}>
            Today
          </button>
          <button onClick={nextMonth} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '8px', padding: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
        {dayNames.map(d => (
          <div key={d} style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: 'bold', padding: '8px' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} style={{ background: 'transparent', minHeight: '120px' }}></div>
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const activities = activitiesByDate[day] || [];
          const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div key={day} style={{ 
              background: 'var(--bg-elevated)', 
              border: isToday ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)', 
              borderRadius: '8px', 
              padding: '12px', 
              minHeight: '120px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{day}</span>
                {activities.length > 0 && <span style={{ fontSize: '10px', background: 'var(--accent-primary)', color: '#fff', padding: '2px 6px', borderRadius: '12px' }}>{activities.length}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
                {activities.map(a => (
                  <button 
                    key={a.id} 
                    onClick={() => navigate(`/page/${a.id}`)}
                    className="calendar-event-btn"
                    title={a.title || 'Untitled'}
                  >
                    {a.icon || '📄'} {a.title || 'Untitled'}
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
// Archives Tab
// ==========================================
function ArchivesTab({ archivedPages, restore, permaDelete }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    if (confirmDeleteId) {
      const timer = setTimeout(() => setConfirmDeleteId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmDeleteId]);

  if (archivedPages.length === 0) {
    return (
      <div className="empty-state-container" style={{ margin: '64px auto', maxWidth: '400px', background: 'transparent', border: 'none' }}>
        <Trash2 size={48} className="empty-state-icon" />
        <h3 className="empty-state-title" style={{ fontSize: '20px' }}>Archives are empty</h3>
        <p className="empty-state-desc">Archived pages will appear here. You can permanently delete them or restore them to the workspace.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, marginBottom: '8px' }}>Archives</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>Review, restore, or permanently delete nodes.</p>
        </div>
      </div>

      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        {archivedPages.map((page, i) => (
          <div key={page.id} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px 24px', 
            borderBottom: i < archivedPages.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            background: 'var(--bg-secondary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '20px', opacity: 0.5 }}>{page.icon || '📄'}</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{page.title || 'Untitled'}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Archived on {new Date(page.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => restore(page.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
              >
                <RotateCcw size={14} /> Restore
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
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: confirmDeleteId === page.id ? 'var(--error)' : 'var(--error-subtle)', 
                  border: '1px solid transparent', 
                  color: confirmDeleteId === page.id ? 'white' : 'var(--error)', 
                  padding: '6px 12px', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontSize: '13px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Trash2 size={14} /> {confirmDeleteId === page.id ? 'Confirm?' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
