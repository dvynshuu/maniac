import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEditorEngine } from '../../../hooks/useEditorEngine';
import { sanitize } from '../../../utils/sanitizer';
import { Plus, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Copy, Trash2, XCircle, Palette, Table, Columns, ChevronRight, ArrowLeft as BackIcon, Calculator, Download, Calendar, CheckSquare, Tag } from 'lucide-react';
import { evaluateFormula } from '../../../core/formulaEngine';
import { getPlainText, createId } from '../../../utils/helpers';

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

// Selector for Column calculations in Summary row
const SummaryCellSelector = ({ colIndex, config, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const options = [
    { value: 'none', label: 'None' },
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'max', label: 'Max' },
    { value: 'min', label: 'Min' }
  ];

  const currentLabel = options.find(o => o.value === config)?.label || 'Calculate';

  return (
    <div ref={containerRef} className="summary-cell-selector-container" style={{ position: 'relative', display: 'block', width: '100%', height: '100%' }}>
      <div 
        onClick={() => setOpen(!open)}
        className="summary-cell-trigger"
        style={{
          cursor: 'pointer',
          padding: '8px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '4px',
          color: config === 'none' ? 'var(--text-tertiary)' : 'var(--text-secondary)',
          minHeight: '32px',
          width: '100%',
          boxSizing: 'border-box',
          userSelect: 'none'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {config === 'none' ? 'Calculate' : `${currentLabel}: ${value}`}
        </span>
        <span style={{ fontSize: '9px', opacity: 0.5, flexShrink: 0 }}>▼</span>
      </div>

      {open && (
        <div 
          className="summary-dropdown-menu"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            boxShadow: 'var(--shadow-md)',
            padding: '4px',
            zIndex: 100,
            minWidth: '110px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            marginBottom: '4px'
          }}
        >
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                padding: '6px 8px',
                fontSize: '12px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: config === opt.value ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: config === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = config === opt.value ? 'rgba(255, 255, 255, 0.08)' : 'transparent'}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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

const SELECT_TAG_COLORS = [
  { name: 'gray', bg: 'rgba(120, 120, 120, 0.18)', text: '#9ca3af' },
  { name: 'brown', bg: 'rgba(140, 90, 60, 0.18)', text: '#ca8a04' },
  { name: 'orange', bg: 'rgba(249, 115, 22, 0.18)', text: '#fb923c' },
  { name: 'yellow', bg: 'rgba(250, 204, 21, 0.18)', text: '#facc15' },
  { name: 'green', bg: 'rgba(74, 222, 128, 0.18)', text: '#4ade80' },
  { name: 'blue', bg: 'rgba(96, 165, 250, 0.18)', text: '#60a5fa' },
  { name: 'purple', bg: 'rgba(167, 139, 250, 0.18)', text: '#c084fc' },
  { name: 'pink', bg: 'rgba(244, 114, 182, 0.18)', text: '#f472b6' },
  { name: 'red', bg: 'rgba(248, 113, 113, 0.18)', text: '#f87171' }
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
  const [hasSummaryRow, setHasSummaryRow] = useState(block.properties.hasSummaryRow || false);
  const [summaryRowConfigs, setSummaryRowConfigs] = useState(block.properties.summaryRowConfigs || {});
  const [isFitToPage, setIsFitToPage] = useState(block.properties.isFitToPage || false);
  
  const [selectMenuCell, setSelectMenuCell] = useState(null); // { row, col, x, y, width }
  const [selectSearchQuery, setSelectSearchQuery] = useState('');
  const [editingDateCell, setEditingDateCell] = useState(null); // { row, col }
  
  // Drag and Drop reordering states
  const [draggedItem, setDraggedItem] = useState(null); // { type: 'row' | 'col', index: number }
  const [dragOverIndex, setDragOverIndex] = useState(null); // number
  const [dragOverSide, setDragOverSide] = useState(null); // 'left' | 'right' | 'top' | 'bottom'
  
  // Keyboard navigation smart focus
  const [pendingFocus, setPendingFocus] = useState(null); // { row: number, col: number }

  // Range selection states
  const [selectionStart, setSelectionStart] = useState(null); // { row: number, col: number }
  const [selectionEnd, setSelectionEnd] = useState(null); // { row: number, col: number }
  const [isSelectingRange, setIsSelectingRange] = useState(false);

  // Formula autocomplete states
  const [formulaSearch, setFormulaSearch] = useState('');
  const [formulaHelperTab, setFormulaHelperTab] = useState('functions'); // 'functions' | 'properties'
  
  
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
    if (block.properties.hasSummaryRow !== undefined) setHasSummaryRow(block.properties.hasSummaryRow);
    if (block.properties.summaryRowConfigs) setSummaryRowConfigs(block.properties.summaryRowConfigs);
    if (block.properties.isFitToPage !== undefined) setIsFitToPage(block.properties.isFitToPage);
  }, [block.properties.cells, block.properties.columnWidths, block.properties.rowHeights, block.properties.hasHeader, block.properties.hasHeaderCol, block.properties.rowColors, block.properties.colColors, block.properties.colTypes, block.properties.colConfigs, block.properties.hasSummaryRow, block.properties.summaryRowConfigs, block.properties.isFitToPage]);

  // Handle pending focus on cell updates
  useEffect(() => {
    if (pendingFocus) {
      const { row, col } = pendingFocus;
      const timer = setTimeout(() => {
        const focused = focusCell(row, col);
        if (focused) {
          setPendingFocus(null);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [cells, pendingFocus]);

  const saveTimerRef = useRef(null);

  const cancelDebouncedSave = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  };

  const debouncedSave = (newCells, newHeader = hasHeader, newHeaderCol = hasHeaderCol, newWidths = columnWidths, newHeights = rowHeights, newRowColors = rowColors, newColColors = colColors, newColTypes = colTypes, newColConfigs = colConfigs, newHasSummary = hasSummaryRow, newSummaryConfigs = summaryRowConfigs, newFitToPage = isFitToPage) => {
    cancelDebouncedSave();
    saveTimerRef.current = setTimeout(() => {
      const sanitizedCells = newCells.map(row => row.map(cell => sanitize(cell)));
      save(sanitizedCells, newHeader, newHeaderCol, newWidths, newHeights, newRowColors, newColColors, newColTypes, newColConfigs, newHasSummary, newSummaryConfigs, newFitToPage);
    }, 500);
  };

  useEffect(() => {
    return () => {
      cancelDebouncedSave();
    };
  }, []);

  const save = (newCells, newHeader = hasHeader, newHeaderCol = hasHeaderCol, newWidths = columnWidths, newHeights = rowHeights, newRowColors = rowColors, newColColors = colColors, newColTypes = colTypes, newColConfigs = colConfigs, newHasSummary = hasSummaryRow, newSummaryConfigs = summaryRowConfigs, newFitToPage = isFitToPage) => {
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
        colConfigs: newColConfigs,
        hasSummaryRow: newHasSummary,
        summaryRowConfigs: newSummaryConfigs,
        isFitToPage: newFitToPage
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
    
    // Auto-format cell value if numberFormat is configured for this column
    let val = sanitized;
    const config = colConfigs[colIndex] || {};
    if (config.numberFormat) {
      const text = getPlainText(sanitized).trim();
      if (isNumericValue(text)) {
        const num = parseFloat(text.replace(/[$,€£%]/g, '').replace(/,/g, ''));
        val = formatNumberValue(num, config.numberFormat, config.decimalPlaces !== undefined ? config.decimalPlaces : 0);
      }
    }
    
    newCells[rowIndex][colIndex] = val;
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

  // --- Advanced Range Selection & Copy-Paste ---

  const handleCellMouseDown = (e, r, c) => {
    if (e.button !== 0) return;
    
    const isEditMode = document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true';
    const clickedActive = document.activeElement === e.target;
    
    if (isEditMode && clickedActive) {
      return;
    }
    
    closeMenu();
    
    setSelectionStart({ row: r, col: c });
    setSelectionEnd({ row: r, col: c });
    setIsSelectingRange(true);
  };

  const handleCellMouseEnterRange = (e, r, c) => {
    if (!isSelectingRange || !selectionStart) return;
    setSelectionEnd({ row: r, col: c });
  };

  const handleGlobalMouseUp = useCallback(() => {
    setIsSelectingRange(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseUp]);

  const clearSelection = useCallback(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
  }, []);

  const isCellInRange = (r, c) => {
    if (!selectionStart || !selectionEnd) return false;
    const minR = Math.min(selectionStart.row, selectionEnd.row);
    const maxR = Math.max(selectionStart.row, selectionEnd.row);
    const minC = Math.min(selectionStart.col, selectionEnd.col);
    const maxC = Math.max(selectionStart.col, selectionEnd.col);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const getRangeBorderClass = (r, c) => {
    if (!selectionStart || !selectionEnd) return '';
    const minR = Math.min(selectionStart.row, selectionEnd.row);
    const maxR = Math.max(selectionStart.row, selectionEnd.row);
    const minC = Math.min(selectionStart.col, selectionEnd.col);
    const maxC = Math.max(selectionStart.col, selectionEnd.col);

    if (r < minR || r > maxR || c < minC || c > maxC) return '';

    const classes = [];
    if (r === minR) classes.push('range-selected-top');
    if (r === maxR) classes.push('range-selected-bottom');
    if (c === minC) classes.push('range-selected-left');
    if (c === maxC) classes.push('range-selected-right');
    return classes.join(' ');
  };

  const handleTableKeyDown = useCallback((e) => {
    if (!selectionStart || !selectionEnd) return;
    
    const active = document.activeElement;
    const isEditing = active && active.getAttribute('contenteditable') === 'true';
    if (isEditing) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      
      const minR = Math.min(selectionStart.row, selectionEnd.row);
      const maxR = Math.max(selectionStart.row, selectionEnd.row);
      const minC = Math.min(selectionStart.col, selectionEnd.col);
      const maxC = Math.max(selectionStart.col, selectionEnd.col);

      const newCells = cells.map((row, r) => {
        if (r >= minR && r <= maxR) {
          return row.map((cell, c) => {
            if (c >= minC && c <= maxC) {
              return '';
            }
            return cell;
          });
        }
        return row;
      });
      setCells(newCells);
      save(newCells);
    } else if (e.key === 'Escape') {
      clearSelection();
    }
  }, [selectionStart, selectionEnd, cells]);

  useEffect(() => {
    window.addEventListener('keydown', handleTableKeyDown);
    return () => {
      window.removeEventListener('keydown', handleTableKeyDown);
    };
  }, [handleTableKeyDown]);

  const handleRangeCopy = useCallback((e) => {
    if (!selectionStart || !selectionEnd) return;
    const active = document.activeElement;
    const isEditing = active && active.getAttribute('contenteditable') === 'true';
    if (isEditing) return;

    e.preventDefault();

    const minR = Math.min(selectionStart.row, selectionEnd.row);
    const maxR = Math.max(selectionStart.row, selectionEnd.row);
    const minC = Math.min(selectionStart.col, selectionEnd.col);
    const maxC = Math.max(selectionStart.col, selectionEnd.col);

    const rowsText = [];
    for (let r = minR; r <= maxR; r++) {
      const colText = [];
      for (let c = minC; c <= maxC; c++) {
        colText.push(getPlainText(cells[r]?.[c] || ''));
      }
      rowsText.push(colText.join('\t'));
    }
    const clipboardText = rowsText.join('\n');
    e.clipboardData.setData('text/plain', clipboardText);
  }, [selectionStart, selectionEnd, cells]);

  useEffect(() => {
    const handleCopy = (e) => handleRangeCopy(e);
    window.addEventListener('copy', handleCopy);
    return () => {
      window.removeEventListener('copy', handleCopy);
    };
  }, [handleRangeCopy]);

  const parseClipboardTable = (text) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
      return null;
    }

    const isMarkdown = lines.some(line => line.includes('|')) && 
                       lines.some(line => /^[|:\s-]+$/.test(line.replace(/[^|:\s-]/g, '')) && line.includes('-'));

    if (isMarkdown) {
      const parsedRows = [];
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed === '') return;
        if (/^[|:\s-]+$/.test(trimmed.replace(/[^|:\s-]/g, '')) && trimmed.includes('-')) {
          return;
        }
        let cellsInRow = trimmed.split('|').map(c => c.trim());
        if (trimmed.startsWith('|')) {
          cellsInRow.shift();
        }
        if (trimmed.endsWith('|')) {
          cellsInRow.pop();
        }
        parsedRows.push(cellsInRow);
      });
      return parsedRows;
    }

    const isTSV = lines.some(line => line.includes('\t'));
    if (isTSV) {
      return lines.map(line => line.split('\t'));
    }

    return lines.map(line => line.split(','));
  };

  const handleCellPaste = (e, rowIndex, colIndex) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;

    const parsedGrid = parseClipboardTable(text);
    if (!parsedGrid || parsedGrid.length === 0) return;

    const isMultiCellPaste = parsedGrid.length > 1 || parsedGrid[0].length > 1;
    if (isMultiCellPaste) {
      e.preventDefault();
      
      const parsedRows = parsedGrid.length;
      const parsedCols = Math.max(...parsedGrid.map(r => r.length));

      let newCells = cells.map(row => [...row]);
      let newWidths = [...columnWidths];
      let newHeights = [...rowHeights];

      const targetRowCount = rowIndex + parsedRows;
      const targetColCount = colIndex + parsedCols;

      if (targetRowCount > newCells.length) {
        const rowsToAdd = targetRowCount - newCells.length;
        for (let i = 0; i < rowsToAdd; i++) {
          newCells.push(new Array(newCells[0].length).fill(''));
          newHeights.push(40);
        }
      }

      if (targetColCount > newCells[0].length) {
        const colsToAdd = targetColCount - newCells[0].length;
        newCells = newCells.map(row => [...row, ...new Array(colsToAdd).fill('')]);
        for (let i = 0; i < colsToAdd; i++) {
          newWidths.push(200);
        }
      }

      for (let r = 0; r < parsedRows; r++) {
        for (let c = 0; c < parsedGrid[r].length; c++) {
          newCells[rowIndex + r][colIndex + c] = sanitize(parsedGrid[r][c]);
        }
      }

      setCells(newCells);
      setColumnWidths(newWidths);
      setRowHeights(newHeights);
      save(newCells, hasHeader, hasHeaderCol, newWidths, newHeights);
    }
  };

  const exportToCSV = () => {
    const csvContent = [];
    cells.forEach(row => {
      const rowCleaned = row.map(cell => {
        const plainText = getPlainText(cell).replace(/"/g, '""');
        return `"${plainText}"`;
      });
      csvContent.push(rowCleaned.join(','));
    });
    
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `table_${block.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    closeMenu();
  };

  const convertToDatabase = async () => {
    const colCount = cells[0]?.length || 0;
    const schema = columnWidths.map((width, colIdx) => {
      let headerText = '';
      if (hasHeader && cells[0]?.[colIdx]) {
        headerText = getPlainText(cells[0][colIdx]).trim();
      }
      const propId = `prop_${colIdx}_${createId()}`;
      return {
        id: propId,
        name: headerText || `Column ${colIdx + 1}`,
        type: colTypes[colIdx] || 'text',
        width: width || 200,
        config: colConfigs[colIdx] || {}
      };
    });

    const startIdx = hasHeader ? 1 : 0;
    const rows = [];
    const cellsToInsert = [];
    const blockId = block.id;

    for (let rIdx = startIdx; rIdx < cells.length; rIdx++) {
      const rowId = `row_${rIdx}_${createId()}`;
      const values = {};

      schema.forEach((prop, colIdx) => {
        const cellVal = cells[rIdx][colIdx] || '';
        values[prop.id] = cellVal;

        cellsToInsert.push({
          id: `${rowId}_${prop.id}`,
          rowId,
          blockId,
          propertyId: prop.id,
          value: cellVal,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      });

      rows.push({
        id: rowId,
        blockId,
        values,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    const { db } = await import('../../../db/database');
    const { useSecurityStore } = await import('../../../stores/securityStore');
    const { SecurityService } = await import('../../../utils/securityService');

    const key = useSecurityStore.getState().derivedKey;
    const encryptedCells = await Promise.all(
      cellsToInsert.map(async (cellObj) => {
        const dbCell = { ...cellObj };
        if (key && dbCell.value !== undefined) {
          dbCell.value = await SecurityService.encrypt(JSON.stringify(dbCell.value), key);
          dbCell._isEncrypted = true;
        }
        return dbCell;
      })
    );

    const rowsForDexie = rows.map(r => {
      const rowCopy = { ...r };
      delete rowCopy.values;
      return rowCopy;
    });

    await db.transaction('rw', [db.database_rows, db.database_cells], async () => {
      await db.database_rows.bulkPut(rowsForDexie);
      await db.database_cells.bulkPut(encryptedCells);
    });

    engine.updateBlock(block.id, {
      type: 'database',
      properties: {
        schema,
        rows
      }
    });

    closeMenu();
  };

  // --- Reordering, Keyboard Navigation & Drag-and-Drop ---

  const reorderArray = (arr, fromIndex, toIndex) => {
    const nextArr = [...arr];
    const [moved] = nextArr.splice(fromIndex, 1);
    nextArr.splice(toIndex, 0, moved);
    return nextArr;
  };

  const reorderObjectKeys = (obj, fromIndex, toIndex, totalCount) => {
    const nextObj = {};
    const indexMap = [];
    for (let i = 0; i < totalCount; i++) {
      indexMap.push(i);
    }
    const reorderedMap = reorderArray(indexMap, fromIndex, toIndex);
    reorderedMap.forEach((oldIndex, newIndex) => {
      if (obj[oldIndex] !== undefined) {
        nextObj[newIndex] = obj[oldIndex];
      }
    });
    return nextObj;
  };

  const reorderColumns = (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const colCount = columnWidths.length;
    if (fromIdx < 0 || fromIdx >= colCount || toIdx < 0 || toIdx >= colCount) return;

    const newCells = cells.map(row => reorderArray(row, fromIdx, toIdx));
    const newWidths = reorderArray(columnWidths, fromIdx, toIdx);
    const newColColors = reorderObjectKeys(colColors, fromIdx, toIdx, colCount);
    const newColTypes = reorderObjectKeys(colTypes, fromIdx, toIdx, colCount);
    const newColConfigs = reorderObjectKeys(colConfigs, fromIdx, toIdx, colCount);
    const newSummaryRowConfigs = reorderObjectKeys(summaryRowConfigs, fromIdx, toIdx, colCount);

    setCells(newCells);
    setColumnWidths(newWidths);
    setColColors(newColColors);
    setColTypes(newColTypes);
    setColConfigs(newColConfigs);
    setSummaryRowConfigs(newSummaryRowConfigs);

    save(newCells, hasHeader, hasHeaderCol, newWidths, rowHeights, rowColors, newColColors, newColTypes, newColConfigs, hasSummaryRow, newSummaryRowConfigs);
  };

  const reorderRows = (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const rowCount = cells.length;
    if (fromIdx < 0 || fromIdx >= rowCount || toIdx < 0 || toIdx >= rowCount) return;

    const newCells = reorderArray(cells, fromIdx, toIdx);
    const newHeights = reorderArray(rowHeights, fromIdx, toIdx);
    const newRowColors = reorderObjectKeys(rowColors, fromIdx, toIdx, rowCount);

    setCells(newCells);
    setRowHeights(newHeights);
    setRowColors(newRowColors);

    save(newCells, hasHeader, hasHeaderCol, columnWidths, newHeights, newRowColors, colColors, colTypes, colConfigs, hasSummaryRow, summaryRowConfigs);
  };

  const placeCaretAtEnd = (el) => {
    el.focus();
    if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const focusCell = (r, c) => {
    const colCount = cells[0].length;
    const rowCount = cells.length;
    if (r >= 0 && r < rowCount && c >= 0 && c < colCount) {
      if (colTypes[c] === 'formula') return false;
      const el = document.querySelector(`.table-cell-editable[data-row="${r}"][data-col="${c}"]`);
      if (el) {
        placeCaretAtEnd(el);
        return true;
      }
    }
    return false;
  };

  const focusNextCell = (startRow, startCol, direction = 'forward') => {
    const colCount = cells[0].length;
    const rowCount = cells.length;
    
    let currRow = startRow;
    let currCol = startCol;
    
    while (currRow >= 0 && currRow < rowCount) {
      if (direction === 'forward') {
        if (colTypes[currCol] !== 'formula' || (currRow === 0 && hasHeader)) {
          const el = document.querySelector(`.table-cell-editable[data-row="${currRow}"][data-col="${currCol}"]`);
          if (el) {
            placeCaretAtEnd(el);
            return true;
          }
        }
        currCol++;
        if (currCol >= colCount) {
          currCol = 0;
          currRow++;
        }
      } else {
        if (colTypes[currCol] !== 'formula' || (currRow === 0 && hasHeader)) {
          const el = document.querySelector(`.table-cell-editable[data-row="${currRow}"][data-col="${currCol}"]`);
          if (el) {
            placeCaretAtEnd(el);
            return true;
          }
        }
        currCol--;
        if (currCol < 0) {
          currCol = colCount - 1;
          currRow--;
        }
      }
    }
    
    if (direction === 'forward' && currRow >= rowCount) {
      setPendingFocus({ row: rowCount, col: 0 });
      addRow(rowCount);
      return true;
    }
    
    return false;
  };

  const handleCellKeyDown = (e, rowIndex, colIndex) => {
    const colCount = cells[0].length;
    const rowCount = cells.length;

    if (e.key === 'Tab') {
      e.preventDefault();
      const isShift = e.shiftKey;
      
      let nextCol = colIndex;
      let nextRow = rowIndex;
      
      if (isShift) {
        nextCol--;
        if (nextCol < 0) {
          nextCol = colCount - 1;
          nextRow--;
        }
        focusNextCell(nextRow, nextCol, 'backward');
      } else {
        nextCol++;
        if (nextCol >= colCount) {
          nextCol = 0;
          nextRow++;
        }
        focusNextCell(nextRow, nextCol, 'forward');
      }
    } else if (e.key === 'ArrowDown') {
      if (rowIndex < rowCount - 1) {
        e.preventDefault();
        focusNextCell(rowIndex + 1, colIndex, 'forward');
      }
    } else if (e.key === 'ArrowUp') {
      if (rowIndex > 0) {
        e.preventDefault();
        focusNextCell(rowIndex - 1, colIndex, 'backward');
      }
    }
  };

  // Drag-and-drop column/row reordering handlers
  const handleDragStartCol = (e, index) => {
    setDraggedItem({ type: 'col', index });
    e.dataTransfer.setData('text/plain', `col:${index}`);
    e.dataTransfer.effectAllowed = 'move';
    
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragStartRow = (e, index) => {
    setDraggedItem({ type: 'row', index });
    e.dataTransfer.setData('text/plain', `row:${index}`);
    e.dataTransfer.effectAllowed = 'move';
    
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOverCell = (e, rowIndex, colIndex) => {
    if (!draggedItem) return;
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    if (draggedItem.type === 'col') {
      const mouseX = e.clientX - rect.left;
      const side = mouseX < rect.width / 2 ? 'left' : 'right';
      setDragOverIndex(colIndex);
      setDragOverSide(side);
    } else if (draggedItem.type === 'row') {
      const mouseY = e.clientY - rect.top;
      const side = mouseY < rect.height / 2 ? 'top' : 'bottom';
      setDragOverIndex(rowIndex);
      setDragOverSide(side);
    }
  };

  const handleDragLeaveCell = () => {
    setDragOverIndex(null);
    setDragOverSide(null);
  };

  const handleDropCell = (e, rowIndex, colIndex) => {
    if (!draggedItem) return;
    e.preventDefault();

    const fromIdx = draggedItem.index;
    if (draggedItem.type === 'col') {
      let toIdx = colIndex;
      if (dragOverSide === 'right' && fromIdx > toIdx) {
        toIdx += 1;
      } else if (dragOverSide === 'left' && fromIdx < toIdx) {
        toIdx -= 1;
      }
      reorderColumns(fromIdx, toIdx);
    } else if (draggedItem.type === 'row') {
      let toIdx = rowIndex;
      if (dragOverSide === 'bottom' && fromIdx > toIdx) {
        toIdx += 1;
      } else if (dragOverSide === 'top' && fromIdx < toIdx) {
        toIdx -= 1;
      }
      reorderRows(fromIdx, toIdx);
    }

    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
    setDragOverSide(null);
  };


  const setColumnType = (colIndex, newType) => {
    const nextColTypes = { ...colTypes, [colIndex]: newType };
    let nextColConfigs = { ...colConfigs };
    let nextCells = [...cells];

    if (newType === 'formula') {
      nextColConfigs[colIndex] = {
        formula: '',
        numberFormat: 'number',
        decimalPlaces: 0,
        showAs: 'number',
        progressColor: 'blue'
      };
    } else if (newType === 'select') {
      nextColConfigs[colIndex] = {
        options: []
      };
    } else if (newType === 'checkbox') {
      nextColConfigs[colIndex] = {};
      nextCells = cells.map((row, rIdx) => {
        if (hasHeader && rIdx === 0) return row;
        const newRow = [...row];
        const val = getPlainText(newRow[colIndex]).trim().toLowerCase();
        if (val === 'true' || val === 'checked' || val === 'yes' || val === '1') {
          newRow[colIndex] = 'true';
        } else {
          newRow[colIndex] = 'false';
        }
        return newRow;
      });
      setCells(nextCells);
    } else if (newType === 'date') {
      nextColConfigs[colIndex] = {};
    } else {
      delete nextColConfigs[colIndex];
    }
    setColTypes(nextColTypes);
    setColConfigs(nextColConfigs);
    save(nextCells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, nextColTypes, nextColConfigs);
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

  const isNumericValue = (str) => {
    if (str === undefined || str === null) return false;
    const clean = getPlainText(str).trim();
    if (clean === '') return false;
    const numericClean = clean.replace(/[$,€£%]/g, '').replace(/,/g, '').trim();
    return !isNaN(parseFloat(numericClean)) && isFinite(numericClean);
  };

  const isColNumeric = (colIndex) => {
    if (colTypes[colIndex] === 'formula') return true;
    const startIndex = hasHeader ? 1 : 0;
    let numericCount = 0;
    let totalCount = 0;
    for (let r = startIndex; r < cells.length; r++) {
      const cellVal = cells[r]?.[colIndex];
      if (cellVal !== undefined && cellVal !== null) {
        const text = getPlainText(cellVal).trim();
        if (text !== '') {
          totalCount++;
          if (isNumericValue(text)) {
            numericCount++;
          }
        }
      }
    }
    return totalCount > 0 && (numericCount / totalCount) >= 0.5;
  };

  const formatNumberValue = (val, format, decimalPlaces = 2) => {
    const num = parseFloat(String(val).replace(/[$,€£%]/g, '').replace(/,/g, ''));
    if (isNaN(num)) return val;
    const fixed = num.toFixed(decimalPlaces);
    switch (format) {
      case 'percent':
        return `${fixed}%`;
      case 'usd':
        return `$${fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
      case 'eur':
        return `€${fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
      case 'gbp':
        return `£${fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
      case 'number':
      default:
        return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
  };

  const formatWholeColumn = (colIndex, format) => {
    const decimals = colConfigs[colIndex]?.decimalPlaces !== undefined ? colConfigs[colIndex].decimalPlaces : 0;
    const nextCells = cells.map((row, r) => {
      if (hasHeader && r === 0) return row;
      const newRow = [...row];
      const text = getPlainText(newRow[colIndex]).trim();
      if (isNumericValue(text)) {
        const num = parseFloat(text.replace(/[$,€£%]/g, '').replace(/,/g, ''));
        newRow[colIndex] = formatNumberValue(num, format, decimals);
      }
      return newRow;
    });
    const nextConfigs = {
      ...colConfigs,
      [colIndex]: {
        ...colConfigs[colIndex],
        numberFormat: format
      }
    };
    setCells(nextCells);
    setColConfigs(nextConfigs);
    save(nextCells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, nextConfigs);
  };

  const calculateSummaryValue = (colIndex, config) => {
    if (config === 'none') return '';
    const startIndex = hasHeader ? 1 : 0;
    const values = [];
    for (let r = startIndex; r < cells.length; r++) {
      let val = '';
      if (colTypes[colIndex] === 'formula') {
        const rowObj = {
          id: String(r),
          values: {},
          cells,
          colTypes,
          colConfigs,
          hasHeader
        };
        cells[r].forEach((v, c) => {
          rowObj.values[String(c)] = v;
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
        val = resolveTableValue(rowObj, currentProperty, mockSchema);
      } else {
        val = getPlainText(cells[r]?.[colIndex] || '').trim();
      }
      values.push(val);
    }
    
    if (config === 'count') {
      const nonEmpty = values.filter(v => v !== undefined && v !== null && String(v).trim() !== '');
      return nonEmpty.length;
    }
    
    const numbers = values
      .map(v => {
        if (v === undefined || v === null || String(v).trim() === '') return NaN;
        const clean = String(v).replace(/[$,€£%]/g, '').replace(/,/g, '').trim();
        return parseFloat(clean);
      })
      .filter(n => !isNaN(n));
      
    if (numbers.length === 0) {
      if (config === 'sum' || config === 'avg') return 0;
      return '-';
    }
    
    let result = 0;
    switch (config) {
      case 'sum':
        result = numbers.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        result = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        break;
      case 'max':
        result = Math.max(...numbers);
        break;
      case 'min':
        result = Math.min(...numbers);
        break;
      default:
        return '';
    }
    
    const format = colConfigs[colIndex]?.numberFormat || 'number';
    const decimals = colConfigs[colIndex]?.decimalPlaces !== undefined ? colConfigs[colIndex].decimalPlaces : 0;
    return formatNumberValue(result, format, decimals);
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
            <table className="notion-table" style={{ width: isFitToPage ? '100%' : (totalWidth || '100%') }}>
              <colgroup>
                {columnWidths.map((width, i) => (
                  <col key={i} style={{ width: isFitToPage ? `${(width / totalWidth) * 100}%` : width }} />
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

                      const isRowDragOver = draggedItem?.type === 'row' && dragOverIndex === rowIndex;
                      const isColDragOver = draggedItem?.type === 'col' && dragOverIndex === colIndex;

                      const inRange = isCellInRange(rowIndex, colIndex);
                      const borderRangeClass = getRangeBorderClass(rowIndex, colIndex);

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
                        // Drag indicators
                        isRowDragOver && dragOverSide === 'top' ? 'drag-over-top' : '',
                        isRowDragOver && dragOverSide === 'bottom' ? 'drag-over-bottom' : '',
                        isColDragOver && dragOverSide === 'left' ? 'drag-over-left' : '',
                        isColDragOver && dragOverSide === 'right' ? 'drag-over-right' : '',
                        // Range selection highlighting & borders
                        inRange ? 'is-in-range-selected' : '',
                        borderRangeClass,
                      ].filter(Boolean).join(' ');

                      const showColPill = hoveredColIndex === colIndex || isColSelected;
                      const showRowPill = hoveredRowIndex === rowIndex || isRowSelected;

                      return (
                        <Tag 
                          key={colIndex} 
                          className={cellClasses}
                          style={{
                            textAlign: isColNumeric(colIndex) ? 'right' : 'left'
                          }}
                          onMouseEnter={(e) => {
                            setHoveredRowIndex(rowIndex);
                            setHoveredColIndex(colIndex);
                            handleCellMouseEnterRange(e, rowIndex, colIndex);
                          }}
                          onMouseLeave={() => {
                            setHoveredRowIndex(null);
                            setHoveredColIndex(null);
                          }}
                          onMouseDown={(e) => handleCellMouseDown(e, rowIndex, colIndex)}
                          onDragOver={(e) => handleDragOverCell(e, rowIndex, colIndex)}
                          onDragLeave={handleDragLeaveCell}
                          onDrop={(e) => handleDropCell(e, rowIndex, colIndex)}
                        >
                          
                          {/* Column Selector Handle Pill (appears at the top of first cell in each col) */}
                          {rowIndex === 0 && (
                            <div className="col-handle-wrapper">
                              <div 
                                className={`col-handle-pill ${isColSelected ? 'is-selected' : ''} ${showColPill ? 'is-visible' : ''}`}
                                draggable
                                onDragStart={(e) => handleDragStartCol(e, colIndex)}
                                onDragEnd={handleDragEnd}
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
                                draggable
                                onDragStart={(e) => handleDragStartRow(e, rowIndex)}
                                onDragEnd={handleDragEnd}
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
                            <div className="table-cell-readonly font-mono" style={{ padding: '8px', minHeight: '34px', display: 'flex', alignItems: 'center', width: '100%', justifyContent: isColNumeric(colIndex) ? 'flex-end' : 'flex-start' }}>
                              {(() => {
                                const rowObj = {
                                  id: String(rowIndex),
                                  values: {},
                                  cells: cells,
                                  colTypes: colTypes,
                                  colConfigs: colConfigs,
                                  hasHeader: hasHeader
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
                          ) : colTypes[colIndex] === 'checkbox' && !isHeaderRow ? (
                            <div 
                              style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: '100%',
                                height: '100%',
                                minHeight: '34px',
                                cursor: 'pointer'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const isChecked = cell === 'true';
                                const nextVal = isChecked ? 'false' : 'true';
                                handleCellInput(rowIndex, colIndex, nextVal);
                              }}
                            >
                              <div 
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  border: cell === 'true' ? '1px solid var(--accent-primary)' : '1.5px solid var(--text-tertiary)',
                                  borderRadius: '3px',
                                  background: cell === 'true' ? 'var(--accent-primary)' : 'transparent',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {cell === 'true' && (
                                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                            </div>
                          ) : colTypes[colIndex] === 'select' && !isHeaderRow ? (
                            (() => {
                              const optVal = getPlainText(cell).trim();
                              const colConfig = colConfigs[colIndex] || {};
                              const options = colConfig.options || [];
                              const matchedOption = options.find(o => o.value === optVal);

                              const tagStyle = matchedOption ? {
                                background: matchedOption.bg || 'var(--bg-secondary)',
                                color: matchedOption.color || 'var(--text-primary)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontWeight: '500'
                              } : {
                                color: 'var(--text-tertiary)',
                                fontSize: '12px'
                              };

                              return (
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setSelectMenuCell({
                                      row: rowIndex,
                                      col: colIndex,
                                      x: rect.left + window.scrollX,
                                      y: rect.bottom + window.scrollY + 4,
                                      width: Math.max(rect.width, 180)
                                    });
                                  }}
                                  style={{
                                    padding: '8px',
                                    minHeight: '34px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: '100%',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {optVal ? (
                                    <span style={tagStyle}>{optVal}</span>
                                  ) : (
                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Empty select</span>
                                  )}
                                </div>
                              );
                            })()
                          ) : colTypes[colIndex] === 'date' && !isHeaderRow ? (
                            (() => {
                              const dateVal = getPlainText(cell).trim();
                              const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
                              const isEditing = editingDateCell?.row === rowIndex && editingDateCell?.col === colIndex;

                              if (isEditing) {
                                return (
                                  <input 
                                    type="date"
                                    value={dateVal}
                                    autoFocus
                                    onBlur={() => setEditingDateCell(null)}
                                    onChange={(e) => {
                                      handleCellInput(rowIndex, colIndex, e.target.value);
                                    }}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      padding: '6px 8px',
                                      background: 'transparent',
                                      border: 'none',
                                      outline: 'none',
                                      color: 'var(--text-primary)',
                                      fontSize: '13px',
                                      fontFamily: 'inherit'
                                    }}
                                  />
                                );
                              }

                              return (
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingDateCell({ row: rowIndex, col: colIndex });
                                  }}
                                  style={{
                                    padding: '8px',
                                    minHeight: '34px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    width: '100%',
                                    cursor: 'pointer',
                                    color: dateVal ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                    fontSize: '13px'
                                  }}
                                >
                                  <Calendar size={14} style={{ marginRight: '6px', flexShrink: 0, opacity: 0.6 }} />
                                  <span>{formattedDate || 'Empty date'}</span>
                                </div>
                              );
                            })()
                          ) : (
                            <TableCell
                              key={`cell-${rowIndex}-${colIndex}`}
                              className="table-cell-editable"
                              data-row={rowIndex}
                              data-col={colIndex}
                              value={cell}
                              style={{ textAlign: isColNumeric(colIndex) ? 'right' : 'left' }}
                              onInput={(html) => handleCellInput(rowIndex, colIndex, html)}
                              onBlur={(html) => handleCellBlur(rowIndex, colIndex, html)}
                              onKeyDown={(e) => handleCellKeyDown(e, rowIndex, colIndex)}
                              onPaste={(e) => handleCellPaste(e, rowIndex, colIndex)}
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
                {hasSummaryRow && (
                  <tr className="notion-tr is-summary-row" style={{ height: '36px', borderTop: '2px double rgb(60, 60, 60)', background: 'var(--bg-secondary)' }}>
                    {columnWidths.map((width, colIndex) => {
                      const Tag = 'td';
                      const activeColor = colColors[colIndex] || 'default';
                      
                      const cellClasses = [
                        'notion-td',
                        'is-summary-cell',
                        `cell-bg-${activeColor}`,
                        hasHeaderCol && colIndex === 0 ? 'is-header-col-cell' : '',
                      ].filter(Boolean).join(' ');

                      const summaryConfig = summaryRowConfigs[colIndex] || 'none';
                      const summaryValue = calculateSummaryValue(colIndex, summaryConfig);

                      return (
                        <Tag 
                          key={`summary-${colIndex}`} 
                          className={cellClasses}
                          style={{
                            padding: '0',
                            fontSize: '13px',
                            fontWeight: '500',
                            textAlign: isColNumeric(colIndex) ? 'right' : 'left',
                            verticalAlign: 'middle',
                            position: 'relative'
                          }}
                        >
                          <SummaryCellSelector 
                            colIndex={colIndex}
                            config={summaryConfig}
                            value={summaryValue}
                            onChange={(nextConfig) => {
                              const nextConfigs = {
                                ...summaryRowConfigs,
                                [colIndex]: nextConfig
                              };
                              setSummaryRowConfigs(nextConfigs);
                              save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, colConfigs, hasSummaryRow, nextConfigs);
                            }}
                          />
                        </Tag>
                      );
                    })}
                  </tr>
                )}
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
                  onClick={() => setColumnType(colMenu.index, 'checkbox')}
                  style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px' }}
                >
                  <CheckSquare size={14} style={{ marginRight: '8px', opacity: 0.7 }} />
                  <span style={{ fontSize: '13px' }}>Checkbox</span>
                </div>
                <div 
                  className="color-menu-item" 
                  onClick={() => setColumnType(colMenu.index, 'select')}
                  style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px' }}
                >
                  <Tag size={14} style={{ marginRight: '8px', opacity: 0.7 }} />
                  <span style={{ fontSize: '13px' }}>Select</span>
                </div>
                <div 
                  className="color-menu-item" 
                  onClick={() => setColumnType(colMenu.index, 'date')}
                  style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px' }}
                >
                  <Calendar size={14} style={{ marginRight: '8px', opacity: 0.7 }} />
                  <span style={{ fontSize: '13px' }}>Date</span>
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

              {/* Numeric Column Auto-Detection suggestion */}
              {isColNumeric(colMenu.index) && !colConfigs[colMenu.index]?.numberFormat && (
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>💡 Numeric column detected</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    Would you like to format this column?
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      onClick={() => {
                        formatWholeColumn(colMenu.index, 'number');
                        closeMenu();
                      }}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        fontSize: '10px',
                        padding: '2px 6px',
                        cursor: 'pointer'
                      }}
                    >
                      Number
                    </button>
                    <button 
                      onClick={() => {
                        formatWholeColumn(colMenu.index, 'usd');
                        closeMenu();
                      }}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        fontSize: '10px',
                        padding: '2px 6px',
                        cursor: 'pointer'
                      }}
                    >
                      USD ($)
                    </button>
                    <button 
                      onClick={() => {
                        formatWholeColumn(colMenu.index, 'percent');
                        closeMenu();
                      }}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        fontSize: '10px',
                        padding: '2px 6px',
                        cursor: 'pointer'
                      }}
                    >
                      Percent (%)
                    </button>
                  </div>
                </div>
              )}

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
                  <span style={{ fontSize: '11px', textTransform: 'capitalize' }}>{colTypes[colMenu.index] || 'text'}</span>
                  <ChevronRight size={14} />
                </div>
              </button>

              <div className="table-menu-divider" style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />
              
              {/* Format & Visuals rendering inside menu if formula or numeric */}
              {(colTypes[colMenu.index] === 'formula' || isColNumeric(colMenu.index) || colConfigs[colMenu.index]?.numberFormat) && (
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
                          formatWholeColumn(colMenu.index, fmt);
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
                          const dp = Number(e.target.value);
                          const nextConfigs = {
                            ...colConfigs,
                            [colMenu.index]: {
                              ...colConfigs[colMenu.index],
                              decimalPlaces: dp
                            }
                          };
                          setColConfigs(nextConfigs);
                          // Re-format column values with new decimals
                          const nextCells = cells.map((row, r) => {
                            if (hasHeader && r === 0) return row;
                            const newRow = [...row];
                            const text = getPlainText(newRow[colMenu.index]).trim();
                            if (isNumericValue(text)) {
                              const num = parseFloat(text.replace(/[$,€£%]/g, '').replace(/,/g, ''));
                              newRow[colMenu.index] = formatNumberValue(num, colConfigs[colMenu.index]?.numberFormat || 'number', dp);
                            }
                            return newRow;
                          });
                          setCells(nextCells);
                          save(nextCells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, nextConfigs);
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

                    {/* Searchable Click to Insert */}
                    <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '8px', marginTop: '6px' }}>
                      <div className="formula-search-container">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 'bold' }}>Formula Autocomplete Helper</span>
                          {/* Tabs */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => setFormulaHelperTab('functions')}
                              style={{
                                background: 'none',
                                border: 'none',
                                outline: 'none',
                                fontSize: '10px',
                                cursor: 'pointer',
                                fontWeight: formulaHelperTab === 'functions' ? 'bold' : 'normal',
                                color: formulaHelperTab === 'functions' ? 'var(--accent-primary)' : 'var(--text-tertiary)'
                              }}
                            >
                              Functions
                            </button>
                            <button
                              onClick={() => setFormulaHelperTab('properties')}
                              style={{
                                background: 'none',
                                border: 'none',
                                outline: 'none',
                                fontSize: '10px',
                                cursor: 'pointer',
                                fontWeight: formulaHelperTab === 'properties' ? 'bold' : 'normal',
                                color: formulaHelperTab === 'properties' ? 'var(--accent-primary)' : 'var(--text-tertiary)'
                              }}
                            >
                              Columns
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          className="formula-search-input"
                          placeholder={`Search ${formulaHelperTab}...`}
                          value={formulaSearch}
                          onChange={(e) => setFormulaSearch(e.target.value)}
                        />

                        <div className="formula-helper-list">
                          {formulaHelperTab === 'properties' ? (
                            columnWidths.map((_, c) => {
                              if (c === colMenu.index) return null;
                              const letter = getColumnLetter(c);
                              const headerText = (hasHeader && cells[0]?.[c]) ? getPlainText(cells[0][c]).trim() : '';
                              const insertName = headerText || letter;
                              
                              if (formulaSearch && !insertName.toLowerCase().includes(formulaSearch.toLowerCase())) {
                                return null;
                              }

                              const insertStr = `prop("${insertName}")`;

                              return (
                                <div
                                  key={c}
                                  className="formula-helper-item"
                                  onClick={() => {
                                    const txtArea = document.getElementById('formula-textarea');
                                    if (txtArea) {
                                      const val = colConfigs[colMenu.index]?.formula || '';
                                      const start = txtArea.selectionStart;
                                      const end = txtArea.selectionEnd;
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
                                >
                                  <span className="formula-helper-name">{insertName}</span>
                                  <span className="formula-helper-desc">prop("{insertName}")</span>
                                </div>
                              );
                            })
                          ) : (
                            [
                              { label: 'prop()', code: 'prop("Column")', desc: 'Value of another column' },
                              { label: 'sum()', code: 'sum(A:B)', desc: 'Sum of cells in range' },
                              { label: 'avg()', code: 'avg(A:B)', desc: 'Average of cells' },
                              { label: 'count()', code: 'count(A:B)', desc: 'Count non-empty cells' },
                              { label: 'max()', code: 'max(A:B)', desc: 'Find maximum cell' },
                              { label: 'min()', code: 'min(A:B)', desc: 'Find minimum cell' },
                              { label: 'if()', code: 'if(cond, t, f)', desc: 'If statement' },
                              { label: 'and()', code: 'and(a, b)', desc: 'Logical AND' },
                              { label: 'or()', code: 'or(a, b)', desc: 'Logical OR' },
                              { label: 'not()', code: 'not(a)', desc: 'Logical NOT' },
                              { label: 'concat()', code: 'concat(a, b)', desc: 'Concatenate strings' },
                              { label: 'lower()', code: 'lower(text)', desc: 'Lowercase text' },
                              { label: 'upper()', code: 'upper(text)', desc: 'Uppercase text' },
                              { label: 'length()', code: 'length(text)', desc: 'Length of string' },
                              { label: 'contains()', code: 'contains(t, sub)', desc: 'Check if contains' },
                              { label: 'add()', code: 'add(a, b)', desc: 'Adds two numbers' },
                              { label: 'subtract()', code: 'subtract(a, b)', desc: 'Subtracts numbers' },
                              { label: 'multiply()', code: 'multiply(a, b)', desc: 'Multiplies numbers' },
                              { label: 'divide()', code: 'divide(a, b)', desc: 'Divides numbers' },
                              { label: 'dateAdd()', code: 'dateAdd(d, 5, "days")', desc: 'Add duration to date' }
                            ]
                            .filter(fn => 
                              fn.label.toLowerCase().includes(formulaSearch.toLowerCase()) || 
                              fn.desc.toLowerCase().includes(formulaSearch.toLowerCase())
                            )
                            .map(fn => (
                              <div
                                key={fn.label}
                                className="formula-helper-item"
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
                              >
                                <span className="formula-helper-name">{fn.label}</span>
                                <span className="formula-helper-desc">{fn.desc}</span>
                              </div>
                            ))
                          )}
                        </div>
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
                    save(cells, next, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, colConfigs, hasSummaryRow);
                  }},
                  { id: 'header_col', label: 'Header column', icon: Columns, type: 'toggle', active: hasHeaderCol, action: () => {
                    const next = !hasHeaderCol;
                    setHasHeaderCol(next);
                    save(cells, hasHeader, next, columnWidths, rowHeights, rowColors, colColors, colTypes, colConfigs, hasSummaryRow);
                  }},
                  { id: 'summary_row', label: 'Summary row', icon: Calculator, type: 'toggle', active: hasSummaryRow, action: () => {
                    const next = !hasSummaryRow;
                    setHasSummaryRow(next);
                    save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, colConfigs, next);
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
                    save(cells, next, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, colConfigs, hasSummaryRow);
                  }},
                  { id: 'header_col', label: 'Header column', icon: Columns, type: 'toggle', active: hasHeaderCol, action: () => {
                    const next = !hasHeaderCol;
                    setHasHeaderCol(next);
                    save(cells, hasHeader, next, columnWidths, rowHeights, rowColors, colColors, colTypes, colConfigs, hasSummaryRow);
                  }},
                  { id: 'summary_row', label: 'Summary row', icon: Calculator, type: 'toggle', active: hasSummaryRow, action: () => {
                    const next = !hasSummaryRow;
                    setHasSummaryRow(next);
                    save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, colConfigs, next);
                  }},
                  { id: 'fit_to_page', label: 'Fit to page width', icon: Columns, type: 'toggle', active: isFitToPage, action: () => {
                    const next = !isFitToPage;
                    setIsFitToPage(next);
                    save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, colConfigs, hasSummaryRow, summaryRowConfigs, next);
                  }},
                  { id: 'color', label: 'Color', icon: Palette, type: 'submenu', action: () => setColorMenu('row') },
                  { id: 'insert_above', label: 'Insert above', icon: ArrowUp, action: () => { insertRow(rowMenu.index, 'above'); closeMenu(); } },
                  { id: 'insert_below', label: 'Insert below', icon: ArrowDown, action: () => { insertRow(rowMenu.index, 'below'); closeMenu(); } },
                  { id: 'duplicate', label: 'Duplicate', icon: Copy, shortcut: 'Ctrl+D', action: () => { duplicateRow(rowMenu.index); closeMenu(); } },
                  { id: 'convert_database', label: 'Turn into database', icon: Table, action: () => { convertToDatabase(); } },
                  { id: 'export_csv', label: 'Export as CSV', icon: Download, action: () => { exportToCSV(); } },
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

      {/* Select Tags Portal Options Popover */}
      {selectMenuCell && createPortal(
        <>
          <div 
            className="table-menu-backdrop" 
            onClick={() => {
              setSelectMenuCell(null);
              setSelectSearchQuery('');
            }} 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
              background: 'transparent'
            }}
          />
          <div 
            className="table-handle-menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: selectMenuCell.y,
              left: selectMenuCell.x,
              width: selectMenuCell.width,
              zIndex: 9999,
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {/* Search/Create Input */}
            <input 
              type="text" 
              className="menu-search-input" 
              placeholder="Search or create option..." 
              autoFocus
              onChange={(e) => setSelectSearchQuery(e.target.value)}
              value={selectSearchQuery}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none'
              }}
            />

            {/* Options List */}
            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {/* Clear Option */}
              <div
                onClick={() => {
                  handleCellInput(selectMenuCell.row, selectMenuCell.col, '');
                  setSelectMenuCell(null);
                  setSelectSearchQuery('');
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--text-tertiary)'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Clear selection
              </div>

              {/* Existing Options */}
              {(() => {
                const selectColConfig = colConfigs[selectMenuCell.col] || {};
                const options = selectColConfig.options || [];
                const filtered = options.filter(o => 
                  o.value.toLowerCase().includes(selectSearchQuery.toLowerCase())
                );

                return (
                  <>
                    {filtered.map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => {
                          handleCellInput(selectMenuCell.row, selectMenuCell.col, opt.value);
                          setSelectMenuCell(null);
                          setSelectSearchQuery('');
                        }}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          background: 'transparent',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{
                          background: opt.bg,
                          color: opt.color,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>{opt.value}</span>
                      </div>
                    ))}

                    {/* Create New Option */}
                    {selectSearchQuery.trim() && !options.some(o => o.value.toLowerCase() === selectSearchQuery.trim().toLowerCase()) && (
                      <div
                        onClick={() => {
                          const newVal = selectSearchQuery.trim();
                          const randomColor = SELECT_TAG_COLORS[Math.floor(Math.random() * SELECT_TAG_COLORS.length)];
                          const newOpt = {
                            value: newVal,
                            bg: randomColor.bg,
                            color: randomColor.text
                          };
                          const updatedOptions = [...options, newOpt];
                          const nextConfigs = {
                            ...colConfigs,
                            [selectMenuCell.col]: {
                              ...colConfigs[selectMenuCell.col],
                              options: updatedOptions
                            }
                          };
                          setColConfigs(nextConfigs);
                          handleCellInput(selectMenuCell.row, selectMenuCell.col, newVal);
                          save(cells, hasHeader, hasHeaderCol, columnWidths, rowHeights, rowColors, colColors, colTypes, nextConfigs);
                          setSelectMenuCell(null);
                          setSelectSearchQuery('');
                        }}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: 'var(--accent-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '4px',
                          borderTop: '1px solid var(--border-subtle)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span>Create option</span>
                        <strong style={{
                          background: 'var(--accent-subtle)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>{selectSearchQuery.trim()}</strong>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </>
      , document.body)}

    </div>
  );
}
