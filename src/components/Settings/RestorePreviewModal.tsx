import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { usePageStore } from '../../stores/pageStore';
import { db } from '../../db/database';
import { validateBackupData } from '../../utils/validator';
import { AlertTriangle, HardDrive, Check, X, ShieldAlert } from 'lucide-react';

function RestorePreviewModal() {
  const pendingRestoreData = useUIStore(s => s.pendingRestoreData);
  const clearPendingRestoreData = useUIStore(s => s.clearPendingRestoreData);

  if (!pendingRestoreData) return null;

  const { pages = [], blocks = [], trackers = [], entries = [], quarantined = [] } = pendingRestoreData;

  const handleConfirm = async () => {
    try {
      const safe = validateBackupData({ size: 0, name: 'restore' }, pendingRestoreData);

      if (safe.pages.length > 0) await db.pages.bulkPut(safe.pages);
      if (safe.blocks.length > 0) await db.blocks.bulkPut(safe.blocks);
      if (safe.trackers.length > 0) await db.trackers.bulkPut(safe.trackers);
      if (safe.entries.length > 0) await db.tracker_entries.bulkPut(safe.entries);
      if (safe.blobs && safe.blobs.length > 0) {
        const blobsToPut = await Promise.all(safe.blobs.map(async b => {
           const res = await fetch(b.base64);
           const blob = await res.blob();
           return { hash: b.hash, blob, mimeType: b.mimeType, size: blob.size, createdAt: b.createdAt || Date.now() };
        }));
        await db.blobs.bulkPut(blobsToPut);
      }
      
      await usePageStore.getState().loadPages();
      clearPendingRestoreData();

      const quarantinedCount = safe.quarantined?.length || 0;
      const msg = quarantinedCount > 0
        ? `Restore completed. ${quarantinedCount} record(s) were rejected due to invalid data.`
        : 'Restore completed successfully.';
      useUIStore.getState().addToast(msg, quarantinedCount > 0 ? 'warning' : 'success');
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

          {quarantined.length > 0 && (
            <div style={{ background: 'var(--warning-subtle)', border: '1px solid var(--warning)', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
              <ShieldAlert size={16} color="var(--warning)" />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{quarantined.length} record(s) were quarantined due to invalid or malformed data and will not be imported.</span>
            </div>
          )}
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
