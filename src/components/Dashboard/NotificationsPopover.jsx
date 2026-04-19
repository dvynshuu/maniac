import React from 'react';
import { CheckCircle2, Zap, ShieldAlert, Archive } from 'lucide-react';

export function NotificationsPopover({ onClose }) {
  // Mock notifications, ideally fetched from a store
  const notifications = [
    { id: 1, type: 'system', title: 'System Optimized', desc: 'Garbage collection reclaimed 12MB of local storage.', time: '2m ago', icon: Zap, color: 'var(--success)' },
    { id: 2, type: 'security', title: 'Vault Synced', desc: 'Latest changes securely encrypted and stored.', time: '1h ago', icon: ShieldAlert, color: 'var(--accent-primary)' },
    { id: 3, type: 'info', title: 'Auto-Archive', desc: '5 stale nodes moved to archives.', time: '1d ago', icon: Archive, color: 'var(--text-tertiary)' },
  ];

  return (
    <div className="dashboard-popover">
      <div className="popover-header">
        <span className="popover-title">Notifications</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '12px', cursor: 'pointer' }}>Mark all as read</button>
      </div>
      
      <div className="popover-content">
        {notifications.length > 0 ? (
          notifications.map(n => (
            <div key={n.id} className="popover-item" style={{ alignItems: 'flex-start' }}>
              <div style={{ marginTop: '2px', color: n.color }}>
                <n.icon size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>{n.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.desc}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{n.time}</div>
              </div>
            </div>
          ))
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
