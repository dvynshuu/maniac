import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Circle, Clock, CheckCircle2, Plus, Check, Search, X } from 'lucide-react';
import { useDatabaseStore } from '../../stores/databaseStore';
import { PROPERTY_COLORS } from '../../utils/constants';

export type StatusGroupId = 'to_do' | 'in_progress' | 'complete';

export interface StatusOption {
  id: string;
  label: string;
  group: StatusGroupId;
  color?: string;
}

export const STATUS_GROUPS: { id: StatusGroupId; label: string; defaultColor: string }[] = [
  { id: 'to_do', label: 'To-do', defaultColor: 'gray' },
  { id: 'in_progress', label: 'In progress', defaultColor: 'blue' },
  { id: 'complete', label: 'Complete', defaultColor: 'green' },
];

export const DEFAULT_STATUS_OPTIONS: StatusOption[] = [
  { id: 'not_started', label: 'Not started', group: 'to_do', color: 'gray' },
  { id: 'in_progress', label: 'In progress', group: 'in_progress', color: 'blue' },
  { id: 'done', label: 'Done', group: 'complete', color: 'green' },
];

interface StatusDropdownProps {
  property: any;
  value: any;
  onChange: (val: string) => void;
  isEditing?: boolean;
  stopEditing?: () => void;
  blockId?: string;
}

export default function StatusDropdown({
  property,
  value,
  onChange,
  isEditing,
  stopEditing,
  blockId
}: StatusDropdownProps) {
  const [search, setSearch] = useState('');
  const [addingToGroup, setAddingToGroup] = useState<StatusGroupId | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const updateProperty = useDatabaseStore(s => s.updateProperty);

  const rawOptions: StatusOption[] = (property.config && Array.isArray(property.config.options) && property.config.options.length > 0)
    ? property.config.options
    : DEFAULT_STATUS_OPTIONS;

  // Ensure each option has a valid group
  const options = useMemo(() => {
    return rawOptions.map(opt => ({
      ...opt,
      group: (opt.group && ['to_do', 'in_progress', 'complete'].includes(opt.group)) ? opt.group : 'to_do'
    }));
  }, [rawOptions]);

  const currentOption = useMemo(() => {
    if (!value) return options[0] || DEFAULT_STATUS_OPTIONS[0];
    return options.find(o => o.id === value || o.label === value) || {
      id: String(value),
      label: String(value),
      group: 'to_do' as StatusGroupId,
      color: 'gray'
    };
  }, [options, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (stopEditing) stopEditing();
      }
    };
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, stopEditing]);

  const handleSelectOption = (optionId: string) => {
    onChange(optionId);
    if (stopEditing) stopEditing();
  };

  const handleCreateOption = async (groupId: StatusGroupId) => {
    if (!newLabel.trim()) return;

    const optId = `status_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const groupDef = STATUS_GROUPS.find(g => g.id === groupId);
    const newOpt: StatusOption = {
      id: optId,
      label: newLabel.trim(),
      group: groupId,
      color: groupDef?.defaultColor || 'gray'
    };

    const nextOptions = [...options, newOpt];
    const targetBlockId = blockId || property.blockId;
    if (targetBlockId) {
      await updateProperty(targetBlockId, property.id, {
        config: { ...(property.config || {}), options: nextOptions }
      });
    }

    onChange(optId);
    setNewLabel('');
    setAddingToGroup(null);
    if (stopEditing) stopEditing();
  };

  const renderGroupIcon = (groupId: StatusGroupId, size = 12) => {
    switch (groupId) {
      case 'to_do':
        return <Circle size={size} className="status-icon-todo" />;
      case 'in_progress':
        return <Clock size={size} className="status-icon-progress" />;
      case 'complete':
        return <CheckCircle2 size={size} className="status-icon-complete" />;
      default:
        return <Circle size={size} />;
    }
  };

  const getStatusBadgeStyle = (opt: StatusOption) => {
    switch (opt.group) {
      case 'complete':
        return {
          background: 'var(--color-surface-2)',
          color: 'var(--color-fg)',
          border: '1px solid var(--border-subtle)'
        };
      case 'in_progress':
        return {
          background: 'var(--color-surface-3)',
          color: 'var(--color-fg)',
          border: '1px solid var(--border-subtle)'
        };
      case 'to_do':
      default:
        return {
          background: 'var(--color-surface-1)',
          color: 'var(--color-fg-secondary)',
          border: '1px solid var(--border-subtle)'
        };
    }
  };

  if (!isEditing) {
    return (
      <div 
        className="db-cell-status flex items-center gap-1.5 cursor-pointer"
        style={{ width: '100%', height: '100%', minHeight: '24px' }}
      >
        <span 
          className="status-pill inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
          style={getStatusBadgeStyle(currentOption)}
        >
          {renderGroupIcon(currentOption.group, 11)}
          <span className="truncate">{currentOption.label}</span>
        </span>
      </div>
    );
  }

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div 
      className="status-dropdown-popover"
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 1050,
        minWidth: '240px',
        maxWidth: '300px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Search Input */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded text-xs">
        <Search size={12} className="text-tertiary" />
        <input 
          autoFocus
          className="bg-transparent border-none outline-none text-xs w-full text-[var(--text-primary)]"
          placeholder="Filter status..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-tertiary hover:text-primary">
            <X size={12} />
          </button>
        )}
      </div>

      {/* 3 Lifecycle Buckets */}
      <div className="status-groups-container flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-0.5">
        {STATUS_GROUPS.map(group => {
          const groupOptions = filteredOptions.filter(o => o.group === group.id);

          return (
            <div key={group.id} className="status-group-section">
              <div 
                className="status-group-header flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]"
              >
                <div className="flex items-center gap-1.5">
                  {renderGroupIcon(group.id, 10)}
                  <span>{group.label}</span>
                  <span className="text-[9px] opacity-70">({groupOptions.length})</span>
                </div>
                <button 
                  className="hover:text-[var(--text-primary)] transition-colors p-0.5 rounded"
                  title={`Add ${group.label} status`}
                  onClick={() => {
                    setAddingToGroup(addingToGroup === group.id ? null : group.id);
                    setNewLabel('');
                  }}
                >
                  <Plus size={11} />
                </button>
              </div>

              <div className="status-group-list flex flex-col gap-0.5">
                {groupOptions.map(opt => {
                  const isSelected = opt.id === currentOption.id || opt.label === currentOption.label;
                  return (
                    <button
                      key={opt.id}
                      className={`status-option-item flex items-center justify-between w-full px-2 py-1 rounded text-xs text-left transition-colors ${
                        isSelected ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium' : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                      }`}
                      onClick={() => handleSelectOption(opt.id)}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {renderGroupIcon(opt.group, 12)}
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {isSelected && <Check size={12} className="text-[var(--color-primary)] flex-shrink-0" />}
                    </button>
                  );
                })}

                {/* Inline Add Input */}
                {addingToGroup === group.id && (
                  <div className="flex items-center gap-1 px-1 py-1 mt-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded">
                    <input 
                      autoFocus
                      className="bg-transparent border-none outline-none text-xs w-full px-1 text-[var(--text-primary)]"
                      placeholder={`New ${group.label} status...`}
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateOption(group.id);
                        if (e.key === 'Escape') setAddingToGroup(null);
                      }}
                    />
                    <button 
                      className="px-1.5 py-0.5 bg-[var(--color-primary-bg)] text-[var(--color-primary-fg)] rounded text-[10px] font-semibold"
                      onClick={() => handleCreateOption(group.id)}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
