import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useDatabaseStore } from '../../stores/databaseStore';
import { usePageStore } from '../../stores/pageStore';
import { Plus, MoreHorizontal, X, ExternalLink, Database, Layers, ArrowRight } from 'lucide-react';
import { useBlockStore } from '../../stores/blockStore';
import ColumnHeader from './ColumnHeader';
import CellRenderer from './CellRenderer';
import AddPropertyPopover from './AddPropertyPopover';
import DatabaseToolbar from './DatabaseToolbar';
import BoardView from './views/BoardView';
import CalendarView from './views/CalendarView';
import GalleryView from './views/GalleryView';
import TimelineView from './views/TimelineView';
import ListView from './views/ListView';
import ChartView from './views/ChartView';
import { useFilteredDatabaseRows } from '../../core/queryEngine';
import { createId } from '../../utils/helpers';
import { PROPERTY_TYPES } from '../../utils/constants';
import { useEditorEngine } from '../../hooks/useEditorEngine';
import PageEditor from '../Editor/PageEditor';

interface DataRowProps {
  row: any;
  schema: any[];
  blockId: string;
  activeCell: any;
  editingCell: any;
  onCellInteraction: any;
  onUpdateCell: any;
  onUpdateCellImmediate: any;
  isNew?: boolean;
  onOpenRow: any;
}

// Memoized Row for performance
const DataRow = memo<DataRowProps>(({ row, schema, blockId, activeCell, editingCell, onCellInteraction, onUpdateCell, onUpdateCellImmediate, isNew, onOpenRow }: DataRowProps) => {
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
            row={row}
          />
        </td>
      ))}
      <td className="db-td-add-placeholder" style={{ width: '32px', minWidth: '32px' }} />
      <td className="db-td-placeholder" />
    </tr>
  );
});

