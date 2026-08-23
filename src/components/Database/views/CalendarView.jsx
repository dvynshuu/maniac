import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
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
    <div className="calendar-view-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', paddingBottom: '16px' }}>
      {/* Calendar Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {monthNames[month]} {year}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
            <button
              onClick={prevMonth}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={goToday}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {dateProperties.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>Date field:</span>
            <select
              value={selectedDatePropId}
              onChange={(e) => setSelectedDatePropId(e.target.value)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                padding: '3px 8px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {dateProperties.map(p => (
                <option key={p.id} value={p.id}>{p.name || 'Date'}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Day of Week Headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border-subtle)', borderRadius: '8px 8px 0 0', overflow: 'hidden' }}>
        {dayHeaders.map(day => (
          <div 
            key={day} 
            style={{ 
              padding: '8px', 
              textAlign: 'center', 
              fontSize: '11px', 
              fontWeight: 600, 
              color: 'var(--text-tertiary)', 
              background: 'var(--bg-secondary)' 
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '1px', 
          background: 'var(--border-subtle)', 
          borderRadius: '0 0 8px 8px', 
          overflow: 'hidden' 
        }}
      >
        {/* Empty cells before month start */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} style={{ background: 'rgba(255, 255, 255, 0.01)', minHeight: '90px' }} />
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
              style={{
                background: isToday ? 'rgba(99, 102, 241, 0.04)' : 'var(--bg-primary)',
                minHeight: '90px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget.querySelector('.cal-add-btn');
                if (btn) btn.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget.querySelector('.cal-add-btn');
                if (btn) btn.style.opacity = '0';
              }}
            >
              {/* Day Number Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: isToday ? 700 : 500,
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: isToday ? 'var(--accent-primary)' : 'transparent',
                    color: isToday ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  {dayNum}
                </span>

                <button
                  className="cal-add-btn"
                  onClick={() => handleAddOnDate(dayNum)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: '2px',
                    opacity: 0,
                    transition: 'opacity 0.15s ease'
                  }}
                  title="Add row on this date"
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Scheduled Cards for this Day */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', maxHeight: '90px' }}>
                {dayRows.map(row => {
                  const title = row.values[titleProp.id] || 'Untitled';
                  return (
                    <div
                      key={row.id}
                      onClick={() => onOpenRow(row)}
                      style={{
                        padding: '3px 6px',
                        borderRadius: '4px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
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
