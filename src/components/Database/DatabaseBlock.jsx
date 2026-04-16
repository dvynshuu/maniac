import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseStore } from '../../stores/databaseStore';
import { useBlockStore } from '../../stores/blockStore';
import { Plus, MoreHorizontal } from 'lucide-react';
import ColumnHeader from './ColumnHeader';
import CellRenderer from './CellRenderer';
import AddPropertyPopover from './AddPropertyPopover';
import DatabaseToolbar from './DatabaseToolbar';
import { createId } from '../../utils/helpers';
import { PROPERTY_TYPES } from '../../utils/constants';

// Memoized Row for performance
const DataRow = memo(({ row, schema, blockId, activeCell, editingCell, onCellInteraction, onUpdateCell, onUpdateCellImmediate }) => {
  return (
    <tr className="db-tr group">
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
          />
        </td>
      ))}
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
  const updateBlock = useBlockStore(s => s.updateBlock);

  const [activeCell, setActiveCell] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [resizingCol, setResizingCol] = useState(null);
  const resizerRef = useRef({ startX: 0, startSize: 0 });
  const [addPropPos, setAddPropPos] = useState(null);
  
  // Filter & Sort state
  const [filters, setFilters] = useState([]);
  const [sorts, setSorts] = useState([]);
  const [processedRows, setProcessedRows] = useState([]);

  useEffect(() => {
    if (block.properties.schema) {
      initializeDatabase(block.id, block.properties.schema, block.properties.rows || []);
    }
  }, [block.id, block.properties.schema, block.properties.rows, initializeDatabase]);

  const { schema, rawRows } = useMemo(() => {
    if (dbData) return { schema: dbData.schema, rawRows: dbData.rows };
    return { schema: block.properties.schema || [], rawRows: block.properties.rows || [] };
  }, [dbData, block.properties]);

  // Debounced Filter & Sort Logic
  useEffect(() => {
    const handler = setTimeout(() => {
      let result = [...rawRows];
      
      // Apply filters
      for (const f of filters) {
        if (!f.propertyId) continue;
        result = result.filter(row => {
          const val = String(row.values[f.propertyId] ?? '').toLowerCase();
          switch (f.operator) {
            case 'contains': return val.includes((f.value || '').toLowerCase());
            case 'equals': return val === (f.value || '').toLowerCase();
            case 'not_empty': return val.length > 0;
            case 'empty': return val.length === 0;
            default: return true;
          }
        });
      }
      
      // Apply sorts
      for (const s of sorts) {
        if (!s.propertyId) continue;
        result.sort((a, b) => {
          const aVal = String(a.values[s.propertyId] ?? '');
          const bVal = String(b.values[s.propertyId] ?? '');
          const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
          return s.direction === 'desc' ? -cmp : cmp;
        });
      }

      setProcessedRows(result);
    }, 300); // 300ms debounce

    return () => clearTimeout(handler);
  }, [rawRows, filters, sorts]);

  const rows = processedRows;

  // --- Auto-Migration ---
  useEffect(() => {
    if (!block.properties.schema && block.properties.cells) {
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

      updateBlock(block.id, {
        type: 'database',
        properties: {
          schema: newSchema,
          rows: newRows
        }
      });
    }
  }, [block, updateBlock]);

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
    return schema.reduce((sum, p) => sum + (tempWidths[p.id] || p.width || 200), 0) + 48;
  }, [schema, tempWidths]);

  return (
    <div className="db-container">
      <DatabaseToolbar
        schema={schema}
        filters={filters}
        sorts={sorts}
        onFiltersChange={setFilters}
        onSortsChange={setSorts}
      />
      <div className="db-scroll-wrapper">
        <table className="db-table" style={{ minWidth: tableWidth, width: '100%' }}>
          <thead>
            <tr>
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
              <th className="db-th-add">
                <button className="db-add-col-btn" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setAddPropPos({ top: rect.bottom + 8, left: rect.left - 220 });
                }}>
                  <Plus size={16} />
                </button>
              </th>
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
              />
            ))}
            <tr className="db-tr">
              <td colSpan={schema.length + 1} className="db-td-new">
                 <button 
                  className="db-add-row-btn"
                  onClick={() => addRow(block.id)}
                 >
                   <Plus size={14} />
                   <span>New Row</span>
                 </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {addPropPos && createPortal(
        <AddPropertyPopover 
          blockId={block.id}
          position={addPropPos}
          onClose={() => setAddPropPos(null)}
        />,
        document.body
      )}
    </div>
  );
}
