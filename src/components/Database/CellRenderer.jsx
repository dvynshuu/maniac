import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PROPERTY_TYPES, PROPERTY_COLORS } from '../../utils/constants';
import { formatDate, formatDateTime, debounce } from '../../utils/helpers';
import * as Icons from 'lucide-react';
import { ExternalLink, Mail, Phone, Clock, Calendar, CheckSquare, Square, Type, Hash, Tag, Tags } from 'lucide-react';
import SelectDropdown from './SelectDropdown';
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
                  {isSelected && <Icons.Check size={12} />}
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
  row
}) {
  const inputRef = useRef(null);
  const [localValue, setLocalValue] = useState(value);

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
      case 'sum': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return nums.reduce((sum, n) => sum + n, 0);
      }
      case 'average': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return nums.length > 0 ? (nums.reduce((sum, n) => sum + n, 0) / nums.length) : 0;
      }
      case 'min': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return nums.length > 0 ? Math.min(...nums) : 0;
      }
      case 'max': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return nums.length > 0 ? Math.max(...nums) : 0;
      }
      case 'show_original':
      default:
        return values.join(', ');
    }
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
          <div className="db-cell-number text-right">{value || ''}</div>
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
        return (
          <div className="db-cell-timestamp text-xs text-tertiary">
            {formatDate(value)}
          </div>
        );

      case PROPERTY_TYPES.RELATION: {
        const selectedIds = Array.isArray(value) ? value : [];
        const relatedDb = useDatabaseStore.getState().databases[relatedDatabaseId];
        const relatedRows = relatedDb?.rows || [];
        const relatedSchema = relatedDb?.schema || [];
        const tProp = relatedSchema[0];

        return (
          <div className="db-cell-relation flex flex-wrap gap-1 items-center" style={{ minHeight: '20px', width: '100%', position: 'relative' }}>
            {selectedIds.length === 0 ? (
              <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>Empty</span>
            ) : (
              selectedIds.map(id => {
                const targetRow = relatedRows.find(r => r.id === id);
                const title = tProp && targetRow ? (targetRow.values[tProp.id] || 'Untitled') : 'Untitled';
                return (
                  <span 
                    key={id} 
                    className="relation-badge"
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
                    {title}
                  </span>
                );
              })
            )}
            {isEditing && (
              <RelationDropdown
                relatedDatabaseId={relatedDatabaseId}
                selectedRowIds={selectedIds}
                onChange={onChange}
                stopEditing={stopEditing}
              />
            )}
          </div>
        );
      }

      case PROPERTY_TYPES.ROLLUP: {
        const rollupVal = getRollupValue();
        return (
          <div className="db-cell-rollup text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            {rollupVal !== null ? String(rollupVal) : 'Empty'}
          </div>
        );
      }

      case PROPERTY_TYPES.FORMULA: {
        const currentSchema = useDatabaseStore.getState().getDatabaseData(blockId)?.schema || [];
        const formulaVal = resolvePropertyValue(row || { id: '', values: rowValues }, property, currentSchema);
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
