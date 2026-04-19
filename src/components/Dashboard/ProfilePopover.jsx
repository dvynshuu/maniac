import React from 'react';
import { User, HardDrive, LogOut, Settings as SettingsIcon, Shield } from 'lucide-react';
import { usePageStore } from '../../stores/pageStore';

export function ProfilePopover({ onClose }) {
  const pages = usePageStore((s) => s.pages);
  
  // Calculate mock storage or get real stats if available
  const totalNodes = pages.length;
  
  return (
    <div className="dashboard-popover">
      <div className="popover-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="dashboard-profile-avatar" style={{ width: 40, height: 40, background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)' }}>
            <User size={20} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Maniac User</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Local Vault Active</div>
          </div>
        </div>
      </div>
      
      <div className="popover-content">
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Storage Used</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>24.5 MB</span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: '15%', height: '100%', background: 'var(--accent-primary)' }}></div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
            {totalNodes} Total Nodes Encrypted
          </div>
        </div>

        <div className="popover-item">
          <HardDrive size={16} />
          <span style={{ fontSize: '13px' }}>Manage Local Data</span>
        </div>
        <div className="popover-item">
          <Shield size={16} />
          <span style={{ fontSize: '13px' }}>Security & Encryption</span>
        </div>
        <div className="popover-item">
          <SettingsIcon size={16} />
          <span style={{ fontSize: '13px' }}>Account Settings</span>
        </div>
      </div>
      
      <div className="popover-footer" style={{ padding: 0 }}>
        <button 
          onClick={onClose}
          style={{ 
            width: '100%', padding: '12px', background: 'none', border: 'none', 
            color: 'var(--error)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          <LogOut size={16} /> Lock Vault
        </button>
      </div>
    </div>
  );
}
