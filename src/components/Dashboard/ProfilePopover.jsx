import React, { useState, useEffect } from 'react';
import { User, HardDrive, LogOut, Settings as SettingsIcon, Shield } from 'lucide-react';
import { usePageStore } from '../../stores/pageStore';
import { useSecurityStore } from '../../stores/securityStore';

export function ProfilePopover({ onClose, onOpenSettings }) {
  const pages = usePageStore((s) => s.pages);
  const lockVault = useSecurityStore((s) => s.lock);
  
  const [storageData, setStorageData] = useState({ usage: '0.0', percentage: 0 });
  const [totalNodes, setTotalNodes] = useState(pages.length);

  useEffect(() => {
    // A "node" in the Maniac UI represents a Page. 
    // We can use db.pages.count() to include archived pages, or just fallback to pages.length
    import('../../db/database').then(({ db }) => {
      db.pages.count().then(count => {
        setTotalNodes(count);
      }).catch(() => {
        setTotalNodes(pages.length);
      });
    });

    const fetchStorage = async () => {
      try {
        const { db } = await import('../../db/database');
        
        let totalBytes = 0;
        
        // 1. Calculate size of heavy binary blobs
        const blobs = await db.blobs.toArray();
        blobs.forEach(b => {
          if (b.blob) totalBytes += b.blob.size;
        });

        // 2. Calculate size of JSON records
        const collections = [db.pages, db.blocks, db.trackers, db.tracker_entries];
        for (const col of collections) {
          const items = await col.toArray();
          totalBytes += new Blob([JSON.stringify(items)]).size;
        }

        let usageMB = (totalBytes / (1024 * 1024)).toFixed(2);
        if (usageMB === '0.00' && totalBytes > 0) usageMB = '< 0.01';
        else if (totalBytes === 0) usageMB = '0.00';
        
        // Calculate visual progress against a standard browser quota (usually 1GB+)
        let percentage = 0;
        if (navigator.storage && navigator.storage.estimate) {
          const { quota } = await navigator.storage.estimate();
          if (quota && quota > 0) percentage = (totalBytes / quota) * 100;
        }
        
        // Give a tiny visual bump so the bar isn't completely empty if they have data
        if (totalBytes > 0 && percentage < 2) percentage = 2; 
        if (totalBytes === 0) percentage = 0;
        
        setStorageData({ usage: usageMB, percentage });
      } catch (e) {
        console.error("Storage calculation failed", e);
      }
    };
    fetchStorage();
  }, [pages.length]);

  const handleAction = (tab) => {
    if (onOpenSettings) onOpenSettings(tab);
    onClose();
  };
  
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
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{storageData.usage} MB</span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${storageData.percentage}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.3s ease' }}></div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
            {totalNodes} Total Nodes Encrypted
          </div>
        </div>

        <div className="popover-item" onClick={() => handleAction('Data')}>
          <HardDrive size={16} />
          <span style={{ fontSize: '13px' }}>Manage Local Data</span>
        </div>
        <div className="popover-item" onClick={() => handleAction('Security')}>
          <Shield size={16} />
          <span style={{ fontSize: '13px' }}>Security & Encryption</span>
        </div>
        <div className="popover-item" onClick={() => handleAction('Appearance')}>
          <SettingsIcon size={16} />
          <span style={{ fontSize: '13px' }}>Account Settings</span>
        </div>
      </div>
      
      <div className="popover-footer" style={{ padding: 0 }}>
        <button 
          onClick={() => { onClose(); lockVault(); }}
          style={{ 
            width: '100%', padding: '12px', background: 'none', border: 'none', 
            color: 'var(--error)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--error-subtle)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <LogOut size={16} /> Lock Vault
        </button>
      </div>
    </div>
  );
}
