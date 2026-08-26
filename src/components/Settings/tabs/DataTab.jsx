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

  const handleExportEncryptedVault = async () => {
    try {
      const password = prompt('Enter a password to encrypt this portable vault (.maniac):');
      if (!password) return;

      const [allPages, blocks, trackers, entries, blobsRaw, databaseRows, databaseCells, relations] = await Promise.all([
        db.pages.toArray(), 
        db.blocks.toArray(),
        db.trackers.toArray(), 
        db.tracker_entries.toArray(),
        db.blobs.toArray(),
        db.database_rows.toArray(),
        db.database_cells.toArray(),
        db.relations.toArray()
      ]);

      const serializedBlobs = await Promise.all(blobsRaw.map(async (b) => {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(b.blob);
        });
        return { hash: b.hash, base64, mimeType: b.mimeType, createdAt: b.createdAt };
      }));

      const payload = JSON.stringify({
        format: 'MANIAC_ENCRYPTED_VAULT',
        version: '2.0',
        exportedAt: Date.now(),
        data: {
          pages: allPages,
          blocks,
          trackers,
          entries,
          databaseRows,
          databaseCells,
          relations,
          blobs: serializedBlobs
        }
      });

      // Encrypt with PBKDF2 + AES-GCM
      const enc = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
      );
      const derivedKey = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        derivedKey,
        enc.encode(payload)
      );

      // Pack salt (16) + iv (12) + ciphertext
      const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

      const blob = new Blob([combined], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-${new Date().toISOString().split('T')[0]}.maniac`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      useUIStore.getState().addToast('Encrypted vault exported (.maniac)!', 'success');
    } catch (err) {
      console.error(err);
      useUIStore.getState().addToast('Vault export failed: ' + err.message, 'error');
    }
  };

  const handleImportEncryptedVault = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const password = prompt('Enter the password to decrypt and restore this vault (.maniac):');
      if (!password) return;

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      if (bytes.length < 28) {
        throw new Error('Invalid vault file size.');
      }

      const salt = bytes.slice(0, 16);
      const iv = bytes.slice(16, 28);
      const ciphertext = bytes.slice(28);

      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
      );
      const derivedKey = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        derivedKey,
        ciphertext
      );

      const jsonStr = new TextDecoder().decode(decryptedBuffer);
      const vault = JSON.parse(jsonStr);

      if (vault.format !== 'MANIAC_ENCRYPTED_VAULT' || !vault.data) {
        throw new Error('Unrecognized vault structure.');
      }

      // Restore data to IndexedDB
      await db.transaction('rw', [db.pages, db.blocks, db.trackers, db.tracker_entries, db.database_rows, db.database_cells, db.relations], async () => {
        if (vault.data.pages?.length) await db.pages.bulkPut(vault.data.pages);
        if (vault.data.blocks?.length) await db.blocks.bulkPut(vault.data.blocks);
        if (vault.data.trackers?.length) await db.trackers.bulkPut(vault.data.trackers);
        if (vault.data.entries?.length) await db.tracker_entries.bulkPut(vault.data.entries);
        if (vault.data.databaseRows?.length) await db.database_rows.bulkPut(vault.data.databaseRows);
        if (vault.data.databaseCells?.length) await db.database_cells.bulkPut(vault.data.databaseCells);
        if (vault.data.relations?.length) await db.relations.bulkPut(vault.data.relations);
      });

      useUIStore.getState().addToast('Vault restored successfully! Reloading...', 'success');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error(err);
      useUIStore.getState().addToast('Vault restore failed (incorrect password or corrupt file).', 'error');
    }
  };

  const handleGarbageCollect = async () => {
    setGcStatus('running');
    try {
      const pages = await db.pages.toArray();
      const pageIds = new Set(pages.map(p => p.id));
      const blocks = await db.blocks.toArray();

      // 1. Identify orphaned blocks
      const orphanedBlocks = blocks.filter(b => !pageIds.has(b.pageId)).map(b => b.id);
      
      // 2. Identify duplicate blocks on the same page
      const duplicateBlockIds = [];
      const blocksByPage = new Map();
      for (const b of blocks) {
        if (!pageIds.has(b.pageId)) continue;
        if (!blocksByPage.has(b.pageId)) blocksByPage.set(b.pageId, []);
        blocksByPage.get(b.pageId).push(b);
      }

      const affectedPageIds = new Set();
      for (const [pageId, pBlocks] of blocksByPage.entries()) {
        const seenSignatures = new Set();
        for (const b of pBlocks) {
          // Normalize content and properties
          const contentStr = (b.content || '').trim();
          const propsStr = JSON.stringify(b.properties || {});
          const sig = `${b.type}::${contentStr}::${propsStr}::${b.parentId || 'root'}`;
          
          if (contentStr.length > 0 && seenSignatures.has(sig)) {
            duplicateBlockIds.push(b.id);
            affectedPageIds.add(pageId);
          } else {
            seenSignatures.add(sig);
          }
        }
      }

      const allBlocksToDelete = [...orphanedBlocks, ...duplicateBlockIds];
      if (allBlocksToDelete.length > 0) {
        await db.blocks.bulkDelete(allBlocksToDelete);
      }

      // 3. Clean up crdt_updates for affected pages or deleted blocks
      if (affectedPageIds.size > 0) {
        await db.crdt_updates.where('pageId').anyOf(Array.from(affectedPageIds)).delete();
      }

      const hasImages = blocks.some(b => b.type === 'image') || pages.some(p => p.coverImage);
      let blobsDeleted = false;
      if (!hasImages) {
        const blobs = await db.blobs.toArray();
        if (blobs.length > 0) { await db.blobs.clear(); blobsDeleted = true; }
      }

      // Reload current block store if needed
      const { useBlockStore } = await import('../../../stores/blockStore');
      const curOrder = useBlockStore.getState().blockOrder;
      if (curOrder.length > 0) {
        const activeBlock = useBlockStore.getState().blockMap[curOrder[0]];
        if (activeBlock?.pageId) {
          await useBlockStore.getState().loadBlocks(activeBlock.pageId);
        }
      }

      const parts = [];
      if (duplicateBlockIds.length > 0) parts.push(`Removed ${duplicateBlockIds.length} duplicate blocks`);
      if (orphanedBlocks.length > 0) parts.push(`Cleaned ${orphanedBlocks.length} orphaned blocks`);
      if (blobsDeleted) parts.push('Removed unused media');
      if (parts.length === 0) parts.push('Workspace is clean. No duplicates found.');

      const msg = parts.join(' • ');
      setGcResult(msg);
      setGcStatus('done');
      useUIStore.getState().addToast(msg, 'success');
    } catch (err) {
      console.error('[DataTab] Cleanup error:', err);
      setGcStatus('error');
      useUIStore.getState().addToast('Cleanup failed: ' + (err.message || 'Unknown error'), 'error');
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

      <SettingRow label="Encrypted Portable Vault (.maniac)" description="Zero-knowledge password-encrypted single-file backup for complete workspace portability.">
        <div style={{ display: 'flex', gap: '8px' }}>
          <ActionButton variant="primary" onClick={handleExportEncryptedVault}>
            Export .maniac
          </ActionButton>
          <label style={{ display: 'inline-flex' }}>
            <input 
              type="file" 
              accept=".maniac" 
              style={{ display: 'none' }} 
              onChange={handleImportEncryptedVault}
            />
            <span className="btn btn-secondary" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--border-default)', display: 'inline-flex', alignItems: 'center' }}>
              Restore Vault
            </span>
          </label>
        </div>
      </SettingRow>

      <Divider />

      <SettingRow label="Optimize & Deduplicate" description="Clear duplicate blocks, orphaned items, and unused binary blobs to reclaim space.">
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
