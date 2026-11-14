import { useState, useEffect, useRef, useCallback } from 'react';
import { PROPERTY_TYPES } from '../../utils/constants';
import { formatDate, debounce } from '../../utils/helpers';

import { ExternalLink, Mail, Phone, CheckSquare, Square, Check, Clock } from 'lucide-react';
import SelectDropdown from './SelectDropdown';
import StatusDropdown from './StatusDropdown';
import RelationPickerModal from './RelationPickerModal';
import DatePicker from './DatePicker';
import { useDatabaseStore } from '../../stores/databaseStore';
import { db } from '../../db/database';
import { resolvePropertyValue } from '../../core/queryEngine';

function RelationDropdown({ relatedDatabaseId, selectedRowIds, onChange, stopEditing }) {
  const [search, setSearch] = useState('');
  const targetData = useDatabaseStore(s => s.databases[relatedDatabaseId]);
  const targetRows = targetData?.rows || [];
  const targetSchema = targetData?.schema || [];
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        stopEditing();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [stopEditing]);

  const titleProp = targetSchema[0];

  const filteredRows = targetRows.filter(row => {
    const title = titleProp ? String(row.values[titleProp.id] || '') : '';
    return title.toLowerCase().includes(search.toLowerCase());
  });

  const toggleRow = (rowId) => {
    const current = Array.isArray(selectedRowIds) ? selectedRowIds : [];
    let next;
    if (current.includes(rowId)) {
      next = current.filter(id => id !== rowId);
    } else {
      next = [...current, rowId];
    }
    onChange(next);
  };

  return (
    <div 
      ref={dropdownRef} 
      className="relation-dropdown"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 1000,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        minWidth: '220px',
        maxHeight: '260px',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}
    >
      <input
        autoFocus
        className="db-menu-input"
        placeholder="Search pages..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '4px 8px', fontSize: '12px' }}
        onClick={e => e.stopPropagation()}
      />
      <div 
        className="relation-dropdown-list"
        style={{
          maxHeight: '200px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}
      >
        {filteredRows.length === 0 ? (
          <div style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            No pages found
          </div>
        ) : (
          filteredRows.map(row => {
            const title = titleProp ? (row.values[titleProp.id] || 'Untitled') : 'Untitled';
            const isSelected = selectedRowIds?.includes(row.id);
            return (
              <button
                key={row.id}
                className={`db-menu-item ${isSelected ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRow(row.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  width: '100%',
                  textAlign: 'left',
                  padding: '4px 6px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  background: isSelected ? 'var(--bg-hover)' : 'transparent',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
              >
                <div style={{ width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isSelected && <Check size={12} />}
                </div>
                <span className="truncate">{title}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

interface CellRendererProps {
  property: any;
  value: any;
  onChange: (val: any) => void;
  isActive?: boolean;
  isEditing?: boolean;
  startEditing?: () => any;
  stopEditing?: () => any;
  blockId?: string;
  rowValues?: any;
  row?: any;
  onFocus?: () => any;
  [key: string]: any;
}

export default function CellRenderer({ 
  property, 
  value, 
  onChange, 
  isActive, 
  isEditing, 
  startEditing, 
  stopEditing,
  blockId,
  rowValues,
  row,
  onFocus
}: CellRendererProps) {
  const inputRef = useRef(null);
  const [localValue, setLocalValue] = useState(value);
  const [showRelationModal, setShowRelationModal] = useState(false);

  // Sync with store when property/value changes outside (e.g. undo/redo)
  useEffect(() => {
    setLocalValue(value);
  }, [value, property.id]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Debounced save for semi-realtime updates without lag
  const debouncedOnChange = useCallback(
    debounce((nextVal) => {
      onChange(nextVal);
    }, 500),
    [onChange]
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    debouncedOnChange(val);
  };

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
    stopEditing();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (localValue !== value) onChange(localValue);
      stopEditing();
    } else if (e.key === 'Escape') {
      setLocalValue(value); // Revert
      stopEditing();
    }
  };

  const relatedDatabaseId = property.config?.relatedDatabaseId;
  const relationPropertyId = property.config?.relationPropertyId;

  // Auto-initialize related databases if needed
  useEffect(() => {
    if (property.type === PROPERTY_TYPES.RELATION && relatedDatabaseId) {
      const store = useDatabaseStore.getState();
      if (!store.databases[relatedDatabaseId]) {
        db.blocks.get(relatedDatabaseId).then(block => {
          if (block) {
            store.initializeDatabase(relatedDatabaseId, block.properties?.schema || [], []);
          }
        });
      }
    } else if (property.type === PROPERTY_TYPES.ROLLUP && relationPropertyId) {
      const store = useDatabaseStore.getState();
      const currentSchema = store.getDatabaseData(blockId)?.schema || [];
      const relProp = currentSchema.find(p => p.id === relationPropertyId);
      const relDbId = relProp?.config?.relatedDatabaseId;
      if (relDbId && !store.databases[relDbId]) {
        db.blocks.get(relDbId).then(block => {
          if (block) {
            store.initializeDatabase(relDbId, block.properties?.schema || [], []);
          }
        });
      }
    }
  }, [property.type, relatedDatabaseId, relationPropertyId, blockId]);

  const getRollupValue = () => {
    if (property.type !== PROPERTY_TYPES.ROLLUP) return null;
    const { relationPropertyId: relId, targetPropertyId, calculate } = property.config || {};
    if (!relId || !targetPropertyId) return null;

    const relationVal = rowValues?.[relId];
    const relatedRowIds = Array.isArray(relationVal) ? relationVal : [];
    if (relatedRowIds.length === 0) return null;

    const currentSchema = useDatabaseStore.getState().getDatabaseData(blockId)?.schema || [];
    const relationProperty = currentSchema.find(p => p.id === relId);
    const relatedDbId = relationProperty?.config?.relatedDatabaseId;
    if (!relatedDbId) return null;

    const relatedDb = useDatabaseStore.getState().databases[relatedDbId];
    const relatedRows = relatedDb?.rows || [];
    if (relatedRows.length === 0) return null;

    const values = relatedRowIds.map(id => {
      const row = relatedRows.find(r => r.id === id);
      return row ? row.values[targetPropertyId] : null;
    }).filter(v => v !== undefined && v !== null && v !== '');

    switch (calculate) {
      case 'count_all':
        return relatedRowIds.length;
      case 'count_unique':
        return new Set(values).size;
      case 'count_empty':
        return relatedRowIds.length - values.length;
      case 'count_not_empty':
        return values.length;
      case 'percent_empty':
        return relatedRowIds.length > 0 ? ((relatedRowIds.length - values.length) / relatedRowIds.length) : 0;
      case 'percent_not_empty':
        return relatedRowIds.length > 0 ? (values.length / relatedRowIds.length) : 0;
      case 'sum': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return nums.reduce((sum, n) => sum + n, 0);
      }
      case 'average': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return nums.length > 0 ? (nums.reduce((sum, n) => sum + n, 0) / nums.length) : 0;
      }
      case 'median': {
        const nums = values.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
        if (nums.length === 0) return 0;
        const mid = Math.floor(nums.length / 2);
        return nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
      }
      case 'min': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return nums.length > 0 ? Math.min(...nums) : 0;
      }
      case 'max': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return nums.length > 0 ? Math.max(...nums) : 0;
      }
      case 'range': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return nums.length > 0 ? Math.max(...nums) - Math.min(...nums) : 0;
      }
      case 'show_original':
      default:
        return values.join(', ');
    }
  };

  const renderNumericProgressValue = (rawValue) => {
    const num = parseFloat(rawValue);
    if (isNaN(num)) {
      return <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>—</span>;
    }

    // Get configuration
    const numberFormat = property.config?.numberFormat || 'number';
    const decimalPlaces = property.config?.decimalPlaces !== undefined ? property.config.decimalPlaces : 0;
    const showAs = property.config?.showAs || 'number';
    const showNumber = property.config?.showNumber !== false;
    const progressColor = property.config?.progressColor || 'blue';
    
    // Max value: default to 1 if percent format and not set, or 100 if number
    const maxValue = property.config?.maxValue !== undefined 
      ? parseFloat(property.config.maxValue) 
      : (numberFormat === 'percent' ? 1 : 100);

    // Compute percentage (for Bar and Ring)
    let percentage = 0;
    if (maxValue > 0) {
      percentage = Math.min(100, Math.max(0, (num / maxValue) * 100));
    }

    // Value formatting
    let displayValue = num;
    let prefix = '';
    let suffix = '';

    if (numberFormat === 'percent') {
      // If max value is 1 (like 0.42 = 42%), multiply by 100 for display
      displayValue = maxValue === 1 ? num * 100 : num;
      suffix = '%';
    } else if (numberFormat === 'usd') {
      prefix = '$';
    } else if (numberFormat === 'eur') {
      prefix = '€';
    } else if (numberFormat === 'gbp') {
      prefix = '£';
    }

    const formattedNum = displayValue.toFixed(decimalPlaces);
    const label = `${prefix}${formattedNum}${suffix}`;

    // Get hex color mapping
    const colorsMap: Record<string, string> = {
      blue: 'var(--color-primary-bg)',
      green: 'var(--color-primary-bg)',
      purple: 'var(--color-fg)',
      orange: 'var(--color-fg)',
      red: 'var(--color-primary-bg)'
    };
    const color = colorsMap[progressColor] || 'var(--color-primary-bg)';

    if (showAs === 'bar') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', minWidth: '85px', padding: '2px 0' }}>
          <div 
            style={{ 
              height: '6px', 
              background: 'var(--color-surface-3)', 
              borderRadius: '3px', 
              flex: 1, 
              overflow: 'hidden',
              display: 'flex'
            }}
          >
            <div 
              style={{ 
                height: '100%', 
                background: color, 
                width: `${percentage}%`,
                transition: 'width 0.3s ease',
                borderRadius: '3px'
              }}
            />
          </div>
          {showNumber && (
            <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
              {label}
            </span>
          )}
        </div>
      );
    }

    if (showAs === 'ring') {
      const radius = 6;
      const strokeWidth = 2.0;
      const circumference = 2 * Math.PI * radius;
      const strokeDashoffset = circumference - (percentage / 100) * circumference;

      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '60px', padding: '2px 0' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ transform: 'rotate(-90deg)', overflow: 'visible', flexShrink: 0 }}>
            {/* Background track circle */}
            <circle
              cx="8"
              cy="8"
              r={radius}
              fill="transparent"
              stroke="var(--color-surface-3)"
              strokeWidth={strokeWidth}
            />
            {/* Colored progress circle */}
            <circle
              cx="8"
              cy="8"
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          {showNumber && (
            <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
              {label}
            </span>
          )}
        </div>
      );
    }

    // Plain Number format
    return (
      <div className="db-cell-number text-right" style={{ fontFamily: 'monospace', color: 'var(--text-primary)', width: '100%', fontSize: '12px' }}>
        {label}
      </div>
    );
  };

  const renderContent = () => {
    switch (property.type) {
      case PROPERTY_TYPES.TEXT:
        return isEditing ? (
          <input
            ref={inputRef}
            className="db-cell-input"
            value={localValue || ''}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div className="db-cell-text">{value || ''}</div>
        );

      case PROPERTY_TYPES.NUMBER:
        return isEditing ? (
          <input
            ref={inputRef}
            type="number"
            className="db-cell-input"
            value={localValue || ''}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          renderNumericProgressValue(value)
        );

      case PROPERTY_TYPES.CHECKBOX:
        return (
          <div className="db-cell-checkbox flex justify-center">
            <button 
              className={`db-checkbox ${value ? 'active' : ''}`}
              onClick={() => onChange(!value)}
            >
              {value ? <CheckSquare size={16} /> : <Square size={16} />}
            </button>
          </div>
        );

      case PROPERTY_TYPES.STATUS:
        return (
          <StatusDropdown
            property={property}
            value={value}
            onChange={onChange}
            isEditing={isEditing}
            stopEditing={stopEditing}
            blockId={blockId}
          />
        );

      case PROPERTY_TYPES.SELECT:
        return (
          <SelectDropdown
            property={property}
            value={value}
            onChange={onChange}
            isEditing={isEditing}
            stopEditing={stopEditing}
          />
        );

      case PROPERTY_TYPES.MULTI_SELECT:
        return (
          <SelectDropdown
            property={property}
            value={value}
            onChange={onChange}
            isEditing={isEditing}
            stopEditing={stopEditing}
            multi
          />
        );

      case PROPERTY_TYPES.DATE:
        return (
          <DatePicker
            value={value}
            onChange={onChange}
            isEditing={isEditing}
            stopEditing={stopEditing}
          />
        );

      case PROPERTY_TYPES.URL:
        return isEditing ? (
          <input
            ref={inputRef}
            className="db-cell-input"
            placeholder="https://..."
            value={localValue || ''}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div className="db-cell-url flex items-center gap-2">
            <span className="truncate">{value || ''}</span>
            {value && (
              <a href={value} target="_blank" rel="noopener noreferrer" className="db-cell-link-icon">
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        );

      case PROPERTY_TYPES.EMAIL:
        return isEditing ? (
          <input
            ref={inputRef}
            className="db-cell-input"
            placeholder="name@example.com"
            value={localValue || ''}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div className="db-cell-email flex items-center gap-2">
             <Mail size={12} className="text-tertiary" />
             <span>{value || ''}</span>
          </div>
        );

      case PROPERTY_TYPES.PHONE:
        return isEditing ? (
          <input
            ref={inputRef}
            className="db-cell-input"
            placeholder="+1..."
            value={localValue || ''}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div className="db-cell-phone flex items-center gap-2">
             <Phone size={12} className="text-tertiary" />
             <span>{value || ''}</span>
          </div>
        );

      case PROPERTY_TYPES.CREATED_AT:
      case PROPERTY_TYPES.CREATED_TIME: {
        const rawTime = row?.createdAt || value;
        const formatted = rawTime ? new Date(rawTime).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }) : '—';
        return (
          <div className="db-cell-timestamp text-xs text-tertiary flex items-center gap-1.5 select-none" title="Created Time (Read-only)">
            <Clock size={12} className="opacity-60 flex-shrink-0" />
            <span className="truncate">{formatted}</span>
          </div>
        );
      }

      case PROPERTY_TYPES.LAST_EDITED_TIME: {
        const rawTime = row?.updatedAt || row?.createdAt || value;
        const formatted = rawTime ? new Date(rawTime).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }) : '—';
        return (
          <div className="db-cell-timestamp text-xs text-tertiary flex items-center gap-1.5 select-none" title="Last Edited Time (Read-only)">
            <Clock size={12} className="opacity-60 flex-shrink-0" />
            <span className="truncate">{formatted}</span>
          </div>
        );
      }

      case PROPERTY_TYPES.AUTO_ID: {
        const currentData = useDatabaseStore.getState().getDatabaseData(blockId || '');
        const rows = currentData?.rows || [];
        const rowIndex = rows.findIndex((r: any) => r.id === row?.id);
        const seqNum = rowIndex >= 0 ? rowIndex + 1 : 1;
        const prefix = property.config?.prefix || '';
        const displayId = prefix ? `${prefix}${seqNum}` : `#${seqNum}`;
        return (
          <div className="db-cell-autoid text-xs font-mono text-tertiary select-none" title="System Auto-ID">
            <span className="px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-fg-secondary)] text-[11px] font-medium">
              {displayId}
            </span>
          </div>
        );
      }

      case PROPERTY_TYPES.RELATION: {
        const selectedIds = Array.isArray(value) ? value : [];
        const relatedDb = useDatabaseStore.getState().databases[relatedDatabaseId];
        const relatedRows = relatedDb?.rows || [];
        const relatedSchema = relatedDb?.schema || [];
        const tProp = relatedSchema[0];

        return (
          <div className="db-cell-relation flex flex-wrap gap-1 items-center" style={{ minHeight: '20px', width: '100%', position: 'relative' }}>
            {selectedIds.length === 0 ? (
              <span 
                className="text-tertiary text-xs cursor-pointer hover:text-secondary flex items-center gap-1"
                onClick={() => setShowRelationModal(true)}
              >
                <span>Empty</span>
                <span className="text-[10px] opacity-60">+</span>
              </span>
            ) : (
              selectedIds.map(id => {
                const targetRow = relatedRows.find(r => r.id === id);
                const title = tProp && targetRow ? (targetRow.values[tProp.id] || 'Untitled') : 'Untitled';
                return (
                  <span 
                    key={id} 
                    className="relation-badge inline-flex items-center gap-1"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1px 6px',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span className="truncate max-w-[120px]">{title}</span>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(selectedIds.filter(x => x !== id));
                      }}
                      className="hover:text-red-400 p-0.5"
                    >
                      ×
                    </button>
                  </span>
                );
              })
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowRelationModal(true);
              }}
              className="text-tertiary hover:text-primary p-0.5 ml-auto text-xs opacity-60 hover:opacity-100"
              title="Open Relation Picker"
            >
              <ExternalLink size={10} />
            </button>

            {isEditing && (
              <RelationDropdown
                relatedDatabaseId={relatedDatabaseId}
                selectedRowIds={selectedIds}
                onChange={onChange}
                stopEditing={stopEditing}
              />
            )}

            {showRelationModal && (
              <RelationPickerModal
                isOpen={showRelationModal}
                onClose={() => setShowRelationModal(false)}
                relatedDatabaseId={relatedDatabaseId}
                selectedRowIds={selectedIds}
                onChange={onChange}
                propertyTitle={property.name}
                reciprocalPropertyId={property.config?.reciprocalPropertyId}
              />
            )}
          </div>
        );
      }

      case PROPERTY_TYPES.ROLLUP: {
        const rollupVal = getRollupValue();
        const num = parseFloat(String(rollupVal));
        if (rollupVal !== null && rollupVal !== '' && !isNaN(num)) {
          return renderNumericProgressValue(rollupVal);
        }
        return (
          <div className="db-cell-rollup text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            {rollupVal !== null ? String(rollupVal) : 'Empty'}
          </div>
        );
      }

      case PROPERTY_TYPES.FORMULA: {
        const currentSchema = useDatabaseStore.getState().getDatabaseData(blockId)?.schema || [];
        const formulaVal = resolvePropertyValue(row || { id: '', values: rowValues }, property, currentSchema);
        const num = parseFloat(formulaVal);
        if (formulaVal !== undefined && formulaVal !== null && formulaVal !== '' && !isNaN(num)) {
          return renderNumericProgressValue(formulaVal);
        }
        return (
          <div className="db-cell-formula text-xs font-mono" style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            {formulaVal !== undefined && formulaVal !== null && formulaVal !== '' ? String(formulaVal) : 'Empty'}
          </div>
        );
      }

      default:
        return <div className="text-error">Error</div>;
    }
  };

  return (
    <div 
      className={`db-cell ${isActive ? 'is-active' : ''} ${isEditing ? 'is-editing' : ''}`}
      onDoubleClick={
        property.type !== PROPERTY_TYPES.CHECKBOX && 
        property.type !== PROPERTY_TYPES.CREATED_AT && 
        property.type !== PROPERTY_TYPES.CREATED_TIME && 
        property.type !== PROPERTY_TYPES.LAST_EDITED_TIME && 
        property.type !== PROPERTY_TYPES.AUTO_ID && 
        property.type !== PROPERTY_TYPES.ROLLUP &&
        property.type !== PROPERTY_TYPES.FORMULA
          ? startEditing 
          : undefined
      }
    >
      {renderContent()}
    </div>
  );
}
