import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Check, Database, Plus, ExternalLink, ArrowRightLeft } from 'lucide-react';
import { useDatabaseStore } from '../../stores/databaseStore';
import { useBlockStore } from '../../stores/blockStore';
import { db } from '../../db/database';

interface RelationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  relatedDatabaseId: string;
  selectedRowIds: string[];
  onChange: (rowIds: string[]) => void;
  propertyTitle?: string;
  sourceRowTitle?: string;
  reciprocalPropertyId?: string;
}

export default function RelationPickerModal({
  isOpen,
  onClose,
  relatedDatabaseId,
  selectedRowIds = [],
  onChange,
  propertyTitle = 'Relation',
  sourceRowTitle = 'Item',
  reciprocalPropertyId
}: RelationPickerModalProps) {
  const [search, setSearch] = useState('');
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedRowIds);
  const [targetDbBlock, setTargetDbBlock] = useState<any>(null);

  const databases = useDatabaseStore(s => s.databases);
  const targetData = databases[relatedDatabaseId];
  const targetRows = targetData?.rows || [];
  const targetSchema = targetData?.schema || [];
  const addRow = useDatabaseStore(s => s.addRow);

  useEffect(() => {
    setLocalSelectedIds(selectedRowIds);
  }, [selectedRowIds]);

  // Load database metadata and initialize if needed
  useEffect(() => {
    if (!relatedDatabaseId) return;

    db.blocks.get(relatedDatabaseId).then(block => {
      if (block) {
        setTargetDbBlock(block);
        const store = useDatabaseStore.getState();
        if (!store.databases[relatedDatabaseId]) {
          store.initializeDatabase(relatedDatabaseId, block.properties?.schema || [], []);
        }
      }
    }).catch(err => console.error('Failed to load target database block:', err));
  }, [relatedDatabaseId]);

  const titleProp = targetSchema[0];

  const filteredRows = useMemo(() => {
    return targetRows.filter(row => {
      const title = titleProp ? String(row.values?.[titleProp.id] || '') : 'Untitled';
      return title.toLowerCase().includes(search.toLowerCase());
    });
  }, [targetRows, titleProp, search]);

  const toggleRow = (rowId: string) => {
    const next = localSelectedIds.includes(rowId)
      ? localSelectedIds.filter(id => id !== rowId)
      : [...localSelectedIds, rowId];
    setLocalSelectedIds(next);
  };

  const handleApply = () => {
    onChange(localSelectedIds);
    onClose();
  };

  const handleCreateNewRow = async () => {
    if (!relatedDatabaseId) return;
    try {
      const initialValues: Record<string, any> = {};
      if (titleProp && search.trim()) {
        initialValues[titleProp.id] = search.trim();
      }
      const newRow = await addRow(relatedDatabaseId, initialValues);
      if (newRow) {
        setLocalSelectedIds(prev => [...prev, newRow.id]);
        setSearch('');
      }
    } catch (err) {
      console.error('Failed to add new related row:', err);
    }
  };

  if (!isOpen) return null;

  const targetDbName = targetDbBlock?.properties?.name || 'Related Database';

  return (
    <div 
      className="relation-picker-backdrop fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="relation-picker-modal w-full max-w-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-[var(--color-surface-2)] text-[var(--color-fg)]">
              <Database size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <span>{propertyTitle}</span>
                {reciprocalPropertyId && (
                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-3)] text-[var(--color-fg)]">
                    <ArrowRightLeft size={10} /> Two-way
                  </span>
                )}
              </h3>
              <p className="text-xs text-[var(--text-tertiary)]">
                Link records from <span className="text-[var(--text-secondary)] font-medium">{targetDbName}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Selected Items Chips Bar */}
        {localSelectedIds.length > 0 && (
          <div className="px-5 py-2.5 bg-[var(--bg-primary)] border-b border-[var(--border-subtle)] flex flex-wrap gap-1.5 items-center max-h-24 overflow-y-auto">
            <span className="text-[11px] font-medium text-[var(--text-tertiary)] mr-1">
              Selected ({localSelectedIds.length}):
            </span>
            {localSelectedIds.map(id => {
              const r = targetRows.find(row => row.id === id);
              const title = titleProp && r ? (r.values?.[titleProp.id] || 'Untitled') : 'Untitled';
              return (
                <span 
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--color-surface-2)] border border-[var(--border-subtle)] rounded text-xs text-[var(--color-fg)]"
                >
                  <span className="truncate max-w-[150px]">{title}</span>
                  <button 
                    onClick={() => toggleRow(id)}
                    className="hover:text-red-400 p-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-xs">
            <Search size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
            <input 
              autoFocus
              className="bg-transparent border-none outline-none w-full text-xs text-[var(--text-primary)]"
              placeholder={`Search records in ${targetDbName}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-tertiary hover:text-primary">
                <X size={12} />
              </button>
            )}
          </div>
          {search.trim() && (
            <button
              onClick={handleCreateNewRow}
              className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border border-[var(--border-subtle)] rounded text-xs text-[var(--color-fg)] transition-colors whitespace-nowrap"
            >
              <Plus size={12} />
              <span>Create "{search.trim()}"</span>
            </button>
          )}
        </div>

        {/* Rows List */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 min-h-[220px]">
          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--text-tertiary)]">
              <Database size={28} className="mb-2 opacity-40" />
              <p className="text-xs">No records found matching "{search}"</p>
              {search.trim() && (
                <button
                  onClick={handleCreateNewRow}
                  className="mt-3 text-xs text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={12} /> Create new page "{search.trim()}"
                </button>
              )}
            </div>
          ) : (
            filteredRows.map(row => {
              const isSelected = localSelectedIds.includes(row.id);
              const title = titleProp ? (row.values?.[titleProp.id] || 'Untitled') : 'Untitled';

              return (
                <div
                  key={row.id}
                  onClick={() => toggleRow(row.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors border ${
                    isSelected 
                      ? 'bg-[var(--bg-hover)] border-[var(--border-subtle)] text-[var(--text-primary)]' 
                      : 'border-transparent hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                      isSelected 
                        ? 'bg-[var(--color-primary-bg)] border-[var(--color-primary-bg)] text-[var(--color-primary-fg)]' 
                        : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]'
                    }`}>
                      {isSelected && <Check size={11} />}
                    </div>
                    <span className="text-xs font-medium truncate">{title}</span>
                  </div>

                  {/* Secondary preview info */}
                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                    {row.createdAt && (
                      <span>{new Date(row.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]">
          <div className="text-xs text-[var(--text-tertiary)]">
            {localSelectedIds.length} {localSelectedIds.length === 1 ? 'item' : 'items'} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-medium bg-[var(--color-primary-bg)] text-[var(--color-primary-fg)] rounded hover:opacity-90 transition-opacity"
            >
              Save Relations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
