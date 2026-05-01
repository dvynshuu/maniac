/**
 * ─── Board View (Kanban) ────────────────────────────────────────
 * Groups rows by a Select property into draggable columns.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { applyGroupBy } from '../../../core/queryEngine';
import { useDatabaseStore } from '../../../stores/databaseStore';
import { Plus, MoreHorizontal } from 'lucide-react';
import { PROPERTY_COLORS } from '../../../utils/constants';

export default function BoardView({ schema, rows, blockId, groupByPropertyId }) {
  const updateCell = useDatabaseStore(s => s.updateCell);
  const addRow = useDatabaseStore(s => s.addRow);
  const [draggedRow, setDraggedRow] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const groupProperty = useMemo(() =>
    schema.find(p => p.id === groupByPropertyId) || schema.find(p => p.type === 'select'),
  [schema, groupByPropertyId]);

  const groups = useMemo(() => {
    if (!groupProperty) return new Map([['All', rows]]);
    return applyGroupBy(rows, groupProperty.id, schema);
  }, [rows, groupProperty, schema]);

  const titleProp = useMemo(() =>
    schema.find(p => p.type === 'text') || schema[0],
  [schema]);

  const getColumnColor = useCallback((colName) => {
    if (!groupProperty?.config?.options) return null;
    const opt = groupProperty.config.options.find(o =>
      (o.name || o.value || o) === colName
    );
    if (opt?.color) {
      const pc = PROPERTY_COLORS.find(c => c.name === opt.color);
      return pc || null;
    }
    return null;
  }, [groupProperty]);

  const handleDragStart = (e, row) => {
    setDraggedRow(row);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colName) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(colName);
  };

  const handleDrop = (e, colName) => {
    e.preventDefault();
    if (draggedRow && groupProperty) {
      const newValue = colName === 'No Value' ? '' : colName;
      updateCell(blockId, draggedRow.id, groupProperty.id, newValue);
    }
    setDraggedRow(null);
    setDragOverColumn(null);
  };

  const handleAddCardToColumn = async (colName) => {
    const defaults = {};
    if (groupProperty) {
      defaults[groupProperty.id] = colName === 'No Value' ? '' : colName;
    }
    await addRow(blockId, { values: defaults });
  };

  if (!groupProperty) {
    return (
      <div style={{ padding: '24px', color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center' }}>
        Add a <strong>Select</strong> property to use Board view.
      </div>
    );
  }

  return (
    <div className="board-view">
      {[...groups.entries()].map(([colName, colRows]) => {
        const color = getColumnColor(colName);
        const isDragOver = dragOverColumn === colName;

        return (
          <div
            key={colName}
            className={`board-column ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, colName)}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => handleDrop(e, colName)}
          >
            <div className="board-column-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {color && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: color.text, display: 'inline-block'
                  }} />
                )}
                <span className="board-column-title">{colName}</span>
                <span className="board-column-count">{colRows.length}</span>
              </div>
            </div>

            <div className="board-column-cards">
              {colRows.map(row => (
                <div
                  key={row.id}
                  className="board-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, row)}
                >
                  <div className="board-card-title">
                    {titleProp ? (row.values[titleProp.id] || 'Untitled') : 'Untitled'}
                  </div>
                  <div className="board-card-props">
                    {schema.filter(p => p.id !== titleProp?.id && p.id !== groupProperty?.id).slice(0, 2).map(p => (
                      <div key={p.id} className="board-card-prop">
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{p.name}</span>
                        <span style={{ fontSize: '12px' }}>{String(row.values[p.id] ?? '')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="board-add-card-btn"
              onClick={() => handleAddCardToColumn(colName)}
            >
              <Plus size={14} />
              <span>New</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
