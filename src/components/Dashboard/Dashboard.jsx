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
import { useSettingsStore } from '../../stores/settingsStore';
import { OnboardingNarrative } from './OnboardingNarrative';
import { Activity, Brain, AlertCircle, TrendingUp, Search } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';
import { Flame } from 'lucide-react';
import RecallChallengeModal from './RecallChallengeModal';
import GraphView from './GraphView';
import ManiacLogo from '../Common/ManiacLogo';
import EmojiIcon from '../Common/EmojiIcon';

function Dashboard() {
  const pages = usePageStore((s) => s.pages);
  const archivedPages = usePageStore((s) => s.archivedPages);
  const restorePage = usePageStore((s) => s.restorePage);
  const deletePage = usePageStore((s) => s.deletePage);
  const userProfileImage = useSettingsStore((s) => s.userProfileImage);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Workspace');
  const [activePopover, setActivePopover] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('Appearance');
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  const loadNotifications = useNotificationStore((s) => s.loadNotifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const openSettings = (tab = 'Appearance') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };

  const togglePopover = (popover) => {
    if (activePopover === popover) setActivePopover(null);
    else setActivePopover(popover);
  };

  return (
    <div className="editor-scroll bg-primary dashboard-wrapper" style={{ height: '100%' }} onClick={() => setActivePopover(null)}>
      {/* Ambient background lighting */}
      <div className="bg-glow bg-glow-blue"></div>
      <div className="bg-glow bg-glow-purple"></div>
      <div className="bg-glow bg-glow-ember"></div>

      {/* Settings Modal */}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} initialTab={settingsTab} />}

      {/* Dashboard Topbar */}
      <div className="dashboard-topbar" style={{ paddingLeft: sidebarOpen ? '32px' : '56px' }}>
        <div className="dashboard-brand-container">
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
              {unreadCount > 0 && (
                <span className="notification-badge pulsing" />
              )}
            </button>
            {activePopover === 'notifications' && <NotificationsPopover onClose={() => setActivePopover(null)} />}
          </div>

          <div style={{ position: 'relative' }}>
            <button aria-label="Profile" className="dashboard-profile-btn" onClick={() => togglePopover('profile')}>
              <div className="dashboard-profile-avatar" style={{ padding: 0, overflow: 'hidden' }}>
                {userProfileImage ? (
                  <img src={userProfileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={16} />
                )}
              </div>
            </button>
            {activePopover === 'profile' && <ProfilePopover onClose={() => setActivePopover(null)} onOpenSettings={openSettings} />}
          </div>
        </div>
      </div>

      <div className="editor-container dashboard-main-content">
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

  // Active Recall additions
  const pages = usePageStore(s => s.pages);
  const updatePage = usePageStore(s => s.updatePage);
  const srsStreak = useSettingsStore(s => s.srsStreak);
  const [srsModalOpen, setSrsModalOpen] = useState(false);

  const srsPages = pages.filter(p => p.srsEnabled);
  const duePages = srsPages.filter(p => p.srsNextReview && p.srsNextReview <= Date.now());

  useEffect(() => {
    analyze();
  }, [key]);

  if (isAnalyzing && !nextActions.length) {
    return (
      <div className="intelligence-loading">
        <div className="spinner"></div>
        <div className="intelligence-loading-title">Analyzing nodes...</div>
        <div className="intelligence-loading-subtitle">Scanning for patterns and stale thoughts.</div>
      </div>
    );
  }

  return (
    <div className="intelligence-container animate-fade-in">
      <div className="intelligence-header">
        <div className="intelligence-title-row">
          <Brain size={28} className="intelligence-header-icon" />
          <h2 className="intelligence-title">Decision Engine</h2>
        </div>
        <p className="intelligence-subtitle">Intelligence derived from your behavior and content.</p>
      </div>

      <div className={`intelligence-card srs-card ${duePages.length > 0 ? 'glass active-recall-due' : ''}`}>
        <div className="srs-header">
          <div className="srs-info">
            <div className="srs-icon-container">
              <Brain size={20} />
            </div>
            <div>
              <h3 className="srs-title">Active Recall Queue</h3>
              <p className="srs-description">
                {srsPages.length === 0 
                  ? 'Enable Spaced Repetition on your pages to retain information.' 
                  : duePages.length === 0 
                    ? 'All caught up! Your memory traces are reinforced and stable.' 
                    : `${duePages.length} notes are due for cognitive recall checks.`}
              </p>
            </div>
          </div>
          <div className="srs-streak-badge">
            <Flame size={16} />
            <span>Streak: {srsStreak || 0}d</span>
          </div>
        </div>

        {srsPages.length > 0 && (
          <div className="srs-progress-bar">
            <div 
              className="srs-progress-fill"
              style={{
                width: `${srsPages.length > 0 ? ((srsPages.length - duePages.length) / srsPages.length) * 100 : 0}%`
              }}
            />
          </div>
        )}

        {duePages.length > 0 ? (
          <button 
            className="btn btn-primary srs-start-btn"
            onClick={() => setSrsModalOpen(true)}
          >
            <Brain size={16} /> Start Recall Checks ({duePages.length} due)
          </button>
        ) : srsPages.length === 0 ? (
          <div className="srs-tip">
            Tip: Go to any page and toggle "Active Recall" in the page header to add it to your daily practice.
          </div>
        ) : null}
      </div>

      {srsModalOpen && (
        <RecallChallengeModal 
          duePages={duePages} 
          updatePage={updatePage} 
          onClose={() => setSrsModalOpen(false)} 
        />
      )}

      <div className="intelligence-grid">
        {/* Next Actions */}
        <div className="intelligence-card glass card-next-actions">
          <div className="intelligence-card-header">
            <Zap size={18} />
            <h3>What should I do next?</h3>
          </div>
          <div className="intelligence-card-content">
            {nextActions.length > 0 ? nextActions.map(action => (
              <div
                key={action.id}
                className="intelligence-item"
                onClick={() => navigate(`/page/${action.pageId}`)}
              >
                <div className="intelligence-item-inner">
                  {action.priority > 0 && <span className={`priority-tag p-${action.priority}`}>!</span>}
                  <span className="intelligence-item-text">{action.content}</span>
                </div>
              </div>
            )) : (
              <div className="intelligence-empty-state">No pending tasks detected.</div>
            )}
          </div>
        </div>

        {/* Forgetting */}
        <div className="intelligence-card glass card-forgetting">
          <div className="intelligence-card-header">
            <AlertCircle size={18} />
            <h3>What am I forgetting?</h3>
          </div>
          <div className="intelligence-card-content">
            {forgetting.stalePages.length > 0 && (
              <div className="intelligence-sub-section">
                <div className="intelligence-sub-title">STALE PAGES</div>
                <div className="intelligence-sub-list">
                  {forgetting.stalePages.slice(0, 3).map(page => (
                    <div key={page.id} className="intelligence-item" onClick={() => navigate(`/page/${page.id}`)}>
                      <span className="intelligence-item-text flex-align">
                        <EmojiIcon emoji={page.icon || '📄'} size="14px" />
                        <span>{page.title}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {forgetting.abandonedTodos.length > 0 && (
              <div className="intelligence-sub-section">
                <div className="intelligence-sub-title">ABANDONED TASKS</div>
                <div className="intelligence-sub-list">
                  {forgetting.abandonedTodos.slice(0, 3).map(todo => (
                    <div key={todo.id} className="intelligence-item" onClick={() => navigate(`/page/${todo.pageId}`)}>
                      <span className="intelligence-item-text">{todo.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {forgetting.stalePages.length === 0 && forgetting.abandonedTodos.length === 0 && (
              <div className="intelligence-empty-state">Your memory is synchronized.</div>
            )}
          </div>
        </div>

        {/* Weekly Focus */}
        <div className="intelligence-card glass card-weekly-focus">
          <div className="intelligence-card-header">
            <TrendingUp size={18} />
            <h3>What matters this week?</h3>
          </div>
          <div className="intelligence-card-content">
            {weeklyFocus ? (
              <div className="weekly-focus-stats">
                <div className="focus-stat-card">
                  <div className="focus-stat-value">{weeklyFocus.activePages}</div>
                  <div className="focus-stat-label">Active Nodes this week</div>
                </div>
                <div className="focus-trackers-section">
                  <div className="intelligence-sub-title">TOP TRACKERS</div>
                  <div className="focus-trackers-list">
                    {weeklyFocus.trackerStats.map(stat => (
                      <div key={stat.id} className="focus-tracker-tag">
                        <span className="tracker-name">{stat.name}</span>
                        <span className="tracker-count">{stat.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="intelligence-empty-state">Insufficient data for this week.</div>
            )}
          </div>
        </div>
      </div>

      {/* Logic for Feedback Loop */}
      <div className="intelligence-card growth-card">
        <div className="growth-header">
          <h3 className="growth-title">Knowledge Growth Curve</h3>
          <span className="growth-depth-badge">Level {knowledgeVelocity?.depthLevel || 1} Depth</span>
        </div>
        <div className="growth-chart-container">
          {(knowledgeVelocity?.dailyActivity || [5, 5, 5, 5, 5, 5, 5]).map((h, i) => (
            <div 
              key={i} 
              className="growth-chart-bar" 
              style={{ 
                height: `${h}%`,
                '--bar-index': i
              }}
              title={`Day ${i+1}: ${h}%`}
            />
          ))}
        </div>
        <p className="growth-footer">
          Maniac is becoming more personalized as you add more nodes. Current personalization depth is optimized.
        </p>
      </div>
    </div>
  );
}

// ==========================================
// Hero Greeting Component
// ==========================================
function HeroGreeting({ pages }) {
  const [greeting, setGreeting] = useState('');
  const [tagline, setTagline] = useState('');

  useEffect(() => {
    const hrs = new Date().getHours();
    let text = 'Good evening, Commander';
    if (hrs < 12) text = 'Good morning, Commander';
    else if (hrs < 18) text = 'Good afternoon, Commander';
    setGreeting(text);

    const taglines = [
      'Your thoughts. Encrypted. Alive.',
      'A second brain, forged in obsidian.',
      'Decisions driven by local-first intelligence.',
      'Fractured monolith. Unified intelligence.'
    ];
    let currentIndex = 0;
    setTagline(taglines[0]);

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % taglines.length;
      setTagline(taglines[currentIndex]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const totalNodes = pages.length;
  const activeWeekNodes = pages.filter(p => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return new Date(p.updatedAt).getTime() > oneWeekAgo;
  }).length;

  return (
    <div className="dashboard-hero-section">
      <div className="dashboard-hero-logo">
        <ManiacLogo size="xl" animate={true} />
      </div>
      <div className="dashboard-hero-content">
        <h1 className="dashboard-hero-title">{greeting}</h1>
        <p className="dashboard-hero-tagline">{tagline}</p>

        <div className="dashboard-status-strip">
          <div className="status-item">
            <span className="status-dot pulsing" />
            <span className="status-label">Decision Engine Active</span>
          </div>
          <div className="status-divider" />
          <div className="status-item">
            <span className="status-value">{totalNodes}</span>
            <span className="status-label">Nodes</span>
          </div>
          <div className="status-divider" />
          <div className="status-item">
            <span className="status-value">+{activeWeekNodes}</span>
            <span className="status-label">Velocity (7d)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// WorkspaceTab
// ==========================================
function WorkspaceTab({ pages, navigate }) {
  const [recentPages, setRecentPages] = useState([]);
  const [pinnedPages, setPinnedPages] = useState([]);
  const lastVisitedPageId = useUIStore(s => s.lastVisitedPageId);
  const onboardingStatus = useUIStore(s => s.onboardingStatus);
  const lastVisitedPage = lastVisitedPageId ? pages.find(p => p.id === lastVisitedPageId) : null;
  const key = useSecurityStore(s => s.derivedKey);
  const { nextActions, analyze } = useIntelligenceStore();

  useEffect(() => {
    analyze();
  }, [key]);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const recent = await db.pages.orderBy('updatedAt').reverse().limit(6).toArray();
        const pinned = await db.pages.orderBy('createdAt').limit(4).toArray();

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
    <div className="workspace-tab-container">
      {/* Hero Greeting Panel */}
      <HeroGreeting pages={pages} />

      {/* Smart Resurfacing */}
      {lastVisitedPage && (
        <div className="continue-pill-wrapper">
          <div
            className="continue-pill"
            onClick={() => navigate(`/page/${lastVisitedPage.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/page/${lastVisitedPage.id}`); } }}
          >
            <RotateCcw size={14} className="continue-icon" />
            <span>Continue {lastVisitedPage.title || 'Untitled'}</span>
            <ChevronRight size={14} className="continue-chevron" />
          </div>
        </div>
      )}

      {/* Onboarding Narrative Widget */}
      {!onboardingStatus?.isComplete && (
        <OnboardingNarrative onComplete={() => useUIStore.getState().updateOnboarding('isComplete')} />
      )}

      {/* Asymmetrical Split Pane */}
      <div className="dashboard-split-pane">

        {/* LEFT PANE: Pinned & Recent */}
        <div className="dashboard-pane-left">

          {/* Pinned Nodes Bento Grid */}
          <div className="bento-container">
            <div className="section-header">
              <Pin size={16} />
              <h3>Pinned Nodes</h3>
            </div>
            
            <div className="bento-grid">
              {pinnedPages.length > 0 ? pinnedPages.map((page, index) => {
                // Determine size based on index to create an interlocking bento layout
                let sizeClass = '';
                if (index === 0) sizeClass = 'bento-large';
                else if (index === 1) sizeClass = 'bento-tall';
                else if (index === 2) sizeClass = 'bento-wide';

                return (
                  <div
                    key={page.id}
                    className={`bento-item ${sizeClass}`}
                    onClick={() => navigate(`/page/${page.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/page/${page.id}`); } }}
                  >
                    <div className="bento-content-top">
                      <div className="bento-icon-wrapper">
                        <EmojiIcon emoji={page.icon || '📄'} size={sizeClass === 'bento-large' ? '28px' : '20px'} />
                      </div>
                      <div className="bento-title">
                        {page.title || 'Untitled'}
                      </div>
                    </div>
                    {sizeClass === 'bento-large' && (
                      <div className="bento-meta">
                        <Clock size={12} /> <span>{new Date(page.updatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div className="bento-item bento-wide empty-bento">
                  <span>No pinned pages</span>
                </div>
              )}
            </div>
          </div>

          {/* Recent Pages Timeline */}
          <div className="timeline-container-el">
            <div className="section-header">
              <Clock size={16} />
              <h3>Recent Activity</h3>
            </div>
            
            <div className="timeline">
              {recentPages.length > 0 ? recentPages.map(page => (
                <div
                  key={page.id}
                  className="timeline-item"
                  onClick={() => navigate(`/page/${page.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/page/${page.id}`); } }}
                >
                  <div className="timeline-dot"></div>
                  <div className="timeline-item-content">
                    <div className="timeline-icon-box">
                      <EmojiIcon emoji={page.icon || '📄'} size="16px" />
                    </div>
                    <div className="timeline-text-box">
                      <span className="timeline-item-title">{page.title || 'Untitled'}</span>
                      <span className="timeline-item-date">Modified {new Date(page.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="timeline-empty">No recent activity.</div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT PANE: Actions & Graph */}
        <div className="dashboard-pane-right">

          {/* Action Chips */}
          <div className="actions-section">
            <div className="section-header header-ember">
              <Zap size={16} />
              <h3>Suggested Actions</h3>
            </div>

            <div className="action-chips-container">
              {nextActions.slice(0, 5).map(action => (
                <div
                  key={action.id}
                  className="action-chip"
                  onClick={() => navigate(`/page/${action.pageId}`)}
                >
                  {action.priority > 0 && <span className="action-priority-marker">!</span>}
                  <span className="action-chip-text">{action.content}</span>
                </div>
              ))}
              {nextActions.length === 0 && (
                <div className="action-empty">No immediate actions needed.</div>
              )}
            </div>
          </div>

          {/* Circular/Bleeding Network Graph */}
          <div className="network-container">
            <div className="section-header">
              <Activity size={16} />
              <h3>Network</h3>
            </div>
            <div className="graph-wrapper">
              <GraphView pages={pages} />
            </div>
          </div>

        </div>
      </div>
    </div>
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
    const d = new Date(p.createdAt);
    if (d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth()) {
      const day = d.getDate();
      if (!activitiesByDate[day]) activitiesByDate[day] = [];
      activitiesByDate[day].push(p);
    }
  });

  return (
    <div className="calendar-tab-container">
      <div className="calendar-header">
        <div className="calendar-title-section">
          <h2 className="calendar-title">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          <p className="calendar-subtitle">Activity tracking and creation logs</p>
        </div>
        <div className="calendar-controls">
          <button onClick={prevMonth} className="calendar-ctrl-btn">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="calendar-today-btn">
            Today
          </button>
          <button onClick={nextMonth} className="calendar-ctrl-btn">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="calendar-grid-labels">
        {dayNames.map(d => (
          <div key={d} className="calendar-grid-label">{d}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day empty"></div>
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const activities = activitiesByDate[day] || [];
          const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div key={day} className={`calendar-day ${isToday ? 'today' : ''} ${activities.length > 0 ? 'has-events' : ''}`}>
              <div className="calendar-day-header">
                <span className="day-number">{day}</span>
                {activities.length > 0 && <span className="day-badge">{activities.length}</span>}
              </div>
              <div className="calendar-events">
                {activities.map(a => (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/page/${a.id}`)}
                    className="calendar-event-btn"
                    title={a.title || 'Untitled'}
                  >
                    <EmojiIcon emoji={a.icon || '📄'} size="12px" />
                    <span className="event-title">{a.title || 'Untitled'}</span>
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
      <div className="empty-state-container">
        <Trash2 size={48} className="empty-state-icon" />
        <h3 className="empty-state-title">Archives are empty</h3>
        <p className="empty-state-desc">Archived pages will appear here. You can permanently delete them or restore them to the workspace.</p>
      </div>
    );
  }

  return (
    <div className="archives-tab-container">
      <div className="archives-header">
        <h2 className="archives-title">Archives</h2>
        <p className="archives-subtitle">Review, restore, or permanently delete nodes from your vault.</p>
      </div>

      <div className="archives-list">
        {archivedPages.map((page) => (
          <div key={page.id} className="archive-item">
            <div className="archive-item-info">
              <div className="archive-item-icon">
                <EmojiIcon emoji={page.icon || '📄'} size="20px" />
              </div>
              <div className="archive-item-meta">
                <div className="archive-item-title">{page.title || 'Untitled'}</div>
                <div className="archive-item-date">Archived on {new Date(page.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="archive-item-actions">
              <button
                onClick={() => restore(page.id)}
                className="archive-btn restore"
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
                className={`archive-btn delete ${confirmDeleteId === page.id ? 'confirming' : ''}`}
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

