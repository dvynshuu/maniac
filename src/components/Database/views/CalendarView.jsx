import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PROPERTY_TYPES } from '../../../utils/constants';

export default function CalendarView({ 
  schema, 
  rows, 
  blockId, 
  onUpdateCell, 
  onUpdateCellImmediate, 
  onAddRow, 
  onOpenRow 
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Find date property
  const dateProperties = useMemo(() => {
    return schema.filter(p => p.type === PROPERTY_TYPES.DATE);
  }, [schema]);

  const [selectedDatePropId, setSelectedDatePropId] = useState(
    dateProperties[0]?.id || schema.find(p => p.name?.toLowerCase().includes('date'))?.id || schema[0]?.id
  );

  const dateProperty = useMemo(() => {
    return schema.find(p => p.id === selectedDatePropId) || dateProperties[0];
  }, [schema, selectedDatePropId, dateProperties]);

  const titleProp = schema[0] || { id: 'title', name: 'Name' };

  // Calendar math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // Map rows by YYYY-MM-DD
  const rowsByDate = useMemo(() => {
    const map = {};
    if (!dateProperty) return map;

    rows.forEach(r => {
      const val = r.values[dateProperty.id];
      if (!val) return;

      let dateKey = '';
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          dateKey = `${y}-${m}-${day}`;
        }
      } catch {}

      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(r);
      }
    });

    return map;
  }, [rows, dateProperty]);

  const handleAddOnDate = (dayNum) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    const dateString = `${year}-${formattedMonth}-${formattedDay}`;

    const overrides = dateProperty ? { [dateProperty.id]: dateString } : {};
    onAddRow(overrides);
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  return (
    <div className="calendar-view-container">
      {/* Calendar Controls */}
      <div className="calendar-subtoolbar">
        <div className="calendar-nav-group">
          <h4 className="calendar-month-title">
            {monthNames[month]} {year}
          </h4>
          <div className="calendar-nav-btns">
            <button onClick={prevMonth} className="calendar-nav-btn" title="Previous month">
              <ChevronLeft size={14} />
            </button>
            <button onClick={goToday} className="calendar-today-btn">
              Today
            </button>
            <button onClick={nextMonth} className="calendar-nav-btn" title="Next month">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {dateProperties.length > 1 && (
          <div className="calendar-date-prop-select-wrap">
            <span>Date field:</span>
            <select
              value={selectedDatePropId}
              onChange={(e) => setSelectedDatePropId(e.target.value)}
              className="calendar-date-prop-select"
            >
              {dateProperties.map(p => (
                <option key={p.id} value={p.id}>{p.name || 'Date'}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Day of Week Headers */}
      <div className="calendar-week-header-grid">
        {dayHeaders.map(day => (
          <div key={day} className="calendar-week-header-cell">
            {day}
          </div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="calendar-days-grid">
        {/* Empty cells before month start */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-day-cell empty" />
        ))}

        {/* Days of current month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const formattedMonth = String(month + 1).padStart(2, '0');
          const formattedDay = String(dayNum).padStart(2, '0');
          const dateKey = `${year}-${formattedMonth}-${formattedDay}`;
          const isToday = dateKey === todayStr;
          const dayRows = rowsByDate[dateKey] || [];

          return (
            <div
              key={dayNum}
              className={`calendar-day-cell ${isToday ? 'is-today' : ''}`}
            >
              {/* Day Number Header */}
              <div className="calendar-day-header">
                <span className={`calendar-day-number ${isToday ? 'today-pill' : ''}`}>
                  {dayNum}
                </span>

                <button
                  className="calendar-day-add-btn"
                  onClick={() => handleAddOnDate(dayNum)}
                  title="Add row on this date"
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Scheduled Cards for this Day */}
              <div className="calendar-day-cards">
                {dayRows.map(row => {
                  const title = row.values[titleProp.id] || 'Untitled';
                  return (
                    <div
                      key={row.id}
                      onClick={() => onOpenRow(row)}
                      className="calendar-event-card"
                      title={title}
                    >
                      {title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
