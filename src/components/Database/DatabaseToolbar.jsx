import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Filter, ArrowUpDown, X, Plus, ChevronDown } from 'lucide-react';
import { PROPERTY_TYPE_META } from '../../utils/constants';

export default function DatabaseToolbar({ schema, filters, sorts, onFiltersChange, onSortsChange }) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const filterBtnRef = useRef(null);
  const sortBtnRef = useRef(null);
  const [filterMenuPos, setFilterMenuPos] = useState(null);
  const [sortMenuPos, setSortMenuPos] = useState(null);

  const openFilterMenu = () => {
    const rect = filterBtnRef.current?.getBoundingClientRect();
    if (rect) setFilterMenuPos({ top: rect.bottom + 8, left: rect.left });
    setShowFilterMenu(true);
    setShowSortMenu(false);
  };

  const openSortMenu = () => {
    const rect = sortBtnRef.current?.getBoundingClientRect();
    if (rect) setSortMenuPos({ top: rect.bottom + 8, left: rect.left });
    setShowSortMenu(true);
    setShowFilterMenu(false);
  };

  const addFilter = () => {
    if (schema.length === 0) return;
    onFiltersChange([...filters, { propertyId: schema[0].id, operator: 'contains', value: '' }]);
  };

  const updateFilter = (idx, updates) => {
    const next = filters.map((f, i) => i === idx ? { ...f, ...updates } : f);
    onFiltersChange(next);
  };

  const removeFilter = (idx) => {
    onFiltersChange(filters.filter((_, i) => i !== idx));
  };

  const addSort = () => {
    if (schema.length === 0) return;
    onSortsChange([...sorts, { propertyId: schema[0].id, direction: 'asc' }]);
  };

  const updateSort = (idx, updates) => {
    const next = sorts.map((s, i) => i === idx ? { ...s, ...updates } : s);
    onSortsChange(next);
  };

  const removeSort = (idx) => {
    onSortsChange(sorts.filter((_, i) => i !== idx));
  };

  return (
    <div className="db-toolbar">
      <button
        ref={filterBtnRef}
        className={`db-toolbar-btn ${filters.length > 0 ? 'active' : ''}`}
        onClick={openFilterMenu}
      >
        <Filter size={14} />
        <span>Filter</span>
        {filters.length > 0 && <span className="db-toolbar-badge">{filters.length}</span>}
      </button>

      <button
        ref={sortBtnRef}
        className={`db-toolbar-btn ${sorts.length > 0 ? 'active' : ''}`}
        onClick={openSortMenu}
      >
        <ArrowUpDown size={14} />
        <span>Sort</span>
        {sorts.length > 0 && <span className="db-toolbar-badge">{sorts.length}</span>}
      </button>

      {/* Filter Menu Portal */}
      {showFilterMenu && filterMenuPos && createPortal(
        <div className="db-toolbar-popover" style={{ top: filterMenuPos.top, left: filterMenuPos.left }}>
          <div className="db-toolbar-popover-overlay" onClick={() => setShowFilterMenu(false)} />
          <div className="db-toolbar-popover-content">
            <div className="db-toolbar-popover-header">
              <span>Filters</span>
              <button className="db-toolbar-close" onClick={() => setShowFilterMenu(false)}><X size={14} /></button>
            </div>
            {filters.length === 0 && (
              <div style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontSize: '12px' }}>No filters applied</div>
            )}
            {filters.map((f, idx) => {
              const prop = schema.find(s => s.id === f.propertyId);
              return (
                <div key={idx} className="db-filter-row">
                  <select
                    className="db-filter-select"
                    value={f.propertyId}
                    onChange={e => updateFilter(idx, { propertyId: e.target.value })}
                  >
                    {schema.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select
                    className="db-filter-select"
                    value={f.operator}
                    onChange={e => updateFilter(idx, { operator: e.target.value })}
                  >
                    <option value="contains">Contains</option>
                    <option value="equals">Equals</option>
                    <option value="not_empty">Not empty</option>
                    <option value="empty">Is empty</option>
                  </select>
                  {!['empty', 'not_empty'].includes(f.operator) && (
                    <input
                      className="db-filter-input"
                      placeholder="Value..."
                      value={f.value}
                      onChange={e => updateFilter(idx, { value: e.target.value })}
                    />
                  )}
                  <button className="db-filter-remove" onClick={() => removeFilter(idx)}>
                    <X size={12} />
                  </button>
                </div>
              );
            })}
            <button className="db-toolbar-add-btn" onClick={addFilter}>
              <Plus size={14} /> Add filter
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Sort Menu Portal */}
      {showSortMenu && sortMenuPos && createPortal(
        <div className="db-toolbar-popover" style={{ top: sortMenuPos.top, left: sortMenuPos.left }}>
          <div className="db-toolbar-popover-overlay" onClick={() => setShowSortMenu(false)} />
          <div className="db-toolbar-popover-content">
            <div className="db-toolbar-popover-header">
              <span>Sort</span>
              <button className="db-toolbar-close" onClick={() => setShowSortMenu(false)}><X size={14} /></button>
            </div>
            {sorts.length === 0 && (
              <div style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontSize: '12px' }}>No sorts applied</div>
            )}
            {sorts.map((s, idx) => (
              <div key={idx} className="db-filter-row">
                <select
                  className="db-filter-select"
                  value={s.propertyId}
                  onChange={e => updateSort(idx, { propertyId: e.target.value })}
                >
                  {schema.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                </select>
                <select
                  className="db-filter-select"
                  value={s.direction}
                  onChange={e => updateSort(idx, { direction: e.target.value })}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
                <button className="db-filter-remove" onClick={() => removeSort(idx)}>
                  <X size={12} />
                </button>
              </div>
            ))}
            <button className="db-toolbar-add-btn" onClick={addSort}>
              <Plus size={14} /> Add sort
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
