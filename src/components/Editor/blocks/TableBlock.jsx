import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { sanitize } from '../../../utils/sanitizer';
import { Plus, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Copy, Trash2, XCircle, Palette, Table, Columns, ChevronRight, ArrowLeft as BackIcon } from 'lucide-react';

// TableCell component to manage contentEditable cells cleanly
const TableCell = React.memo(({ value, onInput, onBlur, className, rowIndex, colIndex, ...props }) => {
  const ref = useRef(null);

  // Sync value from props to DOM, but only if it's different from the DOM's current HTML.
  // This prevents cursor/caret resetting during typing.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = (e) => {
    if (onInput) {
      onInput(e.currentTarget.innerHTML);
    }
  };

  const handleBlur = (e) => {
    if (onBlur) {
      onBlur(e.currentTarget.innerHTML);
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleBlur}
      {...props}
    />
  );
});

const NOTION_COLORS = [
  { name: 'default', label: 'Default', bg: 'transparent', preview: 'rgba(255, 255, 255, 0.1)' },
  { name: 'gray', label: 'Gray', bg: 'rgba(120, 120, 120, 0.12)', preview: 'rgba(120, 120, 120, 0.4)' },
  { name: 'brown', label: 'Brown', bg: 'rgba(140, 90, 60, 0.12)', preview: 'rgba(140, 90, 60, 0.4)' },
  { name: 'orange', label: 'Orange', bg: 'rgba(249, 115, 22, 0.12)', preview: 'rgba(249, 115, 22, 0.4)' },
  { name: 'yellow', label: 'Yellow', bg: 'rgba(250, 204, 21, 0.12)', preview: 'rgba(250, 204, 21, 0.4)' },
  { name: 'green', label: 'Green', bg: 'rgba(74, 222, 128, 0.12)', preview: 'rgba(74, 222, 128, 0.4)' },
  { name: 'blue', label: 'Blue', bg: 'rgba(96, 165, 250, 0.12)', preview: 'rgba(96, 165, 250, 0.4)' },
  { name: 'purple', label: 'Purple', bg: 'rgba(167, 139, 250, 0.12)', preview: 'rgba(167, 139, 250, 0.4)' },
  { name: 'pink', label: 'Pink', bg: 'rgba(244, 114, 182, 0.12)', preview: 'rgba(244, 114, 182, 0.4)' },
  { name: 'red', label: 'Red', bg: 'rgba(248, 113, 113, 0.12)', preview: 'rgba(248, 113, 113, 0.4)' },
];

export default function TableBlock({ block }) {
  const isMigrated = !block.properties.columns; 
  
  const [cells, setCells] = useState(isMigrated ? (block.properties.cells || [['', ''], ['', '']]) : [['', ''], ['', '']]);
  const [hasHeader, setHasHeader] = useState(isMigrated ? (block.properties.hasHeader || false) : false);
  const [hasHeaderCol, setHasHeaderCol] = useState(block.properties.hasHeaderCol || false);
  const [columnWidths, setColumnWidths] = useState(isMigrated ? (block.properties.columnWidths || [200, 200]) : [200, 200]);
  const [rowHeights, setRowHeights] = useState(isMigrated ? (block.properties.rowHeights || [40, 40]) : [40, 40]);
  const [rowColors, setRowColors] = useState(block.properties.rowColors || {});
  const [colColors, setColColors] = useState(block.properties.colColors || {});
  
  const [resizingCol, setResizingCol] = useState(null);
  const [resizingRow, setResizingRow] = useState(null);
  const resizerRef = useRef({ startX: 0, startY: 0, startSize: 0 });

  // Handle menus & selections
  const [colMenu, setColMenu] = useState(null); // { index, y, left }
  const [rowMenu, setRowMenu] = useState(null); // { index, y, left }
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [selectedColIndex, setSelectedColIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [colorMenu, setColorMenu] = useState(null); // 'row' | 'col'
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [hoveredColIndex, setHoveredColIndex] = useState(null);

  const engine = useEditorEngine();
  
  // Clean off the bad columns/rows schema if present
  useEffect(() => {
    if (!isMigrated || !block.properties.cells) {
      engine.updateBlock(block.id, { 
        properties: { 
          cells: [['', ''], ['', '']], 
          hasHeader: false,
          hasHeaderCol: false,
          columnWidths: [200, 200],
          rowHeights: [40, 40],
          rowColors: {},
          colColors: {}
        } 
      });
    }
  }, [block.id, isMigrated]);

const isCellsEqual = (arr1, arr2) => {
  if (!arr1 || !arr2) return false;
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i].length !== arr2[i].length) return false;
    for (let j = 0; j < arr1[i].length; j++) {
      if (arr1[i][j] !== arr2[i][j]) return false;
    }
  }
  return true;
};

