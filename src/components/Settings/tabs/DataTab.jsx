import React, { useState } from 'react';
import { useUIStore } from '../../../stores/uiStore';
import { usePageStore } from '../../../stores/pageStore';
import { db } from '../../../db/database';
import { SettingRow, Divider, ActionButton, DangerZone } from './SettingControls';

export default function DataTab({ onClose }) {
  const [gcStatus, setGcStatus] = useState('idle');
  const [gcResult, setGcResult] = useState('');
  const [nukeConfirm, setNukeConfirm] = useState(false);

  const handleNotionImport = () => {
    onClose();
    setTimeout(() => useUIStore.getState().openNotionImport(), 150);
  };

  const handleExportJSON = async () => {
    try {
      const [allPages, blocks, trackers, entries, blobsRaw] = await Promise.all([
        db.pages.toArray(), db.blocks.toArray(),
        db.trackers.toArray(), db.tracker_entries.toArray(),
        db.blobs.toArray(),
      ]);
      const serializedBlobs = await Promise.all(blobsRaw.map(async (b) => {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(b.blob);
        });
        return { hash: b.hash, base64, mimeType: b.mimeType, createdAt: b.createdAt };
      }));
      const data = { pages: allPages, blocks, trackers, entries, blobs: serializedBlobs, exportedAt: new Date().toISOString(), version: '1.0' };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maniac-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      useUIStore.getState().addToast('Workspace exported successfully.', 'success');
    } catch (err) {
      useUIStore.getState().addToast('Export failed: ' + err.message, 'error');
    }
  };

  const handleGarbageCollect = async () => {
    setGcStatus('running');
    try {
      const pages = await db.pages.toArray();
      const pageIds = new Set(pages.map(p => p.id));
      const blocks = await db.blocks.toArray();
      const orphanedBlocks = blocks.filter(b => !pageIds.has(b.pageId)).map(b => b.id);
      if (orphanedBlocks.length > 0) await db.blocks.bulkDelete(orphanedBlocks);

      const hasImages = blocks.some(b => b.type === 'image') || pages.some(p => p.coverImage);
      let blobsDeleted = false;
      if (!hasImages) {
        const blobs = await db.blobs.toArray();
        if (blobs.length > 0) { await db.blobs.clear(); blobsDeleted = true; }
      }

      const msg = `Cleaned ${orphanedBlocks.length} orphaned blocks${blobsDeleted ? ' + unused media' : ''}`;
      setGcResult(msg);
      setGcStatus('done');
      useUIStore.getState().addToast(msg, 'success');
    } catch {
      setGcStatus('error');
      useUIStore.getState().addToast('Cleanup failed', 'error');
    }
  };

  const handleNukeWorkspace = async () => {
    if (!nukeConfirm) { setNukeConfirm(true); return; }
    try {
      await db.delete();
      localStorage.clear();
      window.location.reload();
    } catch (err) {
      useUIStore.getState().addToast('Failed to reset: ' + err.message, 'error');
    }
  };

  return (
    <div className="settings-tab-content">
      <SettingRow label="Import from Notion" description="Migrate your Notion workspace (HTML or Markdown+CSV export).">
        <ActionButton variant="primary" onClick={handleNotionImport}>Import</ActionButton>
      </SettingRow>

      <Divider />

      <SettingRow label="Export Workspace" description="Download all pages, blocks, and trackers as a JSON backup.">
        <ActionButton variant="secondary" onClick={handleExportJSON}>Export JSON</ActionButton>
      </SettingRow>

      <Divider />

      <SettingRow label="Garbage Collection" description="Clear orphaned blocks and unused binary blobs to reclaim space.">
        <ActionButton
          variant="secondary"
          onClick={handleGarbageCollect}
          loading={gcStatus === 'running'}
        >
          {gcStatus === 'done' ? '✓ Done' : 'Clean Up'}
        </ActionButton>
      </SettingRow>
      {gcResult && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: -12 }}>{gcResult}</div>}

      <Divider />

      <DangerZone>
        <SettingRow label="Reset Workspace" description="Permanently delete ALL data. This cannot be undone.">
          <ActionButton
            variant="danger"
            onClick={handleNukeWorkspace}
          >
            {nukeConfirm ? '⚠ Confirm Reset' : 'Reset Everything'}
          </ActionButton>
        </SettingRow>
      </DangerZone>
    </div>
  );
}
