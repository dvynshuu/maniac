import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { usePageStore } from '../../stores/pageStore';
import { db } from '../../db/database';
import { AlertTriangle, HardDrive, Check, X } from 'lucide-react';

function RestorePreviewModal() {
  const pendingRestoreData = useUIStore(s => s.pendingRestoreData);
  const clearPendingRestoreData = useUIStore(s => s.clearPendingRestoreData);

  if (!pendingRestoreData) return null;

  const { pages = [], blocks = [], trackers = [], entries = [] } = pendingRestoreData;

  const handleConfirm = async () => {
    try {
      if (pages.length > 0) await db.pages.bulkPut(pages);
      if (blocks.length > 0) await db.blocks.bulkPut(blocks);
      if (trackers.length > 0) await db.trackers.bulkPut(trackers);
      if (entries.length > 0) await db.tracker_entries.bulkPut(entries);
      
      await usePageStore.getState().loadPages();
      clearPendingRestoreData();
      useUIStore.getState().addToast('Restore completed successfully.', 'success');
    } catch (err) {
      useUIStore.getState().addToast('Restore failed: ' + err.message, 'error');
    }
  };

  const handleCancel = () => {
    clearPendingRestoreData();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '16px', width: '480px', maxWidth: '90vw', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--warning-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Restore Backup</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>This action will overwrite conflicting data.</p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
            We parsed the backup file successfully. Proceeding will merge or overwrite your current workspace with the following data points:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 'bold', marginBottom: '4px' }}>PAGES</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{pages.length}</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 'bold', marginBottom: '4px' }}>BLOCKS</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{blocks.length}</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 'bold', marginBottom: '4px' }}>TRACKERS</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{trackers.length}</div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 'bold', marginBottom: '4px' }}>ENTRIES</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{entries.length}</div>
            </div>
          </div>
          
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
             <HardDrive size={16} color="var(--text-tertiary)" />
             <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>All data remains strictly local to this device.</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={handleCancel}
            style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <X size={16} /> Cancel
          </button>
          <button 
            onClick={handleConfirm}
            style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--warning)', border: '1px solid transparent', color: 'var(--bg-primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Check size={16} /> Confirm Overwrite
          </button>
        </div>

      </div>
    </div>
  );
}

export default RestorePreviewModal;
