/**
 * ─── Synced Block ───────────────────────────────────────────────
 * A block that mirrors the content of another block.
 * All edits in any synced reference update the source.
 */

import React from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { useShallow } from 'zustand/react/shallow';

export default function SyncedBlock({ block }) {
  const sourceBlockId = block.properties?.sourceBlockId;
  const sourceBlock = useBlockStore(s => s.blockMap[sourceBlockId]);

  if (!sourceBlock) {
    return (
      <div className="synced-block" style={{ padding: '12px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
        <div className="synced-block-badge">Synced</div>
        <span>⚠️ Source block not found</span>
      </div>
    );
  }

  return (
    <div className="synced-block">
      <div className="synced-block-badge">Synced</div>
      <div
        style={{ padding: '4px 8px', fontSize: '14px', color: 'var(--text-primary)' }}
        dangerouslySetInnerHTML={{ __html: sourceBlock.content || '<em style="color: var(--text-tertiary)">Empty synced block</em>' }}
      />
    </div>
  );
}
