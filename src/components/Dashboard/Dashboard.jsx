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
import { OnboardingNarrative } from './OnboardingNarrative';

function Dashboard() {
  const pages = usePageStore((s) => s.pages);
  const archivedPages = usePageStore((s) => s.archivedPages);
  const restorePage = usePageStore((s) => s.restorePage);
  const deletePage = usePageStore((s) => s.deletePage);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Workspace');
  const [activePopover, setActivePopover] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const togglePopover = (popover) => {
    if (activePopover === popover) setActivePopover(null);
    else setActivePopover(popover);
  };
  
  return (
    <div className="editor-scroll bg-primary" style={{ height: '100%' }} onClick={() => setActivePopover(null)}>
      {/* Settings Modal */}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}

      {/* Dashboard Topbar */}
      <div className="dashboard-topbar">
        <div className="dashboard-brand-container">
          <div className="dashboard-brand-title">Maniac OS</div>
          <div className="dashboard-tabs" role="tablist">
            {['Workspace', 'Daily Review', 'Calendar', 'Archives'].map(tab => (
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
          <button aria-label="Settings" className="icon-btn" onClick={() => setIsSettingsOpen(true)}>
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
            {activePopover === 'profile' && <ProfilePopover onClose={() => setActivePopover(null)} />}
          </div>
        </div>
      </div>

      <div className="editor-container" style={{ maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {activeTab === 'Workspace' && <WorkspaceTab pages={pages} navigate={navigate} />}
        {activeTab === 'Daily Review' && <DailyReviewTab navigate={navigate} />}
        {activeTab === 'Calendar' && <CalendarTab pages={pages} navigate={navigate} />}
        {activeTab === 'Archives' && <ArchivesTab archivedPages={archivedPages} restore={restorePage} permaDelete={deletePage} />}
      </div>
    </div>
  );
}

// ==========================================
// Daily Review Tab
// ==========================================
function DailyReviewTab({ navigate }) {
  const [unfinishedBlocks, setUnfinishedBlocks] = useState([]);
  const [trackerTrends, setTrackerTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const key = useSecurityStore(s => s.derivedKey);

  useEffect(() => {
    const fetchReviewData = async () => {
      try {
        setLoading(true);
        // Fetch unfinished todos — limit to 500 max to bound the decrypt cost
        const allTodosRaw = await db.blocks.where('type').equals('todo').reverse().sortBy('updatedAt');
        const allTodos = allTodosRaw.slice(0, 500);
        
        const decryptFn = async (todo, k) => {
          let props = todo.properties || {};
          let content = todo.content || '';
          if (k && todo._isEncrypted) {
             try {
                if (typeof props === 'string') props = JSON.parse(await SecurityService.decrypt(props, k));
                if (typeof content === 'string') content = await SecurityService.decrypt(content, k);
             } catch {
                props = {};
                content = 'Encrypted...';
             }
          }
          return { ...todo, properties: props, content };
        };

        // Stream decrypted items into the UI as batches finish
        const onProgress = (currentDecrypted) => {
           const unfinished = currentDecrypted.filter(t => t.properties?.checked === false).slice(0, 100);
           setUnfinishedBlocks(unfinished);
        };

        const decryptedTodos = await batchDecrypt(allTodos, key, decryptFn, 20, onProgress);
        
        // Final pass
        const reviewTodos = decryptedTodos.filter(t => t.properties?.checked === false).slice(0, 100);
        setUnfinishedBlocks(reviewTodos);

        // Fetch tracker trends
        const trackers = await db.trackers.toArray();
        const trends = await Promise.all(trackers.map(async (t) => {
           const entries = await db.tracker_entries.where('trackerId').equals(t.id).toArray();
           return { ...t, entryCount: entries.length };
        }));
        setTrackerTrends(trends);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviewData();
  }, [key]);

  if (loading) return <div style={{ padding: '32px', color: 'var(--text-tertiary)' }}>Loading review data...</div>;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, marginBottom: '8px' }}>Daily Review</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>Review unfinished tasks and recent trends.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 16px 0' }}>Unfinished Tasks</h3>
          {unfinishedBlocks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {unfinishedBlocks.map(block => (
                <div 
                  key={block.id} 
                  onClick={() => navigate(`/page/${block.pageId}`)}
                  className="interactive-card"
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '2px solid var(--border-strong)' }}></div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{block.content || 'Empty task'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>Inbox Zero</div>
              <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>You're all caught up! Enjoy your focused momentum.</p>
            </div>
          )}
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 16px 0' }}>Tracker Overview</h3>
          {trackerTrends.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trackerTrends.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative', width: '32px', height: '32px' }}>
                      <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border-subtle)" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeDasharray={`${Math.min(100, (t.entryCount / 30) * 100)}, 100`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
                      </svg>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{t.title || 'Untitled'}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{t.entryCount} total</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>No trackers found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Workspace Tab
// ==========================================
function WorkspaceTab({ pages, navigate }) {
  const recentPages = [...pages].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
  const pinnedPages = [...pages].sort((a, b) => a.createdAt - b.createdAt).slice(0, 3); // mock pinned
  const lastVisitedPageId = useUIStore(s => s.lastVisitedPageId);
  const onboardingStatus = useUIStore(s => s.onboardingStatus);
  const lastVisitedPage = lastVisitedPageId ? pages.find(p => p.id === lastVisitedPageId) : null;

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
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '8px' }}>LATENCY</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>0 <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>ms</span></div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', width: '140px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '8px' }}>STORAGE</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>100 <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>% Local</span></div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', width: '140px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '8px' }}>STATUS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '4px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></div>
              Optimized
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, marginBottom: '4px' }}>Graph View</h3>
              <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: 0, fontWeight: 'bold', letterSpacing: '0.05em' }}>{pages.length} NODES DETECTED</p>
            </div>
            <button aria-label="Maximize Graph" className="icon-btn-subtle"><Maximize2 size={16} /></button>
          </div>

          <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '30%', left: '30%', width: 6, height: 6, background: 'var(--accent-primary)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-primary)' }}></div>
              <div style={{ position: 'absolute', top: '70%', left: '70%', width: 8, height: 8, background: 'var(--accent-secondary)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-secondary)' }}></div>
              <div style={{ position: 'absolute', top: '40%', left: '80%', width: 5, height: 5, background: 'var(--text-tertiary)', borderRadius: '50%' }}></div>
              <svg width="100%" height="100%" style={{ position: 'absolute' }}>
                  <line x1="30%" y1="30%" x2="70%" y2="70%" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="70%" y1="70%" x2="80%" y2="40%" stroke="var(--border-subtle)" strokeWidth="1" />
              </svg>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Interactive mapping offline</div>
          </div>
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
