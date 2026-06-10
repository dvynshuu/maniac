import React, { useState, useMemo, useRef } from 'react';
import { Plus, ChevronDown, Calendar, Edit2, Trash2 } from 'lucide-react';
import { TRACKER_FIELD_TYPES } from '../../utils/constants';

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function TrackerHeatmap({ tracker, entries, onRowClick, onAddEntryForDate }) {
  const [metricMode, setMetricMode] = useState('count'); // 'count', or 'num_[fieldId]', or 'bool_[fieldId]'
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '' });
  const containerRef = useRef(null);

  // Extract fields for selection
  const numericFields = useMemo(() => tracker.fields.filter(f => f.type === TRACKER_FIELD_TYPES.NUMBER), [tracker.fields]);
  const booleanFields = useMemo(() => tracker.fields.filter(f => f.type === TRACKER_FIELD_TYPES.BOOLEAN), [tracker.fields]);

  // Group entries by YYYY-MM-DD
  const entriesByDate = useMemo(() => {
    const map = {};
    entries.forEach(entry => {
      const dateKey = formatDateKey(new Date(entry.createdAt));
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(entry);
    });
    return map;
  }, [entries]);

  // Generate date grid: 53 weeks, aligned to Sunday-Saturday
  const gridDays = useMemo(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
    
    // Set to the Saturday of the current week
    const endSaturday = new Date(today);
    endSaturday.setDate(today.getDate() + (6 - currentDayOfWeek));
    
    const days = [];
    const tempDate = new Date(endSaturday);
    tempDate.setDate(endSaturday.getDate() - 370); // 53 weeks * 7 - 1 = 370 days ago
    
    for (let i = 0; i < 371; i++) {
      const dateCopy = new Date(tempDate);
      days.push({
        date: dateCopy,
        dateKey: formatDateKey(dateCopy),
        isFuture: dateCopy > today,
      });
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    return days;
  }, []);

  // Compute values for each day based on the selected metric
  const dayValues = useMemo(() => {
    const values = {};
    
    gridDays.forEach(day => {
      if (day.isFuture) {
        values[day.dateKey] = null;
        return;
      }
      
      const dayEntries = entriesByDate[day.dateKey] || [];
      
      if (metricMode === 'count') {
        values[day.dateKey] = dayEntries.length;
      } else if (metricMode.startsWith('num_')) {
        const fieldId = metricMode.replace('num_', '');
        const sum = dayEntries.reduce((acc, entry) => {
          const val = parseFloat(entry.data[fieldId]);
          return acc + (isNaN(val) ? 0 : val);
        }, 0);
        values[day.dateKey] = sum;
      } else if (metricMode.startsWith('bool_')) {
        const fieldId = metricMode.replace('bool_', '');
        const isCompleted = dayEntries.some(entry => entry.data[fieldId] === true);
        values[day.dateKey] = isCompleted ? 1 : 0;
      }
    });
    
    return values;
  }, [gridDays, entriesByDate, metricMode]);

  // Determine scale maximum for color mapping
  const maxValue = useMemo(() => {
    let max = 0;
    Object.values(dayValues).forEach(v => {
      if (v !== null && v > max) max = v;
    });
    return max || 1;
  }, [dayValues]);

  // Level determination: returns integer from 0 to 4
  const getLevel = (value) => {
    if (value === null || value === undefined || value === 0) return 0;
    if (metricMode.startsWith('bool_')) return value > 0 ? 4 : 0;
    
    const ratio = value / maxValue;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  // Tooltip events
  const handleMouseEnter = (e, day, value) => {
    if (day.isFuture) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cellRect = e.target.getBoundingClientRect();
    const x = cellRect.left - rect.left + cellRect.width / 2;
    const y = cellRect.top - rect.top - 36;
    
    let text = '';
    const dateStr = day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    
    if (metricMode === 'count') {
      text = `${value} entry${value === 1 ? '' : 's'}`;
    } else if (metricMode.startsWith('num_')) {
      const field = numericFields.find(f => f.id === metricMode.replace('num_', ''));
      text = `${value} ${field ? field.name : ''}`;
    } else if (metricMode.startsWith('bool_')) {
      const field = booleanFields.find(f => f.id === metricMode.replace('bool_', ''));
      text = value > 0 ? `${field ? field.name : ''}: Done` : `${field ? field.name : ''}: Not Done`;
    }

    setTooltip({
      show: true,
      x,
      y,
      content: `${dateStr} • ${text}`
    });
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, show: false }));
  };

  // Click handler
  const handleCellClick = (day) => {
    if (day.isFuture) return;
    setSelectedDate(day.dateKey);
  };

  // Format month labels at the top (Jan, Feb...)
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    
    for (let col = 0; col < 53; col++) {
      // Look at the first day of each week (column)
      const dayIndex = col * 7;
      if (dayIndex < gridDays.length) {
        const date = gridDays[dayIndex].date;
        const month = date.getMonth();
        if (month !== lastMonth) {
          labels.push({
            name: date.toLocaleDateString(undefined, { month: 'short' }),
            colIndex: col
          });
          lastMonth = month;
        }
      }
    }
    
    // Prevent overlapping labels: filter labels that are too close (e.g. within 2 columns)
    const filteredLabels = [];
    labels.forEach((label, idx) => {
      if (idx === 0 || label.colIndex - filteredLabels[filteredLabels.length - 1].colIndex >= 3) {
        filteredLabels.push(label);
      }
    });
    
    return filteredLabels;
  }, [gridDays]);

  const selectedDayEntries = selectedDate ? (entriesByDate[selectedDate] || []) : [];
  const selectedDateFormatted = selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  return (
    <div className="tracker-heatmap-view" ref={containerRef}>
      {/* Metric Mode Selectors */}
      <div className="heatmap-controls">
        <div className="heatmap-selector">
          <Calendar size={14} className="text-secondary" />
          <span className="text-secondary text-sm">Visualize:</span>
          <div className="select-wrapper">
            <select 
              value={metricMode} 
              onChange={e => { setMetricMode(e.target.value); setSelectedDate(null); }}
              className="heatmap-select"
            >
              <option value="count">Total Log Count</option>
              {numericFields.map(f => (
                <option key={f.id} value={`num_${f.id}`}>Sum of: {f.name}</option>
              ))}
              {booleanFields.map(f => (
                <option key={f.id} value={`bool_${f.id}`}>Completion of: {f.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="select-arrow" />
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="heatmap-scroll-container">
        <div className="heatmap-grid-wrapper">
          
          {/* Month Header Row */}
          <div className="heatmap-months-row">
            {monthLabels.map((lbl, i) => (
              <span 
                key={i} 
                className="heatmap-month-label"
                style={{ gridColumnStart: lbl.colIndex + 2 }}
              >
                {lbl.name}
              </span>
            ))}
          </div>

          {/* Grid Layout: Left Label column + 53 columns */}
          <div className="heatmap-grid-layout">
            
            {/* Y-Axis Weekday Labels */}
            <div className="heatmap-weekday-labels">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Matrix Cells */}
            <div className="heatmap-cells-grid">
              {gridDays.map((day, idx) => {
                const val = dayValues[day.dateKey];
                const lvl = getLevel(val);
                const isSelected = selectedDate === day.dateKey;
                
                return (
                  <button
                    key={idx}
                    className={`heatmap-cell ${day.isFuture ? 'future' : ''} ${isSelected ? 'selected' : ''}`}
                    data-level={lvl}
                    disabled={day.isFuture}
                    onClick={() => handleCellClick(day)}
                    onMouseEnter={(e) => handleMouseEnter(e, day, val)}
                    onMouseLeave={handleMouseLeave}
                    aria-label={`Log for ${day.dateKey}`}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Heatmap Legend */}
          <div className="heatmap-legend">
            <span>Less</span>
            <div className="legend-cells">
              <span className="legend-cell" data-level="0" />
              <span className="legend-cell" data-level="1" />
              <span className="legend-cell" data-level="2" />
              <span className="legend-cell" data-level="3" />
              <span className="legend-cell" data-level="4" />
            </div>
            <span>More</span>
          </div>

        </div>
      </div>

      {/* Floating Tooltip */}
      {tooltip.show && (
        <div 
          className="heatmap-tooltip"
          style={{ 
            left: `${tooltip.x}px`, 
            top: `${tooltip.y}px` 
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Detailed Log Drawer Panel */}
      {selectedDate && (
        <div className="heatmap-details-panel">
          <div className="details-header">
            <div>
              <h4 className="details-title">{selectedDateFormatted}</h4>
              <span className="details-subtitle">
                {selectedDayEntries.length} log{selectedDayEntries.length === 1 ? '' : 's'} recorded
              </span>
            </div>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => onAddEntryForDate(selectedDate)}
            >
              <Plus size={12} /> Log entry for this day
            </button>
          </div>

          <div className="details-entries-list">
            {selectedDayEntries.length === 0 ? (
              <div className="details-empty">
                No logs recorded for this day. Click the button above to add one.
              </div>
            ) : (
              selectedDayEntries.map(entry => (
                <div 
                  key={entry.id} 
                  className="details-entry-card"
                  onClick={() => onRowClick(entry)}
                >
                  <div className="entry-card-content">
                    {tracker.fields.map(field => {
                      const val = entry.data[field.id];
                      if (val === undefined || val === null || val === '') return null;
                      return (
                        <div key={field.id} className="entry-card-field">
                          <span className="field-name">{field.name}:</span>
                          <span className="field-val">
                            {field.type === TRACKER_FIELD_TYPES.BOOLEAN ? (val ? 'Yes' : 'No') : String(val)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <button className="details-entry-edit-btn" title="Edit Entry">
                    <Edit2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
