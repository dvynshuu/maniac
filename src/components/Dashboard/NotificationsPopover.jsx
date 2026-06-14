import React from 'react';
import { CheckCircle2, Zap, ShieldAlert, Archive, X } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';

const TYPE_MAP = {
  system: { icon: Zap, color: 'var(--success)' },
  security: { icon: ShieldAlert, color: 'var(--accent-primary)' },
  info: { icon: Archive, color: 'var(--text-tertiary)' }
};

function formatRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsPopover({ onClose }) {
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);

  return (
    <div className="dashboard-popover">
      <div className="popover-header">
        <span className="popover-title">Notifications</span>
        {notifications.some(n => !n.isRead) && (
          <button 
            onClick={markAllAsRead} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--accent-primary)', 
              fontSize: '12px', 
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Mark all as read
          </button>
        )}
      </div>
      
      <div className="popover-content" style={{ maxHeight: '350px' }}>
        {notifications.length > 0 ? (
          notifications.map(n => {
            const config = TYPE_MAP[n.type] || TYPE_MAP.info;
            const IconComponent = config.icon;

            return (
              <div 
                key={n.id} 
                className="popover-item" 
                onClick={() => !n.isRead && markAsRead(n.id)}
                style={{ 
                  alignItems: 'flex-start',
                  opacity: n.isRead ? 0.65 : 1,
                  borderLeft: !n.isRead ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  paddingLeft: !n.isRead ? '17px' : '20px',
                  display: 'flex',
                  gap: '12px',
                  position: 'relative'
                }}
              >
                <div style={{ marginTop: '2px', color: config.color }}>
                  <IconComponent size={16} />
                </div>
                <div style={{ flex: 1, paddingRight: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: !n.isRead ? 600 : 500, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {n.desc}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    {formatRelativeTime(n.createdAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(n.id);
                  }}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    opacity: 0.5,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.5; e.currentTarget.style.background = 'none'; }}
                  aria-label="Dismiss notification"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <CheckCircle2 size={32} color="var(--success)" style={{ marginBottom: '12px', opacity: 0.5 }} />
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Inbox Zero</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>You have no new notifications.</div>
          </div>
        )}
      </div>
    </div>
  );
}
