import React, { useState, useMemo } from 'react';
import { Plus, MoreHorizontal, Calendar, CheckSquare, Tag, Hash, FileText, ChevronRight } from 'lucide-react';
import { PROPERTY_TYPES } from '../../../utils/constants';

export default function BoardView({ 
  schema, 
  rows, 
  blockId, 
  onUpdateCell, 
  onUpdateCellImmediate, 
  onAddRow, 
  onOpenRow, 
  groupPropertyId: propGroupPropertyId 
}) {
  // Find group-by property (prefer select, multi_select, or status, else first property)
  const groupableProperties = useMemo(() => {
    return schema.filter(p => [
      PROPERTY_TYPES.SELECT, 
      PROPERTY_TYPES.MULTI_SELECT, 
      PROPERTY_TYPES.CHECKBOX,
      PROPERTY_TYPES.TEXT
    ].includes(p.type));
  }, [schema]);

  const [selectedGroupPropId, setSelectedGroupPropId] = useState(
    propGroupPropertyId || 
    schema.find(p => p.type === PROPERTY_TYPES.SELECT || p.type === 'status')?.id || 
    groupableProperties[0]?.id || 
    schema[0]?.id
  );

  const groupProperty = useMemo(() => {
    return schema.find(p => p.id === selectedGroupPropId) || schema[0];
  }, [schema, selectedGroupPropId]);

  // Drag-and-drop state
  const [draggedRowId, setDraggedRowId] = useState(null);
  const [dragOverColumnKey, setDragOverColumnKey] = useState(null);

  // Group columns
  const columns = useMemo(() => {
    if (!groupProperty) return [{ key: '__all', label: 'All Items', rows, color: 'var(--text-secondary)', bg: 'rgba(255, 255, 255, 0.05)' }];

    const cols = [];
    const isSelect = groupProperty.type === PROPERTY_TYPES.SELECT || groupProperty.type === 'status';
    const isCheckbox = groupProperty.type === PROPERTY_TYPES.CHECKBOX;

    if (isSelect && groupProperty.config?.options && groupProperty.config.options.length > 0) {
      // Configured options
      groupProperty.config.options.forEach(opt => {
        const key = typeof opt === 'string' ? opt : opt.value || opt.name;
        const label = typeof opt === 'string' ? opt : opt.name || opt.value;
        const color = opt.color || 'var(--accent-primary)';
        const bg = opt.bg || 'rgba(99, 102, 241, 0.15)';
        cols.push({
          key,
          label,
          color,
          bg,
          rows: rows.filter(r => String(r.values[groupProperty.id] || '') === String(key))
        });
      });
      // "No Option" column for unassigned
      cols.unshift({
        key: '__empty',
        label: 'No ' + (groupProperty.name || 'Status'),
        color: 'var(--text-tertiary)',
        bg: 'rgba(255, 255, 255, 0.04)',
        rows: rows.filter(r => !r.values[groupProperty.id] || r.values[groupProperty.id] === '')
      });
    } else if (isCheckbox) {
      cols.push({
        key: 'false',
        label: 'To Do',
        color: 'var(--text-secondary)',
        bg: 'rgba(255, 255, 255, 0.05)',
        rows: rows.filter(r => !r.values[groupProperty.id])
      });
      cols.push({
        key: 'true',
        label: 'Completed',
        color: 'var(--success)',
        bg: 'rgba(16, 185, 129, 0.15)',
        rows: rows.filter(r => !!r.values[groupProperty.id])
      });
    } else {
      // Dynamic grouping by unique values
      const uniqueVals = new Set();
      rows.forEach(r => {
        const val = r.values[groupProperty.id];
        if (val !== undefined && val !== null && val !== '') {
          uniqueVals.add(String(val));
        }
      });
      cols.push({
        key: '__empty',
        label: 'No ' + (groupProperty.name || 'Value'),
        color: 'var(--text-tertiary)',
        bg: 'rgba(255, 255, 255, 0.04)',
        rows: rows.filter(r => !r.values[groupProperty.id] || r.values[groupProperty.id] === '')
      });
      uniqueVals.forEach(val => {
        cols.push({
          key: val,
          label: val,
          color: 'var(--accent-primary)',
          bg: 'rgba(99, 102, 241, 0.12)',
          rows: rows.filter(r => String(r.values[groupProperty.id]) === val)
        });
      });
    }

    return cols;
  }, [groupProperty, rows]);

  const handleDragStart = (e, rowId) => {
    e.dataTransfer.setData('text/plain', rowId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedRowId(rowId);
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnKey !== colKey) {
      setDragOverColumnKey(colKey);
    }
  };

  const handleDrop = (e, targetColKey) => {
    e.preventDefault();
    setDragOverColumnKey(null);
    const rowId = e.dataTransfer.getData('text/plain') || draggedRowId;
    setDraggedRowId(null);
    if (!rowId || !groupProperty) return;

    let targetValue = targetColKey === '__empty' ? '' : targetColKey;
    if (groupProperty.type === PROPERTY_TYPES.CHECKBOX) {
      targetValue = targetColKey === 'true';
    }

    onUpdateCellImmediate(blockId, rowId, groupProperty.id, targetValue);
  };

  const handleAddCardInColumn = (colKey) => {
    let initialVal = colKey === '__empty' ? '' : colKey;
    if (groupProperty && groupProperty.type === PROPERTY_TYPES.CHECKBOX) {
      initialVal = colKey === 'true';
    }
    const overrides = groupProperty ? { [groupProperty.id]: initialVal } : {};
    onAddRow(overrides);
  };

  const titleProp = schema[0] || { id: 'title', name: 'Name' };
  const previewProps = schema.filter(p => p.id !== titleProp.id && p.id !== groupProperty?.id).slice(0, 3);

  return (
    <div className="board-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', overflowX: 'auto', paddingBottom: '16px' }}>
      {/* Board View Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span>Group by:</span>
          <select
            value={selectedGroupPropId}
            onChange={(e) => setSelectedGroupPropId(e.target.value)}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              padding: '3px 8px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {groupableProperties.map(p => (
              <option key={p.id} value={p.id}>{p.name || 'Untitled'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div style={{ display: 'flex', gap: '14px', minHeight: '380px', alignItems: 'flex-start' }}>
        {columns.map(col => {
          const isOver = dragOverColumnKey === col.key;
          return (
            <div
              key={col.key}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={() => setDragOverColumnKey(null)}
              onDrop={(e) => handleDrop(e, col.key)}
              style={{
                flex: '0 0 260px',
                width: '260px',
                background: isOver ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                border: isOver ? '1px dashed var(--accent-primary)' : '1px solid var(--border-subtle)',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 280px)',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Column Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: col.color,
                      background: col.bg,
                      maxWidth: '160px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {col.label}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                    {col.rows.length}
                  </span>
                </div>
                <button
                  onClick={() => handleAddCardInColumn(col.key)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Add card"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', overflowY: 'auto', flex: 1 }}>
                {col.rows.map(row => {
                  const title = row.values[titleProp.id] || 'Untitled';
                  const isDragging = draggedRowId === row.id;

                  return (
                    <div
                      key={row.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, row.id)}
                      onClick={() => onOpenRow(row)}
                      style={{
                        background: isDragging ? 'rgba(255, 255, 255, 0.02)' : 'var(--bg-primary)',
                        opacity: isDragging ? 0.4 : 1,
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        cursor: 'grab',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                      }}
                    >
                      {/* Card Title */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {title}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenRow(row);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-tertiary)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Property Preview Chips */}
                      {previewProps.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                          {previewProps.map(p => {
                            const val = row.values[p.id];
                            if (val === undefined || val === null || val === '') return null;

                            return (
                              <div
                                key={p.id}
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(255, 255, 255, 0.04)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-subtle)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <span style={{ color: 'var(--text-tertiary)' }}>{p.name}:</span>
                                <span>{String(val)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Quick Add Button at bottom of column */}
                <button
                  onClick={() => handleAddCardInColumn(col.key)}
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: '6px',
                    color: 'var(--text-tertiary)',
                    padding: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    marginTop: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-tertiary)';
                  }}
                >
                  <Plus size={13} /> Add card
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
