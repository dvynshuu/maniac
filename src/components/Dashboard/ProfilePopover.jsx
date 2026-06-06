import React, { useState, useEffect, useRef } from 'react';
import { User, HardDrive, LogOut, Settings as SettingsIcon, Shield, Edit2, Camera } from 'lucide-react';
import { usePageStore } from '../../stores/pageStore';
import { useSecurityStore } from '../../stores/securityStore';
import { useSettingsStore } from '../../stores/settingsStore';

export function ProfilePopover({ onClose, onOpenSettings }) {
  const pages = usePageStore((s) => s.pages);
  const lockVault = useSecurityStore((s) => s.lock);
  
  const userName = useSettingsStore((s) => s.userName);
  const userProfileImage = useSettingsStore((s) => s.userProfileImage);
  const setSetting = useSettingsStore((s) => s.setSetting);

  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [tempImage, setTempImage] = useState(userProfileImage);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const fileInputRef = useRef(null);

  const [storageData, setStorageData] = useState({ usage: '0.0', percentage: 0 });
  const [totalNodes, setTotalNodes] = useState(pages.length);

  useEffect(() => {
    if (isEditing) {
      setTempName(userName);
      setTempImage(userProfileImage);
    }
  }, [isEditing, userName, userProfileImage]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setTempImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (tempName.trim()) {
      setSetting('userName', tempName.trim());
    }
    setSetting('userProfileImage', tempImage);
    setIsEditing(false);
  };

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
      {isEditing ? (
        <div className="popover-header" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onMouseEnter={() => setIsAvatarHovered(true)}
                  onMouseLeave={() => setIsAvatarHovered(false)}
                  style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%',
                    background: 'var(--bg-tertiary)', 
                    color: 'var(--text-secondary)',
                    position: 'relative',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    border: '1px dashed var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Click to change profile image"
                >
                  {tempImage ? (
                    <>
                      <img src={tempImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {isAvatarHovered && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          background: 'rgba(0,0,0,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Camera size={14} style={{ color: '#fff' }} />
                        </div>
                      )}
                    </>
                  ) : (
                    <Camera size={16} />
                  )}
                </div>
                {tempImage && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setTempImage(null); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--error)',
                      fontSize: '9px',
                      cursor: 'pointer',
                      padding: '2px 0 0 0',
                      outline: 'none',
                      opacity: 0.8
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleImageChange} 
              />
              <div style={{ flex: 1 }}>
                <input 
                  type="text" 
                  value={tempName} 
                  onChange={e => setTempName(e.target.value)}
                  placeholder="Your Name"
                  style={{ 
                    width: '100%', 
                    background: 'var(--bg-elevated)', 
                    border: '1px solid var(--border-default)', 
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    outline: 'none'
                  }} 
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                  autoFocus
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                onClick={() => setIsEditing(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                style={{ 
                  background: 'var(--accent-primary)', 
                  border: 'none', 
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'none'}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="popover-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                className="dashboard-profile-avatar" 
                style={{ 
                  width: 40, 
                  height: 40, 
                  background: 'var(--accent-primary-subtle)', 
                  color: 'var(--accent-primary)',
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {userProfileImage ? (
                  <img src={userProfileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={20} />
                )}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{userName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Local Vault Active</div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              title="Edit Profile"
            >
              <Edit2 size={14} />
            </button>
          </div>
        </div>
      )}
      
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