export default function DatabaseBlock({ block }) {
  const isLinked = Boolean(
    block.type === 'linked_database' ||
    (block.properties?.databaseId && block.properties.databaseId !== block.id)
  );
  const targetDbId = block.properties?.databaseId || block.id;

  const dbData = useDatabaseStore(s => s.databases[targetDbId]);
  const initializeDatabase = useDatabaseStore(s => s.initializeDatabase);
  const addRow = useDatabaseStore(s => s.addRow);
  const updateCell = useDatabaseStore(s => s.updateCell);
  const updateCellImmediate = useDatabaseStore(s => s.updateCellImmediate);
  const updateProperty = useDatabaseStore(s => s.updateProperty);
  const engine = useEditorEngine(block.pageId);

  const [activeView, setActiveView] = useState(block.properties?.view || 'table');
  const [activeCell, setActiveCell] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [resizingCol, setResizingCol] = useState(null);
  const resizerRef = useRef({ startX: 0, startSize: 0 });
  const [addPropPos, setAddPropPos] = useState(null);
  const [showDbPicker, setShowDbPicker] = useState(false);
  
  // Independent Filter & Sort state persisted per block
  const [filters, setFilters] = useState(block.properties?.filters || []);
  const [sorts, setSorts] = useState(block.properties?.sorts || []);
  const [justAddedRowId, setJustAddedRowId] = useState(null);
  const [isAddingRow, setIsAddingRow] = useState(false);

  const hasSchema = !!block.properties?.schema;
  const hasRows = !!block.properties?.rows;

  useEffect(() => {
    if (!isLinked) {
      initializeDatabase(block.id, block.properties?.schema || [], block.properties?.rows || []);
    } else if (targetDbId && !dbData) {
      initializeDatabase(targetDbId, [], []);
    }
  }, [block.id, targetDbId, isLinked, hasSchema, hasRows, initializeDatabase, dbData]);

  const { schema, rawRows } = useMemo(() => {
    if (dbData) return { schema: dbData.schema || [], rawRows: dbData.rows || [] };
    return { schema: block.properties?.schema || [], rawRows: block.properties?.rows || [] };
  }, [dbData, block.properties]);

  // Use query engine for filter & sort
  const processedRows: any[] = (useFilteredDatabaseRows(targetDbId, filters, sorts) as any[]) || [];

  // Include just-added rows even if filtered out
  const rows = useMemo(() => {
    if (justAddedRowId && !processedRows.find((r: any) => r.id === justAddedRowId)) {
      const newRow = rawRows.find((r: any) => r.id === justAddedRowId);
      return newRow ? [...processedRows, newRow] : processedRows;
    }
    return processedRows;
  }, [processedRows, justAddedRowId, rawRows]);

  const navigate = useNavigate();

  // Find all available databases in workspace for linked view picker
  const allBlocks = useBlockStore(s => s.blockMap);
  const allLoadedDbs = useDatabaseStore(s => s.databases);
  const availableDatabases = useMemo(() => {
    const list: { id: string; title: string; rowCount: number }[] = [];
    const seenIds = new Set<string>();

    Object.values(allBlocks).forEach(b => {
      if (b.type === 'database' && b.id !== block.id && !seenIds.has(b.id)) {
        seenIds.add(b.id);
        const rowsCount = allLoadedDbs[b.id]?.rows?.length ?? b.properties?.rows?.length ?? 0;
        list.push({
          id: b.id,
          title: b.content || b.properties?.schema?.[0]?.name || `Database (${b.id.slice(0, 6)})`,
          rowCount: rowsCount
        });
      }
    });

    Object.keys(allLoadedDbs).forEach(dbId => {
      if (dbId !== block.id && !seenIds.has(dbId)) {
        seenIds.add(dbId);
        list.push({
          id: dbId,
          title: `Database (${dbId.slice(0, 6)})`,
          rowCount: allLoadedDbs[dbId]?.rows?.length ?? 0
        });
      }
    });

    return list;
  }, [allBlocks, allLoadedDbs, block.id]);

  const sourceBlock = useBlockStore(s => s.blockMap[targetDbId]);
  const sourceTitle = sourceBlock?.content || dbData?.schema?.[0]?.name || `Database (${targetDbId.slice(0, 6)})`;

  const handleSelectSourceDatabase = (dbId: string) => {
    engine.updateBlock(block.id, {
      properties: {
        ...block.properties,
        databaseId: dbId,
        isLinkedView: true,
      }
    });
    setShowDbPicker(false);
  };

  const handleOpenRow = useCallback(async (row) => {
    const pageStore = usePageStore.getState();
    const titleProp = schema?.[0];
    const rowTitle = titleProp ? (row.values[titleProp.id] || '') : '';
    await pageStore.ensureRowPage(row.id, targetDbId, rowTitle);
    navigate(`/app/page/${row.id}`);
  }, [targetDbId, schema, navigate]);

  const handleAddRow = async (overrides = {}) => {
    if (isAddingRow) return;
    setIsAddingRow(true);
    try {
      const newRow = await addRow(targetDbId, overrides);
      if (newRow) {
        setJustAddedRowId(newRow.id);
        if (schema.length > 0 && activeView === 'table') {
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

  const handleViewChange = (newView) => {
    setActiveView(newView);
    engine.updateBlock(block.id, {
      properties: { ...block.properties, view: newView }
    });
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    engine.updateBlock(block.id, {
      properties: { ...block.properties, filters: newFilters }
    });
  };

  const handleSortsChange = (newSorts) => {
    setSorts(newSorts);
    engine.updateBlock(block.id, {
      properties: { ...block.properties, sorts: newSorts }
    });
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
      updateProperty(targetDbId, resizingCol, { width: finalWidth });
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
  }, [resizingCol, targetDbId, updateProperty, tempWidths]);

  const tableWidth = useMemo(() => {
    return schema.reduce((sum, p) => sum + (tempWidths[p.id] || p.width || 200), 0) + 48 + 32;
  }, [schema, tempWidths]);

  // If it's a linked view and no source has been selected yet (or user clicked to change)
  if ((block.type === 'linked_database' && !block.properties?.databaseId) || showDbPicker) {
    return (
      <div className="db-linked-picker-card">
        <div className="db-linked-picker-header">
          <Layers size={18} className="text-tertiary" />
          <div className="picker-text">
            <span className="title">Select Database to Link</span>
            <span className="subtitle">Display synchronized rows with independent view & filters</span>
          </div>
          {showDbPicker && (
            <button type="button" className="close-btn" onClick={() => setShowDbPicker(false)}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="db-linked-options-list">
          {availableDatabases.map(db => (
            <button
              key={db.id}
              type="button"
              className="db-linked-option-item"
              onClick={() => handleSelectSourceDatabase(db.id)}
            >
              <div className="item-left">
                <Database size={15} className="text-secondary" />
                <span className="option-title">{db.title}</span>
              </div>
              <div className="item-right">
                <span className="option-meta">{db.rowCount} rows</span>
                <ArrowRight size={13} className="text-tertiary" />
              </div>
            </button>
          ))}
          {availableDatabases.length === 0 && (
            <div className="db-linked-no-dbs">
              <span>No databases found in workspace. Create a regular Database block first.</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Render Active View ─────────────────────────────────────
  const renderView = () => {
    if (activeView === 'board') {
      return (
        <BoardView 
          schema={schema}
          rows={rows}
          blockId={targetDbId}
          onUpdateCell={updateCell}
          onUpdateCellImmediate={updateCellImmediate}
          onAddRow={handleAddRow}
          onOpenRow={handleOpenRow}
        />
      );
    }

    if (activeView === 'calendar') {
      return (
        <CalendarView 
          schema={schema}
          rows={rows}
          blockId={targetDbId}
          onUpdateCell={updateCell}
          onUpdateCellImmediate={updateCellImmediate}
          onAddRow={handleAddRow}
          onOpenRow={handleOpenRow}
        />
      );
    }

    if (activeView === 'gallery') {
      return (
        <GalleryView 
          schema={schema}
          rows={rows}
          blockId={targetDbId}
          onUpdateCell={updateCell}
          onUpdateCellImmediate={updateCellImmediate}
          onAddRow={handleAddRow}
          onOpenRow={handleOpenRow}
        />
      );
    }

    if (activeView === 'timeline') {
      return (
        <TimelineView 
          schema={schema}
          rows={rows}
          blockId={targetDbId}
          onUpdateCell={updateCell}
          onUpdateCellImmediate={updateCellImmediate}
          onAddRow={handleAddRow}
          onOpenRow={handleOpenRow}
        />
      );
    }

    if (activeView === 'list') {
      return (
        <ListView 
          schema={schema}
          rows={rows}
          blockId={targetDbId}
          onUpdateCell={updateCell}
          onUpdateCellImmediate={updateCellImmediate}
          onAddRow={handleAddRow}
          onOpenRow={handleOpenRow}
        />
      );
    }

    if (activeView === 'chart') {
      return (
        <ChartView 
          schema={schema}
          rows={rows}
          blockId={targetDbId}
        />
      );
    }

    // Default: Table View
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
                  blockId={targetDbId}
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
                blockId={targetDbId}
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
                  onClick={() => handleAddRow()}
                  disabled={isAddingRow}
                >
                  <span>{isAddingRow ? 'Adding...' : '+ New page'}</span>
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
      {isLinked && (
        <div className="db-linked-banner">
          <div className="db-linked-badge">
            <ExternalLink size={12} className="text-secondary" />
            <span className="db-linked-label">LINKED VIEW</span>
            <span className="db-linked-source-name">{sourceTitle}</span>
          </div>
          <button
            type="button"
            className="db-linked-switch-btn"
            onClick={() => setShowDbPicker(true)}
            title="Switch linked database"
          >
            Change Source
          </button>
        </div>
      )}

      <DatabaseToolbar
        schema={schema}
        filters={filters}
        sorts={sorts}
        activeView={activeView}
        onViewChange={handleViewChange}
        onFiltersChange={handleFiltersChange}
        onSortsChange={handleSortsChange}
        onAddRow={() => handleAddRow()}
      />

      {renderView()}

      {addPropPos && createPortal(
        <AddPropertyPopover 
          blockId={targetDbId}
          position={addPropPos}
          onClose={() => setAddPropPos(null)}
        />,
        document.body
      )}
    </div>
  );
}

