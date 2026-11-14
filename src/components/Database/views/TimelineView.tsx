import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, 
  Plus, Clock, ArrowRight, CheckCircle2, Circle 
} from 'lucide-react';
import { PROPERTY_TYPES } from '../../../utils/constants';

interface TimelineViewProps {
  schema: any[];
  rows: any[];
  blockId: string;
  onUpdateCell: (blockId: string, rowId: string, propId: string, val: any) => void;
  onUpdateCellImmediate: (blockId: string, rowId: string, propId: string, val: any) => void;
  onAddRow: (overrides?: any) => Promise<any>;
  onOpenRow: (row: any) => void;
}

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

export default function TimelineView({
  schema,
  rows,
  blockId,
  onUpdateCell,
  onUpdateCellImmediate,
  onAddRow,
  onOpenRow
}: TimelineViewProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [timelineStart, setTimelineStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const titleProp = schema[0] || { id: 'title', name: 'Name' };
  const dateProps = schema.filter(p => p.type === PROPERTY_TYPES.DATE);
  const statusProp = schema.find(p => p.type === PROPERTY_TYPES.STATUS);

  const [datePropId, setDatePropId] = useState<string>(
    dateProps[0]?.id || ''
  );

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Time metrics by zoom level
  const { columnCount, columnWidthMs, columnHeaderFormat, colWidthPx } = useMemo(() => {
    switch (zoom) {
      case 'day':
        return {
          columnCount: 30,
          columnWidthMs: 24 * 60 * 60 * 1000,
          colWidthPx: 60,
          columnHeaderFormat: (d: Date) => ({
            primary: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
            secondary: d.getDate().toString()
          })
        };
      case 'week':
        return {
          columnCount: 20,
          columnWidthMs: 7 * 24 * 60 * 60 * 1000,
          colWidthPx: 110,
          columnHeaderFormat: (d: Date) => ({
            primary: d.toLocaleDateString(undefined, { month: 'short' }),
            secondary: `Week ${Math.ceil(d.getDate() / 7)}`
          })
        };
      case 'month':
        return {
          columnCount: 16,
          columnWidthMs: 30 * 24 * 60 * 60 * 1000,
          colWidthPx: 140,
          columnHeaderFormat: (d: Date) => ({
            primary: d.toLocaleDateString(undefined, { year: '2-digit' }),
            secondary: d.toLocaleDateString(undefined, { month: 'short' })
          })
        };
      case 'quarter':
        return {
          columnCount: 12,
          columnWidthMs: 90 * 24 * 60 * 60 * 1000,
          colWidthPx: 160,
          columnHeaderFormat: (d: Date) => ({
            primary: d.getFullYear().toString(),
            secondary: `Q${Math.floor(d.getMonth() / 3) + 1}`
          })
        };
    }
  }, [zoom]);

  // Generate timeline columns
  const columns = useMemo(() => {
    const list: { date: Date; primary: string; secondary: string; isToday: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < columnCount; i++) {
      const d = new Date(timelineStart.getTime() + i * columnWidthMs);
      const isToday = Math.abs(d.getTime() - today.getTime()) < columnWidthMs / 2;
      const formatted = columnHeaderFormat(d);
      list.push({ date: d, ...formatted, isToday });
    }
    return list;
  }, [timelineStart, columnCount, columnWidthMs, columnHeaderFormat]);

  const totalWidthPx = columnCount * colWidthPx;
  const startTimeMs = timelineStart.getTime();
  const totalDurationMs = columnCount * columnWidthMs;

  // Compute row bar positions
  const rowBars = useMemo(() => {
    return rows.map((row, idx) => {
      const title = row.values[titleProp.id] || 'Untitled Task';
      const rawDate = datePropId ? row.values[datePropId] : null;
      let startMs = 0;
      let endMs = 0;

      if (rawDate) {
        if (typeof rawDate === 'object' && rawDate.start) {
          startMs = new Date(rawDate.start).getTime();
          endMs = rawDate.end ? new Date(rawDate.end).getTime() : startMs + 24 * 60 * 60 * 1000;
        } else {
          startMs = new Date(rawDate).getTime();
          endMs = startMs + 2 * 24 * 60 * 60 * 1000; // default 2 days span
        }
      } else {
        // Fallback to row creation time
        startMs = row.createdAt || (startTimeMs + idx * 24 * 60 * 60 * 1000);
        endMs = startMs + 3 * 24 * 60 * 60 * 1000;
      }

      if (isNaN(startMs)) startMs = startTimeMs;
      if (isNaN(endMs) || endMs <= startMs) endMs = startMs + 24 * 60 * 60 * 1000;

      const leftPx = Math.max(0, ((startMs - startTimeMs) / totalDurationMs) * totalWidthPx);
      const widthPx = Math.max(40, ((endMs - startMs) / totalDurationMs) * totalWidthPx);

      const statusVal = statusProp ? row.values[statusProp.id] : null;
      const isDone = String(statusVal || '').toLowerCase().includes('done') || String(statusVal || '').toLowerCase().includes('complete');

      return {
        row,
        title,
        startMs,
        endMs,
        leftPx,
        widthPx,
        statusVal,
        isDone,
        rowIndex: idx,
      };
    });
  }, [rows, titleProp.id, datePropId, startTimeMs, totalDurationMs, totalWidthPx, statusProp]);

  // Navigation handlers
  const handlePan = (direction: 'prev' | 'next') => {
    const shift = (columnWidthMs * (columnCount / 3)) * (direction === 'prev' ? -1 : 1);
    setTimelineStart(new Date(timelineStart.getTime() + shift));
  };

  const handleJumpToToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    d.setHours(0, 0, 0, 0);
    setTimelineStart(d);
  };

  return (
    <div className="db-timeline-container">
      {/* Timeline Controls Header */}
      <div className="db-timeline-toolbar">
        <div className="timeline-nav-group">
          <button 
            type="button" 
            className="timeline-tool-btn" 
            onClick={() => handlePan('prev')}
            title="Pan left"
          >
            <ChevronLeft size={14} />
          </button>
          <button 
            type="button" 
            className="timeline-tool-btn today-btn" 
            onClick={handleJumpToToday}
          >
            Today
          </button>
          <button 
            type="button" 
            className="timeline-tool-btn" 
            onClick={() => handlePan('next')}
            title="Pan right"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Date Property Selector */}
        {dateProps.length > 1 && (
          <div className="timeline-date-prop-select">
            <Calendar size={13} className="text-tertiary" />
            <select
              value={datePropId}
              onChange={(e) => setDatePropId(e.target.value)}
              className="timeline-select"
            >
              {dateProps.map(dp => (
                <option key={dp.id} value={dp.id}>{dp.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Zoom Selector */}
        <div className="timeline-zoom-group">
          {(['day', 'week', 'month', 'quarter'] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              type="button"
              className={`timeline-zoom-btn ${zoom === z ? 'active' : ''}`}
              onClick={() => setZoom(z)}
            >
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Layout: Left Table + Right Gantt Canvas */}
      <div className="db-timeline-workspace">
        {/* Left Side: Task Sidebar */}
        <div className="db-timeline-sidebar">
          <div className="sidebar-header">
            <span>Tasks ({rows.length})</span>
          </div>
          <div className="sidebar-body">
            {rowBars.map(({ row, title, statusVal, isDone }) => (
              <div 
                key={row.id} 
                className="sidebar-row-item"
                onClick={() => onOpenRow(row)}
              >
                <div className="item-title-group">
                  {isDone ? (
                    <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Circle size={13} className="text-tertiary flex-shrink-0" />
                  )}
                  <span className="item-title truncate">{title}</span>
                </div>
                {statusVal && (
                  <span className="item-status-chip">{String(statusVal)}</span>
                )}
              </div>
            ))}
            <div className="sidebar-add-row" onClick={() => onAddRow()}>
              <Plus size={13} />
              <span>Add item</span>
            </div>
          </div>
        </div>

        {/* Right Side: Scrollable Gantt Canvas */}
        <div className="db-timeline-canvas-scroll" ref={scrollContainerRef}>
          <div className="db-timeline-canvas" style={{ width: `${totalWidthPx}px` }}>
            {/* Header Columns Grid */}
            <div className="timeline-header-grid">
              {columns.map((col, idx) => (
                <div 
                  key={idx} 
                  className={`timeline-header-col ${col.isToday ? 'is-today' : ''}`}
                  style={{ width: `${colWidthPx}px` }}
                >
                  <span className="col-primary">{col.primary}</span>
                  <span className="col-secondary">{col.secondary}</span>
                </div>
              ))}
            </div>

            {/* Canvas Rows & Task Bars */}
            <div className="timeline-body-grid">
              {/* Vertical Column Lines */}
              <div className="timeline-grid-lines">
                {columns.map((col, idx) => (
                  <div 
                    key={idx} 
                    className={`timeline-grid-line ${col.isToday ? 'is-today-line' : ''}`}
                    style={{ left: `${idx * colWidthPx}px`, width: `${colWidthPx}px` }}
                  />
                ))}
              </div>

              {/* Task Bars Layer */}
              <div className="timeline-bars-layer">
                {rowBars.map(({ row, title, leftPx, widthPx, isDone, rowIndex }) => (
                  <div
                    key={row.id}
                    className="timeline-row-lane"
                    style={{ top: `${rowIndex * 40}px` }}
                  >
                    <div
                      className={`timeline-bar-pill ${isDone ? 'is-completed' : ''}`}
                      style={{
                        left: `${leftPx}px`,
                        width: `${widthPx}px`,
                      }}
                      onClick={() => onOpenRow(row)}
                    >
                      <span className="bar-label truncate">{title}</span>
                      <div className="bar-resize-handle" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
