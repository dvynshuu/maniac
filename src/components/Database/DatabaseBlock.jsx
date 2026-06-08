import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseStore } from '../../stores/databaseStore';
import { usePageStore } from '../../stores/pageStore';
import { Plus, MoreHorizontal, X } from 'lucide-react';
import ColumnHeader from './ColumnHeader';
import CellRenderer from './CellRenderer';
import AddPropertyPopover from './AddPropertyPopover';
import DatabaseToolbar from './DatabaseToolbar';
import { useFilteredDatabaseRows } from '../../core/queryEngine';
import { createId } from '../../utils/helpers';
import { PROPERTY_TYPES } from '../../utils/constants';
import { useEditorEngine } from '../../hooks/useEditorEngine';
import PageEditor from '../Editor/PageEditor';

// Memoized Row for performance
const DataRow = memo(({ row, schema, blockId, activeCell, editingCell, onCellInteraction, onUpdateCell, onUpdateCellImmediate, isNew, onOpenRow }) => {
  return (
    <tr className={`db-tr group ${isNew ? 'db-tr-new' : ''}`}>
      <td className="db-td-actions" style={{ width: '48px', minWidth: '48px', padding: '0 4px', textAlign: 'center', verticalAlign: 'middle' }}>
        <button 
          className="db-row-open-btn opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onOpenRow(row)}
        >
          Open
        </button>
      </td>
      {schema.map((prop) => (
        <td key={prop.id} className="db-td">
          <CellRenderer 
            property={prop}
            value={row.values[prop.id]}
            isActive={activeCell?.rowId === row.id && activeCell?.colId === prop.id}
            isEditing={editingCell?.rowId === row.id && editingCell?.colId === prop.id}
            onChange={(val) => {
              if (prop.type === PROPERTY_TYPES.CHECKBOX || prop.type === PROPERTY_TYPES.DATE) {
                onUpdateCellImmediate(blockId, row.id, prop.id, val);
              } else {
                onUpdateCell(blockId, row.id, prop.id, val);
              }
            }}
            startEditing={() => onCellInteraction('edit', row.id, prop.id)}
            stopEditing={() => onCellInteraction('stop_edit')}
            onFocus={() => onCellInteraction('active', row.id, prop.id)}
            blockId={blockId}
            rowValues={row.values}
          />
        </td>
      ))}
      <td className="db-td-add-placeholder" style={{ width: '32px', minWidth: '32px' }} />
      <td className="db-td-placeholder" />
    </tr>
  );
});

