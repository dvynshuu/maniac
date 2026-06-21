import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { sanitize } from '../../../utils/sanitizer';
import { Plus, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Copy, Trash2, XCircle, Palette, Table, Columns, ChevronRight, ArrowLeft as BackIcon, Calculator } from 'lucide-react';
import { evaluateFormula } from '../../../core/formulaEngine';
import { getPlainText } from '../../../utils/helpers';

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
  const [colTypes, setColTypes] = useState(block.properties.colTypes || {});
  const [colConfigs, setColConfigs] = useState(block.properties.colConfigs || {});
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  
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
          colColors: {},
          colTypes: {},
          colConfigs: {}
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
    if (block.properties.colTypes) setColTypes(block.properties.colTypes);
    if (block.properties.colConfigs) setColConfigs(block.properties.colConfigs);
  }, [block.properties.cells, block.properties.columnWidths, block.properties.rowHeights, block.properties.hasHeader, block.properties.hasHeaderCol, block.properties.rowColors, block.properties.colColors, block.properties.colTypes, block.properties.colConfigs]);

  const saveTimerRef = useRef(null);

  const cancelDebouncedSave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  };

  const debouncedSave = (newCells, newHeader = hasHeader, newHeaderCol = hasHeaderCol, newWidths = columnWidths, newHeights = rowHeights, newRowColors = rowColors, newColColors = colColors, newColTypes = colTypes, newColConfigs = colConfigs) => {
    cancelDebouncedSave();
    saveTimerRef.current = setTimeout(() => {
      const sanitizedCells = newCells.map(row => row.map(cell => sanitize(cell)));
      save(sanitizedCells, newHeader, newHeaderCol, newWidths, newHeights, newRowColors, newColColors, newColTypes, newColConfigs);
    }, 500);
  };

  useEffect(() => {
    return () => {
      cancelDebouncedSave();
    };
  }, []);

  const save = (newCells, newHeader = hasHeader, newHeaderCol = hasHeaderCol, newWidths = columnWidths, newHeights = rowHeights, newRowColors = rowColors, newColColors = colColors, newColTypes = colTypes, newColConfigs = colConfigs) => {
    cancelDebouncedSave();
    engine.updateBlock(block.id, { 
      properties: { 
        cells: newCells,
        hasHeader: newHeader,
        hasHeaderCol: newHeaderCol,
        columnWidths: newWidths,
        rowHeights: newHeights,
        rowColors: newRowColors,
        colColors: newColColors,
        colTypes: newColTypes,
        colConfigs: newColConfigs
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
    setTypeMenuOpen(false);
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

    const newColTypes = {};
    Object.entries(colTypes).forEach(([key, val]) => {
      const k = parseInt(key, 10);
      if (k >= targetIdx) {
        newColTypes[k + 1] = val;
      } else {
        newColTypes[k] = val;
      }
    });

    const newColConfigs = {};
    Object.entries(colConfigs).forEach(([key, val]) => {
      const k = parseInt(key, 10);
      if (k >= targetIdx) {
        newColConfigs[k + 1] = val;
      } else {
        newColConfigs[k] = val;
      }
    });

    setCells(newCells);
    setColumnWidths(newWidths);
    setColColors(newColColors);
    setColTypes(newColTypes);
    setColConfigs(newColConfigs);
    save(newCells, hasHeader, hasHeaderCol, newWidths, rowHeights, rowColors, newColColors, newColTypes, newColConfigs);
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

    const newColTypes = {};
    Object.entries(colTypes).forEach(([key, val]) => {
      const k = parseInt(key, 10);
      if (k > index) {
        newColTypes[k - 1] = val;
      } else if (k < index) {
        newColTypes[k] = val;
      }
    });

    const newColConfigs = {};
    Object.entries(colConfigs).forEach(([key, val]) => {
      const k = parseInt(key, 10);
      if (k > index) {
        newColConfigs[k - 1] = val;
      } else if (k < index) {
        newColConfigs[k] = val;
      }
    });

    setCells(newCells);
    setColumnWidths(newWidths);
    setColColors(newColColors);
    setColTypes(newColTypes);
    setColConfigs(newColConfigs);
    save(newCells, hasHeader, hasHeaderCol, newWidths, rowHeights, rowColors, newColColors, newColTypes, newColConfigs);
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

    const newColTypes = {};
    Object.entries(colTypes).forEach(([key, val]) => {
      const k = parseInt(key, 10);
      if (k > index) {
        newColTypes[k + 1] = val;
      } else {
        newColTypes[k] = val;
      }
    });
    if (colTypes[index]) {
      newColTypes[index + 1] = colTypes[index];
    }

    const newColConfigs = {};
    Object.entries(colConfigs).forEach(([key, val]) => {
      const k = parseInt(key, 10);
      if (k > index) {
        newColConfigs[k + 1] = val;
      } else {
        newColConfigs[k] = val;
      }
    });
    if (colConfigs[index]) {
      newColConfigs[index + 1] = JSON.parse(JSON.stringify(colConfigs[index]));
    }

    setCells(newCells);
    setColumnWidths(newWidths);
    setColColors(newColColors);
    setColTypes(newColTypes);
    setColConfigs(newColConfigs);
    save(newCells, hasHeader, hasHeaderCol, newWidths, rowHeights, rowColors, newColColors, newColTypes, newColConfigs);
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

  const setColumnType = (colIndex, newType) => {
    const nextColTypes = { ...colTypes, [colIndex]: newType };
    let nextColConfigs = { ...colConfigs };
    if (newType === 'formula') {
      nextColConfigs[colIndex] = {
        formula: '',
        numberFormat: 'number',
        decimalPlaces: 0,
        showAs: 'number',
        progressColor: 'blue'
      };
    } else {
      delete nextColConfigs[colIndex];
    }
    setColTypes(nextColTypes);
    setColConfigs(nextColConfigs);
    save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, nextColTypes, nextColConfigs);
    setTypeMenuOpen(false);
  };

  const getColumnLetter = (index) => {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  const resolveTableValue = (rowObj, prop, currentSchema, visited = new Set()) => {
    const cIndex = parseInt(prop.id, 10);
    const colType = colTypes[cIndex] || 'text';
    if (colType === 'formula') {
      const formulaStr = colConfigs[cIndex]?.formula;
      if (!formulaStr) return '';
      if (visited.has(prop.id)) {
        return '#CYCLE!';
      }
      visited.add(prop.id);
      const result = evaluateFormula(
        formulaStr,
        rowObj,
        currentSchema,
        rowObj.values,
        resolveTableValue,
        visited
      );
      visited.delete(prop.id);
      return result;
    }
    const cellHtml = rowObj.values[prop.id] || '';
    return getPlainText(cellHtml).trim();
  };

  const renderFormulaValue = (rawValue, colIndex) => {
    const config = colConfigs[colIndex] || {};
    const numberFormat = config.numberFormat || 'number';
    const decimalPlaces = config.decimalPlaces !== undefined ? config.decimalPlaces : 0;
    const showAs = config.showAs || 'number';
    const progressColor = config.progressColor || 'blue';
    const showNumber = config.showNumber !== false;

    const num = parseFloat(rawValue);
    if (isNaN(num)) {
      if (rawValue === '#CYCLE!') {
        return <span className="font-mono text-xs" style={{ color: 'var(--text-error)' }}>{rawValue}</span>;
      }
      if (typeof rawValue === 'string' && rawValue.startsWith('#ERROR:')) {
        return <span className="font-mono text-xs" style={{ color: 'var(--text-error)' }} title={rawValue}>#ERROR!</span>;
      }
      return (
        <div className="table-cell-formula text-xs font-mono italic" style={{ color: 'var(--text-secondary)' }}>
          {rawValue !== undefined && rawValue !== null && rawValue !== '' ? String(rawValue) : 'Empty'}
        </div>
      );
    }

    const maxValue = config.maxValue !== undefined 
      ? parseFloat(config.maxValue) 
      : (numberFormat === 'percent' ? 1 : 100);

    let percentage = 0;
    if (maxValue > 0) {
      percentage = Math.min(100, Math.max(0, (num / maxValue) * 100));
    }

    let displayValue = num;
    let prefix = '';
    let suffix = '';

    if (numberFormat === 'percent') {
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

    const colorsMap = {
      blue: 'var(--accent-primary)',
      green: 'var(--success)',
      purple: '#a78bfa',
      orange: 'var(--warning)',
      red: '#f87171'
    };
    const color = colorsMap[progressColor] || 'var(--accent-primary)';

    if (showAs === 'bar') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', minWidth: '85px', padding: '2px 0' }}>
          <div 
            style={{ 
              height: '6px', 
              background: 'rgba(255, 255, 255, 0.08)', 
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
            <circle
              cx="8"
              cy="8"
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
            />
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

    return (
      <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)', width: '100%', fontSize: '12px', textAlign: 'right' }}>
        {label}
      </div>
    );
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

                          {colTypes[colIndex] === 'formula' && !isHeaderRow ? (
                            <div className="table-cell-readonly font-mono" style={{ padding: '8px', minHeight: '34px', display: 'flex', alignItems: 'center', width: '100%' }}>
                              {(() => {
                                const rowObj = {
                                  id: String(rowIndex),
                                  values: {}
                                };
                                row.forEach((val, c) => {
                                  rowObj.values[String(c)] = val;
                                });

                                const mockSchema = [];
                                columnWidths.forEach((_, c) => {
                                  const letter = getColumnLetter(c);
                                  const headerText = (hasHeader && cells[0]?.[c]) ? getPlainText(cells[0][c]).trim() : '';
                                  const colType = colTypes[c] || 'text';
                                  const colConfig = colConfigs[c] || {};
                                  
                                  mockSchema.push({
                                    id: String(c),
                                    name: headerText || letter,
                                    type: colType,
                                    config: colConfig
                                  });

                                  if (headerText && headerText.toLowerCase() !== letter.toLowerCase()) {
                                    mockSchema.push({
                                      id: String(c),
                                      name: letter,
                                      type: colType,
                                      config: colConfig
                                    });
                                  }
                                });

                                const currentProperty = mockSchema.find(p => p.id === String(colIndex));
                                const val = resolveTableValue(rowObj, currentProperty, mockSchema);
                                return renderFormulaValue(val, colIndex);
                              })()}
                            </div>
                          ) : (
                            <TableCell
                              key={`cell-${rowIndex}-${colIndex}`}
                              className="table-cell-editable"
                              data-row={rowIndex}
                              data-col={colIndex}
                              value={cell}
                              onInput={(html) => handleCellInput(rowIndex, colIndex, html)}
                              onBlur={(html) => handleCellBlur(rowIndex, colIndex, html)}
                            />
                          )}

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
          ) : typeMenuOpen ? (
            // Type Submenu Panel
            <div className="color-menu-panel">
              <div className="color-menu-header" onClick={() => setTypeMenuOpen(false)}>
                <BackIcon size={14} style={{ marginRight: '6px' }} />
                <span>Type</span>
              </div>
              <div className="color-menu-list">
                <div 
                  className="color-menu-item" 
                  onClick={() => setColumnType(colMenu.index, 'text')}
                  style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px' }}
                >
                  <Columns size={14} style={{ marginRight: '8px', opacity: 0.7 }} />
                  <span style={{ fontSize: '13px' }}>Text</span>
                </div>
                <div 
                  className="color-menu-item" 
                  onClick={() => setColumnType(colMenu.index, 'formula')}
                  style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px' }}
                >
                  <Calculator size={14} style={{ marginRight: '8px', opacity: 0.7 }} />
                  <span style={{ fontSize: '13px' }}>Formula</span>
                </div>
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

              {/* Type Switch Button */}
              <button 
                className="table-menu-item" 
                onClick={() => setTypeMenuOpen(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'inherit',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: '4px'
                }}
              >
                <Calculator size={14} style={{ marginRight: '8px' }} />
                <span style={{ flexGrow: 1, fontSize: '13px' }}>Type</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.6 }}>
                  <span style={{ fontSize: '11px' }}>{colTypes[colMenu.index] === 'formula' ? 'Formula' : 'Text'}</span>
                  <ChevronRight size={14} />
                </div>
              </button>

              <div className="table-menu-divider" style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />
              
              {/* Formula configs rendering inside menu if column is formula */}
              {colTypes[colMenu.index] === 'formula' && (
                <>
                  {/* Format & Visuals */}
                  <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Format & Visuals</div>
                    
                    {/* Number Format */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Number format</span>
                      <select
                        value={colConfigs[colMenu.index]?.numberFormat || 'number'}
                        onChange={(e) => {
                          const fmt = e.target.value;
                          const defaultMax = fmt === 'percent' ? 1 : 100;
                          const nextConfigs = {
                            ...colConfigs,
                            [colMenu.index]: {
                              ...colConfigs[colMenu.index],
                              numberFormat: fmt,
                              maxValue: colConfigs[colMenu.index]?.maxValue !== undefined ? colConfigs[colMenu.index].maxValue : defaultMax
                            }
                          };
                          setColConfigs(nextConfigs);
                          save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, nextConfigs);
                        }}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          padding: '2px 4px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="number">Number</option>
                        <option value="percent">Percent</option>
                        <option value="usd">US Dollar ($)</option>
                        <option value="eur">Euro (€)</option>
                        <option value="gbp">Pound (£)</option>
                      </select>
                    </div>

                    {/* Decimal Places */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Decimal places</span>
                      <select
                        value={colConfigs[colMenu.index]?.decimalPlaces !== undefined ? colConfigs[colMenu.index].decimalPlaces : 0}
                        onChange={(e) => {
                          const nextConfigs = {
                            ...colConfigs,
                            [colMenu.index]: {
                              ...colConfigs[colMenu.index],
                              decimalPlaces: Number(e.target.value)
                            }
                          };
                          setColConfigs(nextConfigs);
                          save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, nextConfigs);
                        }}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          padding: '2px 4px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {[0, 1, 2, 3, 4].map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    {/* Show as */}
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>Show as</div>
                      <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-subtle)', padding: '2px', gap: '2px' }}>
                        {[
                          { value: 'number', label: 'Number' },
                          { value: 'bar', label: 'Bar' },
                          { value: 'ring', label: 'Ring' }
                        ].map(opt => {
                          const active = (colConfigs[colMenu.index]?.showAs || 'number') === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => {
                                const nextConfigs = {
                                  ...colConfigs,
                                  [colMenu.index]: {
                                    ...colConfigs[colMenu.index],
                                    showAs: opt.value
                                  }
                                };
                                setColConfigs(nextConfigs);
                                save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, nextConfigs);
                              }}
                              style={{
                                flex: 1,
                                background: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                fontSize: '11px',
                                fontWeight: active ? 'bold' : 'normal',
                                padding: '4px 0',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                textAlign: 'center'
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Color selection if Bar or Ring */}
                    {((colConfigs[colMenu.index]?.showAs || 'number') !== 'number') && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Color</span>
                        <select
                          value={colConfigs[colMenu.index]?.progressColor || 'blue'}
                          onChange={(e) => {
                            const nextConfigs = {
                              ...colConfigs,
                              [colMenu.index]: {
                                ...colConfigs[colMenu.index],
                                progressColor: e.target.value
                              }
                            };
                            setColConfigs(nextConfigs);
                            save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, nextConfigs);
                          }}
                          style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)',
                            fontSize: '11px',
                            padding: '2px 4px',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="blue">Blue</option>
                          <option value="green">Green</option>
                          <option value="purple">Purple</option>
                          <option value="orange">Orange</option>
                          <option value="red">Red</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="table-menu-divider" style={{ borderTop: '1px dashed var(--border-subtle)', margin: '4px 0' }} />

                  {/* Formula Expression */}
                  <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      Formula Expression
                    </label>
                    <textarea
                      placeholder="e.g. prop('Price') * prop('Quantity')"
                      value={colConfigs[colMenu.index]?.formula || ''}
                      onChange={(e) => {
                        const nextConfigs = {
                          ...colConfigs,
                          [colMenu.index]: {
                            ...colConfigs[colMenu.index],
                            formula: e.target.value
                          }
                        };
                        setColConfigs(nextConfigs);
                        save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, nextConfigs);
                      }}
                      id="formula-textarea"
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        padding: '4px 6px',
                        fontFamily: 'monospace',
                        resize: 'vertical',
                        outline: 'none'
                      }}
                    />

                    {/* Click to Insert */}
                    <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Click to insert:</span>
                      
                      {/* Column list */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '80px', overflowY: 'auto', marginBottom: '6px' }}>
                        {columnWidths.map((_, c) => {
                          if (c === colMenu.index) return null;
                          const letter = getColumnLetter(c);
                          const headerText = (hasHeader && cells[0]?.[c]) ? getPlainText(cells[0][c]).trim() : '';
                          const insertName = headerText || letter;
                          return (
                            <button
                              key={c}
                              onClick={() => {
                                const txtArea = document.getElementById('formula-textarea');
                                if (txtArea) {
                                  const val = colConfigs[colMenu.index]?.formula || '';
                                  const start = txtArea.selectionStart;
                                  const end = txtArea.selectionEnd;
                                  const insertStr = `prop("${insertName}")`;
                                  const nextFormula = val.substring(0, start) + insertStr + val.substring(end);
                                  
                                  const nextConfigs = {
                                    ...colConfigs,
                                    [colMenu.index]: {
                                      ...colConfigs[colMenu.index],
                                      formula: nextFormula
                                    }
                                  };
                                  setColConfigs(nextConfigs);
                                  save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, nextConfigs);

                                  setTimeout(() => {
                                    txtArea.focus();
                                    txtArea.selectionStart = txtArea.selectionEnd = start + insertStr.length;
                                  }, 50);
                                }
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '1px 6px',
                                fontSize: '10px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer'
                              }}
                            >
                              {insertName}
                            </button>
                          );
                        })}
                      </div>

                      {/* Helper functions */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                        {[
                          { label: 'concat()', code: 'concat(a, b)' },
                          { label: 'if()', code: 'if(cond, t, f)' },
                          { label: 'lower()', code: 'lower(text)' },
                          { label: 'upper()', code: 'upper(text)' },
                          { label: 'contains()', code: 'contains(text, word)' },
                          { label: 'dateAdd()', code: 'dateAdd(date, 5, "days")' },
                          { label: 'length()', code: 'length(text)' },
                          { label: 'add()', code: 'add(a, b)' },
                          { label: 'subtract()', code: 'subtract(a, b)' }
                        ].map(fn => (
                          <button
                            key={fn.label}
                            onClick={() => {
                              const txtArea = document.getElementById('formula-textarea');
                              if (txtArea) {
                                const val = colConfigs[colMenu.index]?.formula || '';
                                const start = txtArea.selectionStart;
                                const end = txtArea.selectionEnd;
                                const insertStr = fn.code;
                                const nextFormula = val.substring(0, start) + insertStr + val.substring(end);
                                
                                const nextConfigs = {
                                  ...colConfigs,
                                  [colMenu.index]: {
                                    ...colConfigs[colMenu.index],
                                    formula: nextFormula
                                  }
                                };
                                setColConfigs(nextConfigs);
                                save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, nextConfigs);

                                setTimeout(() => {
                                  txtArea.focus();
                                  txtArea.selectionStart = txtArea.selectionEnd = start + insertStr.length;
                                }, 50);
                              }
                            }}
                            style={{
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid var(--border-default)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '1px 5px',
                              fontSize: '10px',
                              color: 'var(--text-primary)',
                              cursor: 'pointer'
                            }}
                          >
                            {fn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="table-menu-divider" style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />
                </>
              )}

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
                      style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px' }}
                    >
                      <Icon size={14} style={{ marginRight: '8px', flexShrink: 0 }} />
                      <span style={{ flexGrow: 1, fontSize: '13px' }}>{opt.label}</span>
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
