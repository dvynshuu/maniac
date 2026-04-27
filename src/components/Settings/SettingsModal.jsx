import React, { useState } from 'react';
import { X, Moon, Monitor, Key, HardDrive, BellRing } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

export function SettingsModal({ onClose, initialTab = 'Appearance' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const tabs = [
    { id: 'Appearance', icon: Moon },
    { id: 'System', icon: Monitor },
    { id: 'Security', icon: Key },
    { id: 'Data', icon: HardDrive },
    { id: 'Notifications', icon: BellRing }
  ];

  return (
    <div className="dashboard-modal-overlay" onClick={onClose}>
      <div className="dashboard-modal" style={{ height: '70vh', maxHeight: '600px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Settings</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ width: '200px', borderRight: '1px solid var(--border-subtle)', padding: '16px 0', background: 'var(--bg-tertiary)' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 24px', background: activeTab === tab.id ? 'var(--bg-active)' : 'transparent',
                  border: 'none', borderLeft: activeTab === tab.id ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer', textAlign: 'left', fontSize: '14px', fontWeight: 500,
                  transition: 'all var(--transition-fast)'
                }}
              >
                <tab.icon size={16} /> {tab.id}
              </button>
            ))}
          </div>
          
          <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 24px 0', color: 'var(--text-primary)' }}>{activeTab}</h3>
            
            {activeTab === 'Appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Theme Mode</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Switch between dark and light themes (currently locked to Dark).</div>
                  </div>
                  <select disabled style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px', opacity: 0.5 }}>
                    <option>Dark Mode</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Animations</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Enable UI micro-animations.</div>
                  </div>
                  <div style={{ width: 40, height: 24, background: 'var(--accent-primary)', borderRadius: 12, position: 'relative', cursor: 'pointer' }}>
                    <div style={{ width: 20, height: 20, background: 'white', borderRadius: '50%', position: 'absolute', top: 2, left: 18 }}></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Data' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Import from Notion</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Migrate your Notion workspace (HTML or Markdown+CSV export)</div>
                  </div>
                  <button
                    onClick={() => { onClose(); setTimeout(() => useUIStore.getState().openNotionImport(), 150); }}
                    style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent-primary)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                  >
                    Import
                  </button>
                </div>
                <div style={{ height: '1px', background: 'var(--border-subtle)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Export Workspace</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Download all data as a JSON backup file.</div>
                  </div>
                  <button disabled style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'not-allowed', fontWeight: 500, fontSize: '13px', opacity: 0.6 }}>
                    Use Sidebar ↓
                  </button>
                </div>
                <div style={{ height: '1px', background: 'var(--border-subtle)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Garbage Collection</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Clear orphaned blocks and unused binary blobs to reclaim space.</div>
                  </div>
                  <button
                    onClick={async (e) => {
                      const btn = e.currentTarget;
                      btn.textContent = 'Cleaning...';
                      try {
                        const { db } = await import('../../db/database');
                        const pages = await db.pages.toArray();
                        const pageIds = new Set(pages.map(p => p.id));
                        
                        // 1. Delete orphaned blocks
                        const blocks = await db.blocks.toArray();
                        const orphanedBlocks = blocks.filter(b => !pageIds.has(b.pageId)).map(b => b.id);
                        if (orphanedBlocks.length > 0) {
                          await db.blocks.bulkDelete(orphanedBlocks);
                        }
                        
                        // 2. Safe blob cleanup (if no image blocks or covers exist, wipe blobs)
                        const hasImages = blocks.some(b => b.type === 'image') || pages.some(p => p.coverImage);
                        let blobsDeleted = false;
                        if (!hasImages) {
                          const blobs = await db.blobs.toArray();
                          if (blobs.length > 0) {
                             await db.blobs.clear();
                             blobsDeleted = true;
                          }
                        }
                        
                        useUIStore.getState().addToast(`Cleaned up ${orphanedBlocks.length} orphaned blocks${blobsDeleted ? ' and unused media' : ''}.`, 'success');
                      } catch (err) {
                        useUIStore.getState().addToast('Cleanup failed', 'error');
                      } finally {
                        btn.textContent = 'Clean Up';
                      }
                    }}
                    style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}
                  >
                    Clean Up
                  </button>
                </div>
              </div>
            )}

            {activeTab !== 'Appearance' && activeTab !== 'Data' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                <Monitor size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                <div style={{ fontSize: '16px', fontWeight: 500 }}>Advanced {activeTab} settings</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>Available in future update.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