export default function DatabaseBlock({ block }) {
  const dbData = useDatabaseStore(s => s.databases[block.id]);
  const initializeDatabase = useDatabaseStore(s => s.initializeDatabase);
  const addRow = useDatabaseStore(s => s.addRow);
  const updateCell = useDatabaseStore(s => s.updateCell);
  const updateCellImmediate = useDatabaseStore(s => s.updateCellImmediate);
  const updateProperty = useDatabaseStore(s => s.updateProperty);
  const engine = useEditorEngine();

  const [activeCell, setActiveCell] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [resizingCol, setResizingCol] = useState(null);
  const resizerRef = useRef({ startX: 0, startSize: 0 });
  const [addPropPos, setAddPropPos] = useState(null);
  
  // Filter & Sort state
  const [filters, setFilters] = useState([]);
  const [sorts, setSorts] = useState([]);
  const [justAddedRowId, setJustAddedRowId] = useState(null);
  const [isAddingRow, setIsAddingRow] = useState(false);

  const hasSchema = !!block.properties?.schema;
  const hasRows = !!block.properties?.rows;

  useEffect(() => {
    initializeDatabase(block.id, block.properties?.schema || [], block.properties?.rows || []);
  }, [block.id, hasSchema, hasRows, initializeDatabase]);

  const { schema, rawRows } = useMemo(() => {
    if (dbData) return { schema: dbData.schema || [], rawRows: dbData.rows || [] };
    return { schema: block.properties.schema || [], rawRows: block.properties.rows || [] };
  }, [dbData, block.properties]);

  // Use query engine for filter & sort
  const processedRows = useFilteredDatabaseRows(block.id, filters, sorts);

  // Include just-added rows even if filtered out
  const rows = useMemo(() => {
    if (justAddedRowId && !processedRows.find(r => r.id === justAddedRowId)) {
      const newRow = rawRows.find(r => r.id === justAddedRowId);
      return newRow ? [...processedRows, newRow] : processedRows;
    }
    return processedRows;
  }, [processedRows, justAddedRowId, rawRows]);

  const [openRowId, setOpenRowId] = useState(null);

  const handleOpenRow = useCallback(async (row) => {
    const pageStore = usePageStore.getState();
    const titleProp = schema?.[0];
    const rowTitle = titleProp ? (row.values[titleProp.id] || '') : '';
    await pageStore.ensureRowPage(row.id, block.id, rowTitle);
    setOpenRowId(row.id);
  }, [block.id, schema]);



  const handleAddRow = async () => {
    if (isAddingRow) return;
    setIsAddingRow(true);
    try {
      const newRow = await addRow(block.id);
      if (newRow) {
        setJustAddedRowId(newRow.id);
        if (schema.length > 0) {
          handleCellInteraction('edit', newRow.id, schema[0].id);
        }
        setTimeout(() => setJustAddedRowId(null), 5000); 
      }
    } catch (err) {
      console.error('Failed to add row:', err);
    } finally {
      setIsAddingRow(false);
    }
  };

  // --- Auto-Migration ---
  const hasCells = !!block.properties?.cells;
  useEffect(() => {
    if (!block.properties?.schema && block.properties?.cells) {
      const oldCells = block.properties.cells;
      const hasHeader = block.properties.hasHeader;
      const widths = block.properties.columnWidths || [];

      const newSchema = [];
      const colCount = oldCells[0]?.length || 0;

      for (let i = 0; i < colCount; i++) {
        const name = hasHeader ? oldCells[0][i] : `Column ${i + 1}`;
        newSchema.push({
          id: `prop_${i}_${createId()}`,
          name: name || `Column ${i + 1}`,
          type: PROPERTY_TYPES.TEXT,
          width: widths[i] || 200,
          config: {}
        });
      }

      const newRows = [];
      const startIdx = hasHeader ? 1 : 0;
      for (let r = startIdx; r < oldCells.length; r++) {
        const values = {};
        for (let c = 0; c < colCount; c++) {
          values[newSchema[c].id] = oldCells[r][c];
        }
        newRows.push({
          id: `row_${r}_${createId()}`,
          values,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      engine.updateBlock(block.id, {
        type: 'database',
        properties: { schema: newSchema, rows: newRows }
      });
    }
  }, [block.id, hasSchema, hasCells, engine]);

  const handleCellInteraction = useCallback((type, rowId, colId) => {
    if (type === 'edit') setEditingCell({ rowId, colId });
    else if (type === 'stop_edit') setEditingCell(null);
    else if (type === 'active') setActiveCell({ rowId, colId });
  }, []);

  // --- Resize Logic ---
  const [tempWidths, setTempWidths] = useState({});

  const handleResizeStart = useCallback((e, propertyId) => {
    e.preventDefault();
    const prop = schema.find(p => p.id === propertyId);
    setResizingCol(propertyId);
    resizerRef.current = {
      startX: e.clientX,
      startSize: prop.width || 200
    };
  }, [schema]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!resizingCol) return;
      const delta = e.clientX - resizerRef.current.startX;
      const newWidth = Math.max(50, resizerRef.current.startSize + delta);
      setTempWidths(prev => ({ ...prev, [resizingCol]: newWidth }));
    };

    const onMouseUp = (e) => {
      if (!resizingCol) return;
      const finalWidth = tempWidths[resizingCol] || resizerRef.current.startSize;
      updateProperty(block.id, resizingCol, { width: finalWidth });
      setResizingCol(null);
      setTempWidths({});
    };

    if (resizingCol) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingCol, block.id, updateProperty, tempWidths]);

  const tableWidth = useMemo(() => {
    return schema.reduce((sum, p) => sum + (tempWidths[p.id] || p.width || 200), 0) + 48 + 32;
  }, [schema, tempWidths]);

  // ─── Render Table View ──────────────────────────────────────
  const renderView = () => {
    return (
      <div className="db-scroll-wrapper">
        <table className="db-table" style={{ minWidth: tableWidth, width: '100%' }}>
          <thead>
            <tr>
              <th className="db-th db-th-actions" style={{ width: '48px', minWidth: '48px', padding: 0 }} />
              {schema.map((prop, idx) => (
                <ColumnHeader 
                  key={prop.id}
                  property={{ ...prop, width: tempWidths[prop.id] || prop.width }}
                  className={resizingCol === prop.id ? 'is-resizing' : ''}
                  blockId={block.id}
                  isLast={idx === schema.length - 1}
                  onResizeStart={handleResizeStart}
                />
              ))}
              <th className="db-th db-th-add" style={{ width: '32px', minWidth: '32px', padding: 0 }}>
                <button className="db-add-col-btn" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setAddPropPos({ top: rect.bottom + 8, left: rect.left - 220 });
                }}>
                  <Plus size={16} />
                </button>
              </th>
              <th className="db-th db-th-placeholder" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <DataRow 
                key={row.id}
                row={row}
                schema={schema}
                blockId={block.id}
                activeCell={activeCell}
                editingCell={editingCell}
                onCellInteraction={handleCellInteraction}
                onUpdateCell={updateCell}
                onUpdateCellImmediate={updateCellImmediate}
                isNew={row.id === justAddedRowId}
                onOpenRow={handleOpenRow}
              />
            ))}
            <tr className="db-tr">
              <td colSpan={schema.length + 3} className="db-td-new">
                <button 
                  className="db-add-row-btn"
                  onClick={handleAddRow}
                  disabled={isAddingRow}
                >
                  <Plus size={14} />
                  <span>{isAddingRow ? 'Adding...' : 'New Row'}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="db-container">
      <DatabaseToolbar
        schema={schema}
        filters={filters}
        sorts={sorts}
        onFiltersChange={setFilters}
        onSortsChange={setSorts}
      />

      {renderView()}

      {addPropPos && createPortal(
        <AddPropertyPopover 
          blockId={block.id}
          position={addPropPos}
          onClose={() => setAddPropPos(null)}
        />,
        document.body
      )}

      {openRowId && createPortal(
        <div className="peak-view-backdrop" onClick={() => setOpenRowId(null)}>
          <div className="peak-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="peak-view-header">
              <button className="peak-view-close" onClick={() => setOpenRowId(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="peak-view-content">
              <PageEditor pageId={openRowId} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

