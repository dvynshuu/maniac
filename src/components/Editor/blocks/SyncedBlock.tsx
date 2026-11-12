import React, { useState, useCallback } from 'react';
import { useBlockStore } from '../../../stores/blockStore';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { useChildBlockIds } from '../../../hooks/useChildBlockIds';
import { useShallow } from 'zustand/react/shallow';
import { selectSyncedCount } from '../../../core/derivedCache';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import BlockRenderer from '../BlockRenderer';
import { RefreshCw, Unlink, Copy, Check, Plus, ExternalLink } from 'lucide-react';

export default function SyncedBlock({ block }: { block: any }) {
  const isOriginal = block.properties?.isOriginal !== false && !block.properties?.sourceBlockId;
  const sourceId = isOriginal ? block.id : block.properties?.sourceBlockId;
  
  const sourceBlock = useBlockStore(useShallow(s => s.blockMap[sourceId]));
  const childBlockIds = useChildBlockIds(sourceId);
  const engine = useEditorEngine(block.pageId);
  const [copied, setCopied] = useState(false);

  // Scoped derivedCache selector: computes reference counts via fine-grained store invalidations
  const selectCount = useCallback(selectSyncedCount(sourceId), [sourceId]);
  const referenceCount = useBlockStore(selectCount);

  const handleCopySync = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify({
          type: 'maniac_synced_ref',
          sourceBlockId: sourceId,
        })
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignored */
    }
  };

  const handleUnsync = () => {
    if (isOriginal) {
      // Convert original synced block to a normal container / text
      engine.convertType(block.id, 'text');
    } else {
      // Detach reference: duplicate children into local blocks
      engine.convertType(block.id, 'text');
    }
  };

  if (!sourceBlock && !isOriginal) {
    return (
      <div className="synced-container-block is-orphaned">
        <div className="synced-header">
          <span className="synced-badge">
            <RefreshCw size={11} className="synced-icon" />
            <span>Synced Block</span>
          </span>
          <span className="synced-status-text">Original block was deleted</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`synced-container-block ${isOriginal ? 'is-original' : 'is-reference'}`}>
      <div className="synced-header" contentEditable={false} suppressContentEditableWarning>
        <div className="synced-badge-wrapper">
          <span className="synced-badge">
            <RefreshCw size={11} className="synced-icon" />
            <span>{isOriginal ? 'Original Synced Block' : 'Synced Reference'}</span>
          </span>
          <span className="synced-locations-count">
            Editing in {referenceCount} {referenceCount === 1 ? 'place' : 'places'}
          </span>
        </div>
        <div className="synced-actions">
          <button
            type="button"
            className="synced-action-btn"
            onClick={handleCopySync}
            title="Copy and paste on another page to sync"
          >
            {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy and sync'}</span>
          </button>
          <button
            type="button"
            className="synced-action-btn"
            onClick={handleUnsync}
            title="Unsync and convert to local block"
          >
            <Unlink size={12} />
            <span>Unsync</span>
          </button>
        </div>
      </div>

      <div className="synced-content-area">
        {childBlockIds.length === 0 ? (
          <div
            className="block-text text-placeholder"
            style={{
              padding: '6px 8px',
              cursor: 'text',
              color: 'var(--text-placeholder)',
              fontSize: '14px',
            }}
            onClick={() => engine.insertAfter(null, 'text', { parentId: sourceId })}
          >
            Empty synced container. Click to add blocks...
          </div>
        ) : (
          <SortableContext items={childBlockIds.filter(Boolean)} strategy={verticalListSortingStrategy}>
            {childBlockIds.filter(Boolean).map((childId, index) => (
              <BlockRenderer key={childId} blockId={childId} index={index} />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
