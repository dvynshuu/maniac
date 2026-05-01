/**
 * ─── Calendar View ──────────────────────────────────────────────
 * Monthly calendar grid. Rows placed on their Date property's date.
 */

import React, { useState, useMemo } from 'react';
import { useDatabaseStore } from '../../../stores/databaseStore';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarView({ schema, rows, blockId, datePropertyId }) {
  const updateCellImmediate = useDatabaseStore(s => s.updateCellImmediate);
  const addRow = useDatabaseStore(s => s.addRow);

  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const dateProp = useMemo(() =>
    schema.find(p => p.id === datePropertyId) || schema.find(p => p.type === 'date'),
  [schema, datePropertyId]);

  const titleProp = useMemo(() =>
    schema.find(p => p.type === 'text') || schema[0],
  [schema]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const isToday = (d) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  // Map rows to their dates
  const rowsByDate = useMemo(() => {
    if (!dateProp) return {};
    const map = {};
    for (const row of rows) {
      const dateVal = row.values[dateProp.id];
      if (!dateVal) continue;
      const d = new Date(dateVal);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(row);
      }
    }
    return map;
  }, [rows, dateProp, year, month]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const handleDayClick = async (day) => {
    if (!dateProp) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const newRow = await addRow(blockId, { values: { [dateProp.id]: dateStr } });
  };

  // Build calendar grid cells
  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="cal-cell cal-cell-empty" />);
  }
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dayRows = rowsByDate[d] || [];
    cells.push(
      <div
        key={d}
        className={`cal-cell ${isToday(d) ? 'cal-cell-today' : ''}`}
        onClick={() => handleDayClick(d)}
      >
        <div className="cal-day-number">{d}</div>
        <div className="cal-day-events">
          {dayRows.slice(0, 3).map(row => (
            <div key={row.id} className="cal-event">
              {titleProp ? (row.values[titleProp.id] || 'Untitled') : 'Row'}
            </div>
          ))}
          {dayRows.length > 3 && (
            <div className="cal-event-more">+{dayRows.length - 3} more</div>
          )}
        </div>
      </div>
    );
  }

  if (!dateProp) {
    return (
      <div style={{ padding: '24px', color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center' }}>
        Add a <strong>Date</strong> property to use Calendar view.
      </div>
    );
  }

  return (
    <div className="calendar-view">
      <div className="cal-header">
        <button className="cal-nav-btn" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span className="cal-title">{MONTHS[month]} {year}</span>
        <button className="cal-nav-btn" onClick={nextMonth}><ChevronRight size={16} /></button>
        <button className="cal-today-btn" onClick={goToday}>Today</button>
      </div>
      <div className="cal-weekdays">
        {DAYS.map(d => <div key={d} className="cal-weekday">{d}</div>)}
      </div>
      <div className="cal-grid">
        {cells}
      </div>
    </div>
  );
}
