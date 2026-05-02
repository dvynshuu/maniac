import React, { useState, useEffect, useRef } from 'react';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { sanitize } from '../../../utils/sanitizer';
import { Plus, Minus, Layout, GripVertical } from 'lucide-react';

export default function TableBlock({ block }) {
  // Check if it's using the old broken schema and reset if needed
  const isMigrated = !block.properties.columns; 
  
  const [cells, setCells] = useState(isMigrated ? (block.properties.cells || [['', ''], ['', '']]) : [['', ''], ['', '']]);
  const [hasHeader, setHasHeader] = useState(isMigrated ? (block.properties.hasHeader || false) : true);
  const [columnWidths, setColumnWidths] = useState(isMigrated ? (block.properties.columnWidths || []) : [200, 200]);
  const [rowHeights, setRowHeights] = useState(isMigrated ? (block.properties.rowHeights || []) : [40, 40]);
  
  const [resizingCol, setResizingCol] = useState(null);
  const [resizingRow, setResizingRow] = useState(null);
  const resizerRef = useRef({ startX: 0, startY: 0, startSize: 0 });

  const engine = useEditorEngine();
  
  // Clean off the bad columns/rows schema if present
  useEffect(() => {
    if (!isMigrated || !block.properties.cells) {
      engine.updateBlock(block.id, { 
        properties: { 
          cells: [['', ''], ['', '']], 
          hasHeader: true,
          columnWidths: [250, 250],
          rowHeights: [40, 40]
        } 
      });
    }
  }, [block.id, isMigrated]);

  useEffect(() => {
    if (block.properties.columnWidths) setColumnWidths(block.properties.columnWidths);
    if (block.properties.rowHeights) setRowHeights(block.properties.rowHeights);
  }, [block.properties.columnWidths, block.properties.rowHeights]);

  const save = (newCells, newHeader = hasHeader, newWidths = columnWidths, newHeights = rowHeights) => {
    engine.updateBlock(block.id, { 
      properties: { 
        cells: newCells,
        hasHeader: newHeader,
        columnWidths: newWidths,
        rowHeights: newHeights
      } 
    });
  };

  const handleCellBlur = (rowIndex, colIndex, html) => {
    const newCells = [...cells];
    newCells[rowIndex] = [...newCells[rowIndex]];
    newCells[rowIndex][colIndex] = sanitize(html);
    setCells(newCells);
    save(newCells);
  };

  const addRow = (index = cells.length) => {
    const newCells = [...cells];
    newCells.splice(index, 0, new Array(cells[0].length).fill(''));
    const newHeights = [...rowHeights];
    newHeights.splice(index, 0, 40);
    setCells(newCells);
    setRowHeights(newHeights);
    save(newCells, hasHeader, columnWidths, newHeights);
  };

  const addColumn = () => {
    const newCells = cells.map(row => [...row, '']);
    const newWidths = [...columnWidths, 200];
    setCells(newCells);
    setColumnWidths(newWidths);
    save(newCells, hasHeader, newWidths);
  };

  const removeRow = (index) => {
    if (cells.length <= 1) return;
    const newCells = cells.filter((_, i) => i !== index);
    const newHeights = rowHeights.filter((_, i) => i !== index);
    setCells(newCells);
    setRowHeights(newHeights);
    save(newCells, hasHeader, columnWidths, newHeights);
  };

  const removeColumn = () => {
    if (cells[0].length <= 1) return;
    const newCells = cells.map(row => row.slice(0, -1));
    const newWidths = columnWidths.slice(0, -1);
    setCells(newCells);
    setColumnWidths(newWidths);
    save(newCells, hasHeader, newWidths);
  };

  const toggleHeader = () => {
    const newState = !hasHeader;
    setHasHeader(newState);
    save(cells, newState);
  };

  // Resizing Handlers
  const onMouseDownCol = (e, index) => {
    e.preventDefault();
    setResizingCol(index);
    resizerRef.current = {
      startX: e.clientX,
      startSize: columnWidths[index] || 200
    };
  };

  const onMouseDownRow = (e, index) => {
    e.preventDefault();
    setResizingRow(index);
    resizerRef.current = {
      startY: e.clientY,
      startSize: rowHeights[index] || 40
    };
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (resizingCol !== null) {
        const delta = e.clientX - resizerRef.current.startX;
        const newWidths = [...columnWidths];
        newWidths[resizingCol] = Math.max(50, resizerRef.current.startSize + delta);
        setColumnWidths(newWidths);
      } else if (resizingRow !== null) {
        const delta = e.clientY - resizerRef.current.startY;
        const newHeights = [...rowHeights];
        newHeights[resizingRow] = Math.max(30, resizerRef.current.startSize + delta);
        setRowHeights(newHeights);
      }
    };

    const onMouseUp = () => {
      if (resizingCol !== null || resizingRow !== null) {
        save(cells, hasHeader, columnWidths, rowHeights);
      }
      setResizingCol(null);
      setResizingRow(null);
    };

    if (resizingCol !== null || resizingRow !== null) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingCol, resizingRow, columnWidths, rowHeights, cells, hasHeader]);

  return (
    <div className="notion-table-container">
      <div className="table-controls">
        <button className="table-control-btn" onClick={toggleHeader}>
          <Layout size={14} />
          {hasHeader ? 'Title Row' : 'No Title Row'}
        </button>
        <button className="table-control-btn" onClick={addColumn}>
          <Plus size={14} /> Col
        </button>
        <button className="table-control-btn danger" onClick={removeColumn}>
          <Minus size={14} /> Col
        </button>
      </div>

      <div className="notion-table-scroll">
        <table className="notion-table" style={{ width: columnWidths.reduce((a, b) => a + b, 0) || '100%' }}>
          <colgroup>
            {columnWidths.map((width, i) => (
              <col key={i} style={{ width }} />
            ))}
          </colgroup>
          <tbody>
            {cells.map((row, rowIndex) => (
              <tr key={rowIndex} className="notion-tr" style={{ height: rowHeights[rowIndex] || 'auto' }}>
                {row.map((cell, colIndex) => {
                  const isHeader = hasHeader && rowIndex === 0;
                  const Tag = isHeader ? 'th' : 'td';
                  return (
                    <Tag key={colIndex} className="notion-td">
                      {colIndex === 0 && (
                        <div className="notion-row-hover">
                          <div className="notion-row-action" onClick={() => addRow(rowIndex + 1)} title="Add row below">
                            <Plus size={12} />
                          </div>
                          <div className="notion-row-action" onClick={() => removeRow(rowIndex)} title="Delete row">
                            <Minus size={12} />
                          </div>
                        </div>
                      )}
                      <div
                        key={`cell-${rowIndex}-${colIndex}`}
                        className="table-cell-editable"
                        data-row={rowIndex}
                        data-col={colIndex}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleCellBlur(rowIndex, colIndex, e.currentTarget.innerHTML)}
                        dangerouslySetInnerHTML={{ __html: cell }}
                      />
                      {/* Resizers */}
                      <div 
                        className={`col-resizer ${resizingCol === colIndex ? 'is-resizing' : ''}`}
                        onMouseDown={(e) => onMouseDownCol(e, colIndex)}
                      />
                      {colIndex === 0 && (
                        <div 
                          className={`row-resizer ${resizingRow === rowIndex ? 'is-resizing' : ''}`}
                          onMouseDown={(e) => onMouseDownRow(e, rowIndex)}
                        />
                      )}
                    </Tag>
                  );
                })}
              </tr>
            ))}
            {/* Native add row at bottom */}
            <tr className="notion-tr">
              <td colSpan={cells[0]?.length || 1} className="notion-td borderless-bottom">
                 <div 
                   style={{ padding: '8px 4px', color: 'var(--text-tertiary)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                   onClick={() => addRow(cells.length)}
                 >
                   <Plus size={14} /> New
                 </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