const isArraysEqual = (arr1, arr2) => {
  if (!arr1 || !arr2) return false;
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
};

  useEffect(() => {
    if (block.properties.cells) {
      setCells(prev => isCellsEqual(prev, block.properties.cells) ? prev : block.properties.cells);
    }
    if (block.properties.columnWidths) {
      setColumnWidths(prev => isArraysEqual(prev, block.properties.columnWidths) ? prev : block.properties.columnWidths);
    }
    if (block.properties.rowHeights) {
      setRowHeights(prev => isArraysEqual(prev, block.properties.rowHeights) ? prev : block.properties.rowHeights);
    }
    if (block.properties.hasHeader !== undefined) setHasHeader(block.properties.hasHeader);
    if (block.properties.hasHeaderCol !== undefined) setHasHeaderCol(block.properties.hasHeaderCol);
    if (block.properties.rowColors) setRowColors(block.properties.rowColors);
    if (block.properties.colColors) setColColors(block.properties.colColors);
  }, [block.properties.cells, block.properties.columnWidths, block.properties.rowHeights, block.properties.hasHeader, block.properties.hasHeaderCol, block.properties.rowColors, block.properties.colColors]);

  const saveTimerRef = useRef(null);

  const cancelDebouncedSave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  };

  const debouncedSave = (newCells, newHeader = hasHeader, newHeaderCol = hasHeaderCol, newWidths = columnWidths, newHeights = rowHeights, newRowColors = rowColors, newColColors = colColors) => {
    cancelDebouncedSave();
    saveTimerRef.current = setTimeout(() => {
      const sanitizedCells = newCells.map(row => row.map(cell => sanitize(cell)));
      save(sanitizedCells, newHeader, newHeaderCol, newWidths, newHeights, newRowColors, newColColors);
    }, 500);
  };

  useEffect(() => {
    return () => {
      cancelDebouncedSave();
    };
  }, []);

  const save = (newCells, newHeader = hasHeader, newHeaderCol = hasHeaderCol, newWidths = columnWidths, newHeights = rowHeights, newRowColors = rowColors, newColColors = colColors) => {
    cancelDebouncedSave();
    engine.updateBlock(block.id, { 
      properties: { 
        cells: newCells,
        hasHeader: newHeader,
        hasHeaderCol: newHeaderCol,
        columnWidths: newWidths,
        rowHeights: newHeights,
        rowColors: newRowColors,
        colColors: newColColors
      } 
    });
  };

  const closeMenu = () => {
    setColMenu(null);
    setRowMenu(null);
    setSelectedRowIndex(null);
    setSelectedColIndex(null);
    setSearchQuery('');
    setColorMenu(null);
  };

  const handleCellInput = (rowIndex, colIndex, html) => {
    const newCells = [...cells];
    newCells[rowIndex] = [...newCells[rowIndex]];
    newCells[rowIndex][colIndex] = html;
    setCells(newCells);
    debouncedSave(newCells);
  };

  const handleCellBlur = (rowIndex, colIndex, html) => {
    cancelDebouncedSave();
    const sanitized = sanitize(html);
    const newCells = [...cells];
    newCells[rowIndex] = [...newCells[rowIndex]];
    newCells[rowIndex][colIndex] = sanitized;
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
    save(newCells, hasHeader, hasHeaderCol, columnWidths, newHeights);
  };

  const addColumn = () => {
    const newCells = cells.map(row => [...row, '']);
    const newWidths = [...columnWidths, 200];
    setCells(newCells);
    setColumnWidths(newWidths);
    save(newCells, hasHeader, hasHeaderCol, newWidths);
  };

  const insertColumn = (index, side) => {
    const targetIdx = side === 'left' ? index : index + 1;
    const newCells = cells.map(row => {
      const nextRow = [...row];
      nextRow.splice(targetIdx, 0, '');
      return nextRow;
    });
    const newWidths = [...columnWidths];
    newWidths.splice(targetIdx, 0, 200);

    const newColColors = {};
    Object.entries(colColors).forEach(([key, color]) => {
      const k = parseInt(key, 10);
      if (k >= targetIdx) {
        newColColors[k + 1] = color;
      } else {
        newColColors[k] = color;
      }
    });

    setCells(newCells);
    setColumnWidths(newWidths);
    setColColors(newColColors);
    save(newCells, hasHeader, hasHeaderCol, newWidths, rowHeights, rowColors, newColColors);
  };

  const clearColumn = (index) => {
    const newCells = cells.map(row => {
      const nextRow = [...row];
      nextRow[index] = '';
      return nextRow;
    });
    setCells(newCells);
    save(newCells);
  };

  const deleteColumn = (index) => {
    if (columnWidths.length <= 1) return;
    const newCells = cells.map(row => row.filter((_, i) => i !== index));
    const newWidths = columnWidths.filter((_, i) => i !== index);

    const newColColors = {};
    Object.entries(colColors).forEach(([key, color]) => {
      const k = parseInt(key, 10);
      if (k > index) {
        newColColors[k - 1] = color;
      } else if (k < index) {
        newColColors[k] = color;
      }
    });

    setCells(newCells);
    setColumnWidths(newWidths);
    setColColors(newColColors);
    save(newCells, hasHeader, hasHeaderCol, newWidths, rowHeights, rowColors, newColColors);
  };

  const insertRow = (index, position) => {
    const targetIdx = position === 'above' ? index : index + 1;
    const newCells = [...cells];
    newCells.splice(targetIdx, 0, new Array(cells[0].length).fill(''));
    const newHeights = [...rowHeights];
    newHeights.splice(targetIdx, 0, 40);

    const newRowColors = {};
    Object.entries(rowColors).forEach(([key, color]) => {
      const k = parseInt(key, 10);
      if (k >= targetIdx) {
        newRowColors[k + 1] = color;
      } else {
        newRowColors[k] = color;
      }
    });

    setCells(newCells);
    setRowHeights(newHeights);
    setRowColors(newRowColors);
    save(newCells, hasHeader, hasHeaderCol, columnWidths, newHeights, newRowColors, colColors);
  };

  const clearRow = (index) => {
    const newCells = [...cells];
    newCells[index] = new Array(cells[0].length).fill('');
    setCells(newCells);
    save(newCells);
  };

  const deleteRow = (index) => {
    if (cells.length <= 1) return;
    const newCells = cells.filter((_, i) => i !== index);
    const newHeights = rowHeights.filter((_, i) => i !== index);

    const newRowColors = {};
    Object.entries(rowColors).forEach(([key, color]) => {
      const k = parseInt(key, 10);
      if (k > index) {
        newRowColors[k - 1] = color;
      } else if (k < index) {
        newRowColors[k] = color;
      }
    });

    setCells(newCells);
    setRowHeights(newHeights);
    setRowColors(newRowColors);
    save(newCells, hasHeader, hasHeaderCol, columnWidths, newHeights, newRowColors, colColors);
  };

  const duplicateRow = (index) => {
    const newCells = [...cells];
    const copiedRow = [...cells[index]];
    newCells.splice(index + 1, 0, copiedRow);

    const newHeights = [...rowHeights];
    const copiedHeight = rowHeights[index] || 40;
    newHeights.splice(index + 1, 0, copiedHeight);

    const newRowColors = {};
    Object.entries(rowColors).forEach(([key, color]) => {
      const k = parseInt(key, 10);
      if (k > index) {
        newRowColors[k + 1] = color;
      } else {
        newRowColors[k] = color;
      }
    });
    if (rowColors[index]) {
      newRowColors[index + 1] = rowColors[index];
    }

    setCells(newCells);
    setRowHeights(newHeights);
    setRowColors(newRowColors);
    save(newCells, hasHeader, hasHeaderCol, columnWidths, newHeights, newRowColors, colColors);
  };

  const duplicateColumn = (index) => {
    const newCells = cells.map(row => {
      const nextRow = [...row];
      nextRow.splice(index + 1, 0, row[index]);
      return nextRow;
    });

    const newWidths = [...columnWidths];
    const copiedWidth = columnWidths[index] || 200;
    newWidths.splice(index + 1, 0, copiedWidth);

    const newColColors = {};
    Object.entries(colColors).forEach(([key, color]) => {
      const k = parseInt(key, 10);
      if (k > index) {
        newColColors[k + 1] = color;
      } else {
        newColColors[k] = color;
      }
    });
    if (colColors[index]) {
      newColColors[index + 1] = colColors[index];
    }

    setCells(newCells);
    setColumnWidths(newWidths);
    setColColors(newColColors);
    save(newCells, hasHeader, hasHeaderCol, newWidths, rowHeights, rowColors, newColColors);
  };

  const applyColor = (type, index, colorName) => {
    if (type === 'row') {
      const newRowColors = { ...rowColors, [index]: colorName };
      setRowColors(newRowColors);
      save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, newRowColors, colColors);
    } else {
      const newColColors = { ...colColors, [index]: colorName };
      setColColors(newColColors);
      save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, newColColors);
    }
    closeMenu();
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
        save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights);
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
  }, [resizingCol, resizingRow, columnWidths, rowHeights, cells, hasHeader, hasHeaderCol]);

  // Format updated date
  const formatUpdatedAt = () => {
    const date = new Date(block.updatedAt || Date.now());
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `Today at ${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  // Build filtered menu actions
  const getFilteredActions = (actions) => {
    return actions.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);

  return (
    <div className="notion-table-container">
      {/* Backdrop overlay to close context menus and selection */}
      {(colMenu || rowMenu) && (
        <div className="table-menu-backdrop" onClick={closeMenu} />
      )}

      <div className="notion-simple-table-wrapper">
        <div className="notion-table-scroll">
          <div style={{ display: 'flex', position: 'relative' }}>
            
            {/* Table layout */}
            <table className="notion-table" style={{ width: totalWidth || '100%' }}>
              <colgroup>
                {columnWidths.map((width, i) => (
                  <col key={i} style={{ width }} />
                ))}
              </colgroup>
              <tbody>
                {cells.map((row, rowIndex) => (
                  <tr key={rowIndex} className="notion-tr" style={{ height: rowHeights[rowIndex] || 'auto' }}>
                    {row.map((cell, colIndex) => {
                      const isHeaderRow = hasHeader && rowIndex === 0;
                      const isHeaderColumn = hasHeaderCol && colIndex === 0;
                      
                      const Tag = isHeaderRow ? 'th' : 'td';
                      
                      // Background color class resolving
                      const rColor = rowColors[rowIndex] || 'default';
                      const cColor = colColors[colIndex] || 'default';
                      const activeColor = cColor !== 'default' ? cColor : (rColor !== 'default' ? rColor : 'default');

                      // Selection border outline classes
                      const isRowSelected = selectedRowIndex === rowIndex;
                      const isColSelected = selectedColIndex === colIndex;

                      const cellClasses = [
                        'notion-td',
                        `cell-bg-${activeColor}`,
                        isHeaderRow ? 'is-header-row-cell' : '',
                        isHeaderColumn ? 'is-header-col-cell' : '',
                        isRowSelected ? 'is-row-selected' : '',
                        isColSelected ? 'is-col-selected' : '',
                        // Custom border mapping for contiguous selected box outline
                        isRowSelected && colIndex === 0 ? 'selected-left-edge' : '',
                        isRowSelected && colIndex === row.length - 1 ? 'selected-right-edge' : '',
                        isColSelected && rowIndex === 0 ? 'selected-top-edge' : '',
                        isColSelected && rowIndex === cells.length - 1 ? 'selected-bottom-edge' : '',
                      ].filter(Boolean).join(' ');

                      const showColPill = hoveredColIndex === colIndex || isColSelected;
                      const showRowPill = hoveredRowIndex === rowIndex || isRowSelected;

                      return (
                        <Tag 
                          key={colIndex} 
                          className={cellClasses}
                          onMouseEnter={() => {
                            setHoveredRowIndex(rowIndex);
                            setHoveredColIndex(colIndex);
                          }}
                          onMouseLeave={() => {
                            setHoveredRowIndex(null);
                            setHoveredColIndex(null);
                          }}
                        >
                          
                          {/* Column Selector Handle Pill (appears at the top of first cell in each col) */}
                          {rowIndex === 0 && (
                            <div className="col-handle-wrapper">
                              <div 
                                className={`col-handle-pill ${isColSelected ? 'is-selected' : ''} ${showColPill ? 'is-visible' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedColIndex(colIndex);
                                  setSelectedRowIndex(null);
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setColMenu({ index: colIndex, y: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX - 110 });
                                }}
                              >
                                <svg width="8" height="12" viewBox="0 0 8 12" className="grip-icon">
                                  <circle cx="2" cy="2" r="1" fill="currentColor" />
                                  <circle cx="2" cy="6" r="1" fill="currentColor" />
                                  <circle cx="2" cy="10" r="1" fill="currentColor" />
                                  <circle cx="6" cy="2" r="1" fill="currentColor" />
                                  <circle cx="6" cy="6" r="1" fill="currentColor" />
                                  <circle cx="6" cy="10" r="1" fill="currentColor" />
                                </svg>
                              </div>
                            </div>
                          )}

                          {/* Row Selector Handle Pill (appears at the left of first cell in each row) */}
                          {colIndex === 0 && (
                            <div className="row-handle-wrapper">
                              <div 
                                className={`row-handle-pill ${isRowSelected ? 'is-selected' : ''} ${showRowPill ? 'is-visible' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRowIndex(rowIndex);
                                  setSelectedColIndex(null);
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setRowMenu({ index: rowIndex, y: rect.top + window.scrollY + 10, left: rect.left + window.scrollX - 250 });
                                }}
                              >
                                <svg width="8" height="12" viewBox="0 0 8 12" className="grip-icon">
                                  <circle cx="2" cy="2" r="1" fill="currentColor" />
                                  <circle cx="2" cy="6" r="1" fill="currentColor" />
                                  <circle cx="2" cy="10" r="1" fill="currentColor" />
                                  <circle cx="6" cy="2" r="1" fill="currentColor" />
                                  <circle cx="6" cy="6" r="1" fill="currentColor" />
                                  <circle cx="6" cy="10" r="1" fill="currentColor" />
                                </svg>
                              </div>
                            </div>
                          )}

                          <TableCell
                            key={`cell-${rowIndex}-${colIndex}`}
                            className="table-cell-editable"
                            data-row={rowIndex}
                            data-col={colIndex}
                            value={cell}
                            onInput={(html) => handleCellInput(rowIndex, colIndex, html)}
                            onBlur={(html) => handleCellBlur(rowIndex, colIndex, html)}
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
              </tbody>
            </table>

            {/* Right hover-add bar */}
            <div 
              className="notion-table-right-bar" 
              onClick={addColumn}
              style={{ height: rowHeights.reduce((a, b) => a + b, 0) || 'auto' }}
            >
              <Plus size={14} />
              <div className="table-tooltip right-bar-tooltip">
                <div><strong>Click to add a new column</strong></div>
                <div style={{ opacity: 0.6, fontSize: '10px', marginTop: '2px' }}>Drag to add or remove columns</div>
              </div>
            </div>

          </div>

          {/* Bottom hover-add bar */}
          <div 
            className="notion-table-bottom-bar" 
            onClick={() => addRow(cells.length)}
            style={{ width: totalWidth || '100%' }}
          >
            <Plus size={14} />
            <div className="table-tooltip bottom-bar-tooltip">
              <div><strong>Click to add a new row</strong></div>
              <div style={{ opacity: 0.6, fontSize: '10px', marginTop: '2px' }}>Drag to add or remove rows</div>
            </div>
          </div>

        </div>
      </div>

      {/* Render Column Options Dropdown Menu inside Portal */}
      {colMenu && createPortal(
        <div 
          className="table-handle-menu"
          style={{
            position: 'absolute',
            top: colMenu.y,
            left: colMenu.left,
            zIndex: 9999
          }}
        >
          {colorMenu ? (
            // Color Submenu Panel
            <div className="color-menu-panel">
              <div className="color-menu-header" onClick={() => setColorMenu(null)}>
                <BackIcon size={14} style={{ marginRight: '6px' }} />
                <span>Color</span>
              </div>
              <div className="color-menu-list">
                {NOTION_COLORS.map(color => (
                  <div 
                    key={color.name} 
                    className="color-menu-item" 
                    onClick={() => applyColor('col', colMenu.index, color.name)}
                  >
                    <div className="color-preview-circle" style={{ background: color.preview }} />
                    <span>{color.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Main Column Menu
            <>
              <div className="menu-search-wrapper">
                <input 
                  type="text" 
                  className="menu-search-input" 
                  placeholder="Search actions..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="menu-options-list">
                {getFilteredActions([
                  { id: 'header_row', label: 'Header row', icon: Table, type: 'toggle', active: hasHeader, action: () => {
                    const next = !hasHeader;
                    setHasHeader(next);
                    save(cells, next, hasHeaderCol);
                  }},
                  { id: 'header_col', label: 'Header column', icon: Columns, type: 'toggle', active: hasHeaderCol, action: () => {
                    const next = !hasHeaderCol;
                    setHasHeaderCol(next);
                    save(cells, hasHeader, next);
                  }},
                  { id: 'color', label: 'Color', icon: Palette, type: 'submenu', action: () => setColorMenu('col') },
                  { id: 'insert_left', label: 'Insert left', icon: ArrowLeft, action: () => { insertColumn(colMenu.index, 'left'); closeMenu(); } },
                  { id: 'insert_right', label: 'Insert right', icon: ArrowRight, action: () => { insertColumn(colMenu.index, 'right'); closeMenu(); } },
                  { id: 'duplicate', label: 'Duplicate', icon: Copy, shortcut: 'Ctrl+D', action: () => { duplicateColumn(colMenu.index); closeMenu(); } },
                  { id: 'clear', label: 'Clear contents', icon: XCircle, action: () => { clearColumn(colMenu.index); closeMenu(); } },
                  { id: 'delete', label: 'Delete', icon: Trash2, danger: true, action: () => { deleteColumn(colMenu.index); closeMenu(); } }
                ]).map(opt => {
                  const Icon = opt.icon;
                  return (
                    <div 
                      key={opt.id} 
                      className={`table-menu-item ${opt.danger ? 'danger' : ''}`} 
                      onClick={opt.action}
                    >
                      <Icon size={14} style={{ marginRight: '8px', flexShrink: 0 }} />
                      <span style={{ flexGrow: 1 }}>{opt.label}</span>
                      {opt.type === 'toggle' && (
                        <div className={`table-menu-toggle-switch ${opt.active ? 'is-active' : ''}`}>
                          <div className="switch-knob" />
                        </div>
                      )}
                      {opt.type === 'submenu' && <ChevronRight size={12} style={{ opacity: 0.5 }} />}
                      {opt.shortcut && <span className="menu-item-shortcut">{opt.shortcut}</span>}
                    </div>
                  );
                })}
              </div>

              <div className="table-menu-footer">
                <div>Last edited by Divyanshu Singh</div>
                <div style={{ marginTop: '2px', opacity: 0.5 }}>{formatUpdatedAt()}</div>
              </div>
            </>
          )}
        </div>,
        document.body
      )}

      {/* Render Row Options Dropdown Menu inside Portal */}
      {rowMenu && createPortal(
        <div 
          className="table-handle-menu"
          style={{
            position: 'absolute',
            top: rowMenu.y,
            left: rowMenu.left,
            zIndex: 9999
          }}
        >
          {colorMenu ? (
            // Color Submenu Panel
            <div className="color-menu-panel">
              <div className="color-menu-header" onClick={() => setColorMenu(null)}>
                <BackIcon size={14} style={{ marginRight: '6px' }} />
                <span>Color</span>
              </div>
              <div className="color-menu-list">
                {NOTION_COLORS.map(color => (
                  <div 
                    key={color.name} 
                    className="color-menu-item" 
                    onClick={() => applyColor('row', rowMenu.index, color.name)}
                  >
                    <div className="color-preview-circle" style={{ background: color.preview }} />
                    <span>{color.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Main Row Menu
            <>
              <div className="menu-search-wrapper">
                <input 
                  type="text" 
                  className="menu-search-input" 
                  placeholder="Search actions..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="menu-options-list">
                {getFilteredActions([
                  { id: 'header_row', label: 'Header row', icon: Table, type: 'toggle', active: hasHeader, action: () => {
                    const next = !hasHeader;
                    setHasHeader(next);
                    save(cells, next, hasHeaderCol);
                  }},
                  { id: 'header_col', label: 'Header column', icon: Columns, type: 'toggle', active: hasHeaderCol, action: () => {
                    const next = !hasHeaderCol;
                    setHasHeaderCol(next);
                    save(cells, hasHeader, next);
                  }},
                  { id: 'color', label: 'Color', icon: Palette, type: 'submenu', action: () => setColorMenu('row') },
                  { id: 'insert_above', label: 'Insert above', icon: ArrowUp, action: () => { insertRow(rowMenu.index, 'above'); closeMenu(); } },
                  { id: 'insert_below', label: 'Insert below', icon: ArrowDown, action: () => { insertRow(rowMenu.index, 'below'); closeMenu(); } },
                  { id: 'duplicate', label: 'Duplicate', icon: Copy, shortcut: 'Ctrl+D', action: () => { duplicateRow(rowMenu.index); closeMenu(); } },
                  { id: 'clear', label: 'Clear contents', icon: XCircle, action: () => { clearRow(rowMenu.index); closeMenu(); } },
                  { id: 'delete', label: 'Delete', icon: Trash2, danger: true, action: () => { deleteRow(rowMenu.index); closeMenu(); } }
                ]).map(opt => {
                  const Icon = opt.icon;
                  return (
                    <div 
                      key={opt.id} 
                      className={`table-menu-item ${opt.danger ? 'danger' : ''}`} 
                      onClick={opt.action}
                    >
                      <Icon size={14} style={{ marginRight: '8px', flexShrink: 0 }} />
                      <span style={{ flexGrow: 1 }}>{opt.label}</span>
                      {opt.type === 'toggle' && (
                        <div className={`table-menu-toggle-switch ${opt.active ? 'is-active' : ''}`}>
                          <div className="switch-knob" />
                        </div>
                      )}
                      {opt.type === 'submenu' && <ChevronRight size={12} style={{ opacity: 0.5 }} />}
                      {opt.shortcut && <span className="menu-item-shortcut">{opt.shortcut}</span>}
                    </div>
                  );
                })}
              </div>

              <div className="table-menu-footer">
                <div>Last edited by Divyanshu Singh</div>
                <div style={{ marginTop: '2px', opacity: 0.5 }}>{formatUpdatedAt()}</div>
              </div>
            </>
          )}
        </div>,
        document.body
      )}

    </div>
  );
}
