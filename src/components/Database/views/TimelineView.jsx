/**
 * ─── Timeline View (Gantt) ──────────────────────────────────────
 * Horizontal timeline with rows as bars spanning start→end dates.
 */

import React, { useState, useMemo, useRef } from 'react';

const ZOOM_LEVELS = {
  day: { days: 30, colWidth: 40, format: (d) => d.getDate() },
  week: { days: 90, colWidth: 24, format: (d) => `W${Math.ceil(d.getDate() / 7)}` },
  month: { days: 365, colWidth: 80, format: (d) => d.toLocaleDateString('en', { month: 'short' }) },
};

function daysBetween(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export default function TimelineView({ schema, rows, blockId }) {
  const [zoom, setZoom] = useState('week');
  const scrollRef = useRef(null);

  const startProp = useMemo(() =>
    schema.find(p => p.type === 'date'),
  [schema]);

  const endProp = useMemo(() => {
    const datePros = schema.filter(p => p.type === 'date');
    return datePros.length > 1 ? datePros[1] : null;
  }, [schema]);

  const titleProp = useMemo(() =>
    schema.find(p => p.type === 'text') || schema[0],
  [schema]);

  const config = ZOOM_LEVELS[zoom];

  // Compute date range
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    const end = new Date(start);
    end.setDate(end.getDate() + config.days);
    return { start, end, totalDays: config.days };
  }, [config.days]);

  // Generate column headers
  const columns = useMemo(() => {
    const cols = [];
    const d = new Date(dateRange.start);
    const seen = new Set();
    while (d <= dateRange.end) {
      const label = config.format(new Date(d));
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!seen.has(label) || zoom === 'day') {
        seen.add(label);
        cols.push({ date: new Date(d), label, key });
      }
      d.setDate(d.getDate() + (zoom === 'month' ? 30 : zoom === 'week' ? 7 : 1));
    }
    return cols;
  }, [dateRange, config, zoom]);

  if (!startProp) {
    return (
      <div style={{ padding: '24px', color: 'var(--text-tertiary)', fontSize: '13px', textAlign: 'center' }}>
        Add at least one <strong>Date</strong> property to use Timeline view.
        <br />For duration bars, add two Date properties (start and end).
      </div>
    );
  }

  const totalWidth = columns.length * config.colWidth;

  return (
    <div className="timeline-view">
      <div className="timeline-controls">
        {Object.keys(ZOOM_LEVELS).map(z => (
          <button
            key={z}
            className={`timeline-zoom-btn ${zoom === z ? 'active' : ''}`}
            onClick={() => setZoom(z)}
          >
            {z.charAt(0).toUpperCase() + z.slice(1)}
          </button>
        ))}
      </div>

      <div className="timeline-scroll" ref={scrollRef}>
        <div className="timeline-content" style={{ minWidth: totalWidth }}>
          {/* Header */}
          <div className="timeline-header">
            <div className="timeline-label-col">Item</div>
            <div className="timeline-cols">
              {columns.map(col => (
                <div key={col.key} className="timeline-col-header" style={{ width: config.colWidth }}>
                  {col.label}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {rows.map(row => {
            const startVal = row.values[startProp.id];
            const endVal = endProp ? row.values[endProp.id] : null;
            const startDate = startVal ? new Date(startVal) : null;
            const endDate = endVal ? new Date(endVal) : startDate;

            let barStyle = { display: 'none' };
            if (startDate) {
              const offsetDays = daysBetween(dateRange.start, startDate);
              const durationDays = endDate ? Math.max(1, daysBetween(startDate, endDate)) : 1;
              barStyle = {
                display: 'block',
                position: 'absolute',
                left: offsetDays * (totalWidth / dateRange.totalDays),
                width: durationDays * (totalWidth / dateRange.totalDays),
                height: 24,
                top: 4,
              };
            }

            return (
              <div key={row.id} className="timeline-row">
                <div className="timeline-label-col timeline-row-label">
                  {titleProp ? (row.values[titleProp.id] || 'Untitled') : 'Row'}
                </div>
                <div className="timeline-cols" style={{ position: 'relative', height: 32 }}>
                  {startDate && (
                    <div className="timeline-bar" style={barStyle}>
                      <span className="timeline-bar-text">
                        {titleProp ? (row.values[titleProp.id] || '') : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
