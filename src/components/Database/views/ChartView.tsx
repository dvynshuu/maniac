import React, { useState, useMemo } from 'react';
import { 
  BarChart2, TrendingUp, PieChart, Filter, 
  Layers, Hash, Calculator, ArrowUpRight 
} from 'lucide-react';
import { PROPERTY_TYPES } from '../../../utils/constants';

interface ChartViewProps {
  schema: any[];
  rows: any[];
  blockId: string;
  onUpdateCell?: any;
  onUpdateCellImmediate?: any;
  onAddRow?: any;
  onOpenRow?: (row: any) => void;
}

type ChartType = 'bar' | 'line' | 'donut';
type AggregationType = 'count' | 'sum' | 'avg' | 'min' | 'max';

const CHART_PALETTE = [
  '#6366f1', // Indigo
  '#38bdf8', // Sky
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#f43f5e', // Rose
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

export default function ChartView({ schema, rows, blockId, onOpenRow }: ChartViewProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');

  // Candidate group-by properties
  const groupableProps = useMemo(() => {
    return schema.filter(p => [
      PROPERTY_TYPES.STATUS,
      PROPERTY_TYPES.SELECT,
      PROPERTY_TYPES.MULTI_SELECT,
      PROPERTY_TYPES.TEXT,
      PROPERTY_TYPES.CHECKBOX,
      PROPERTY_TYPES.DATE,
    ].includes(p.type));
  }, [schema]);

  // Candidate numeric metric properties
  const numericProps = useMemo(() => {
    return schema.filter(p => [
      PROPERTY_TYPES.NUMBER,
      PROPERTY_TYPES.ROLLUP,
      PROPERTY_TYPES.FORMULA,
    ].includes(p.type));
  }, [schema]);

  const [groupByPropId, setGroupByPropId] = useState<string>(
    groupableProps[0]?.id || schema[0]?.id || ''
  );

  const [aggregation, setAggregation] = useState<AggregationType>('count');
  const [metricPropId, setMetricPropId] = useState<string>(
    numericProps[0]?.id || ''
  );

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const groupByProp = schema.find(p => p.id === groupByPropId) || groupableProps[0];
  const metricProp = schema.find(p => p.id === metricPropId);

  // Perform aggregations
  const aggregatedData = useMemo(() => {
    if (!groupByProp) return [];

    const groupMap = new Map<string, { label: string; values: number[]; rowCount: number }>();

    for (const row of rows) {
      let rawKey = row.values[groupByProp.id];
      if (rawKey === undefined || rawKey === null || rawKey === '') {
        rawKey = 'Empty / None';
      } else if (Array.isArray(rawKey)) {
        rawKey = rawKey.length > 0 ? rawKey.join(', ') : 'Empty / None';
      } else if (typeof rawKey === 'boolean') {
        rawKey = rawKey ? 'Yes' : 'No';
      } else {
        rawKey = String(rawKey);
      }

      if (!groupMap.has(rawKey)) {
        groupMap.set(rawKey, { label: rawKey, values: [], rowCount: 0 });
      }

      const entry = groupMap.get(rawKey)!;
      entry.rowCount++;

      if (metricProp) {
        const num = parseFloat(row.values[metricProp.id]);
        if (!isNaN(num)) entry.values.push(num);
      }
    }

    const items = Array.from(groupMap.values()).map(g => {
      let val = 0;
      if (aggregation === 'count') {
        val = g.rowCount;
      } else if (g.values.length > 0) {
        if (aggregation === 'sum') {
          val = g.values.reduce((a, b) => a + b, 0);
        } else if (aggregation === 'avg') {
          val = g.values.reduce((a, b) => a + b, 0) / g.values.length;
        } else if (aggregation === 'min') {
          val = Math.min(...g.values);
        } else if (aggregation === 'max') {
          val = Math.max(...g.values);
        }
      }
      return {
        label: g.label,
        value: Math.round(val * 100) / 100,
        count: g.rowCount,
      };
    });

    return items;
  }, [rows, groupByProp, metricProp, aggregation]);

  const totalSum = useMemo(() => {
    return aggregatedData.reduce((sum, item) => sum + item.value, 0);
  }, [aggregatedData]);

  const maxVal = useMemo(() => {
    const m = Math.max(...aggregatedData.map(d => d.value), 1);
    return m;
  }, [aggregatedData]);

  return (
    <div className="db-chart-view-container">
      {/* Chart Config Header */}
      <div className="db-chart-toolbar">
        {/* Chart Type Selector */}
        <div className="chart-type-tabs">
          <button
            type="button"
            className={`chart-type-tab ${chartType === 'bar' ? 'active' : ''}`}
            onClick={() => setChartType('bar')}
            title="Bar Chart"
          >
            <BarChart2 size={13} />
            <span>Bar</span>
          </button>
          <button
            type="button"
            className={`chart-type-tab ${chartType === 'line' ? 'active' : ''}`}
            onClick={() => setChartType('line')}
            title="Line Chart"
          >
            <TrendingUp size={13} />
            <span>Line</span>
          </button>
          <button
            type="button"
            className={`chart-type-tab ${chartType === 'donut' ? 'active' : ''}`}
            onClick={() => setChartType('donut')}
            title="Donut Chart"
          >
            <PieChart size={13} />
            <span>Donut</span>
          </button>
        </div>

        {/* Group By Selector */}
        <div className="chart-control-item">
          <span className="control-label">Group By:</span>
          <select
            value={groupByPropId}
            onChange={(e) => setGroupByPropId(e.target.value)}
            className="chart-select"
          >
            {groupableProps.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Metric / Calculation Selector */}
        <div className="chart-control-item">
          <span className="control-label">Metric:</span>
          <select
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value as AggregationType)}
            className="chart-select"
          >
            <option value="count">Count Rows</option>
            {numericProps.length > 0 && (
              <>
                <option value="sum">Sum</option>
                <option value="avg">Average</option>
                <option value="max">Maximum</option>
                <option value="min">Minimum</option>
              </>
            )}
          </select>
        </div>

        {aggregation !== 'count' && numericProps.length > 0 && (
          <div className="chart-control-item">
            <span className="control-label">Property:</span>
            <select
              value={metricPropId}
              onChange={(e) => setMetricPropId(e.target.value)}
              className="chart-select"
            >
              {numericProps.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary KPI Metrics */}
      <div className="chart-kpi-row">
        <div className="kpi-card">
          <span className="kpi-label">TOTAL {aggregation.toUpperCase()}</span>
          <span className="kpi-val">{totalSum.toLocaleString()}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">CATEGORIES</span>
          <span className="kpi-val">{aggregatedData.length}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">TOTAL ROWS</span>
          <span className="kpi-val">{rows.length}</span>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="db-chart-canvas-area">
        {aggregatedData.length === 0 ? (
          <div className="chart-empty-state">
            <span>No data available to chart. Add rows or adjust group settings.</span>
          </div>
        ) : chartType === 'bar' ? (
          /* ─── Bar Chart (SVG) ─── */
          <div className="chart-svg-wrapper">
            <svg viewBox="0 0 600 240" className="chart-svg">
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = 200 - pct * 160;
                return (
                  <g key={i}>
                    <line x1="50" y1={y} x2="580" y2={y} stroke="var(--color-border, #262626)" strokeDasharray="3 3" />
                    <text x="45" y={y + 3} textAnchor="end" fontSize="9" fill="var(--color-fg-tertiary, #71717a)" fontFamily="monospace">
                      {Math.round(maxVal * pct)}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {aggregatedData.map((d, idx) => {
                const barWidth = Math.min(48, Math.max(16, (500 / aggregatedData.length) - 12));
                const spacing = 510 / aggregatedData.length;
                const x = 60 + idx * spacing + (spacing - barWidth) / 2;
                const barHeight = maxVal > 0 ? (d.value / maxVal) * 160 : 0;
                const y = 200 - barHeight;
                const color = CHART_PALETTE[idx % CHART_PALETTE.length];
                const isHovered = hoveredIndex === idx;

                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx={4}
                      fill={color}
                      opacity={isHovered ? 1 : 0.85}
                      style={{ transition: 'all 0.2s ease' }}
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill="var(--color-fg, #fafafa)"
                      fontFamily="monospace"
                    >
                      {d.value}
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y="220"
                      textAnchor="middle"
                      fontSize="10"
                      fill={isHovered ? 'var(--color-fg, #fafafa)' : 'var(--color-fg-secondary, #a1a1aa)'}
                      className="truncate"
                    >
                      {d.label.length > 8 ? d.label.slice(0, 7) + '…' : d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : chartType === 'line' ? (
          /* ─── Line Chart (SVG) ─── */
          <div className="chart-svg-wrapper">
            <svg viewBox="0 0 600 240" className="chart-svg">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = 200 - pct * 160;
                return (
                  <g key={i}>
                    <line x1="50" y1={y} x2="580" y2={y} stroke="var(--color-border, #262626)" strokeDasharray="3 3" />
                    <text x="45" y={y + 3} textAnchor="end" fontSize="9" fill="var(--color-fg-tertiary, #71717a)" fontFamily="monospace">
                      {Math.round(maxVal * pct)}
                    </text>
                  </g>
                );
              })}

              {/* Compute Points */}
              {(() => {
                const points = aggregatedData.map((d, idx) => {
                  const spacing = 510 / Math.max(1, aggregatedData.length - 1);
                  const x = 60 + idx * spacing;
                  const y = 200 - (maxVal > 0 ? (d.value / maxVal) * 160 : 0);
                  return { x, y, ...d };
                });

                const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');
                const areaPoints = `60,200 ${polyPoints} ${points[points.length - 1]?.x || 60},200`;

                return (
                  <>
                    <polygon points={areaPoints} fill="rgba(99, 102, 241, 0.12)" />
                    <polyline points={polyPoints} fill="none" stroke="#6366f1" strokeWidth="2.5" />
                    {points.map((p, idx) => (
                      <g key={idx} onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={hoveredIndex === idx ? 6 : 4}
                          fill="#6366f1"
                          stroke="var(--color-surface-1, #000)"
                          strokeWidth="2"
                        />
                        <text
                          x={p.x}
                          y={p.y - 8}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="600"
                          fill="var(--color-fg, #fafafa)"
                          fontFamily="monospace"
                        >
                          {p.value}
                        </text>
                        <text
                          x={p.x}
                          y="220"
                          textAnchor="middle"
                          fontSize="10"
                          fill="var(--color-fg-secondary, #a1a1aa)"
                        >
                          {p.label.length > 8 ? p.label.slice(0, 7) + '…' : p.label}
                        </text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        ) : (
          /* ─── Donut Chart (SVG) ─── */
          <div className="chart-donut-wrapper">
            <svg viewBox="0 0 240 240" className="donut-svg">
              {(() => {
                let cumulativeAngle = 0;
                const radius = 80;
                const cx = 120;
                const cy = 120;
                const strokeWidth = 32;

                return aggregatedData.map((d, idx) => {
                  const fraction = totalSum > 0 ? d.value / totalSum : 0;
                  const angle = fraction * 360;
                  const startAngle = cumulativeAngle;
                  cumulativeAngle += angle;

                  const circumference = 2 * Math.PI * radius;
                  const strokeDasharray = `${(angle / 360) * circumference} ${circumference}`;
                  const strokeDashoffset = -((startAngle / 360) * circumference);
                  const color = CHART_PALETTE[idx % CHART_PALETTE.length];
                  const isHovered = hoveredIndex === idx;

                  return (
                    <circle
                      key={idx}
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill="transparent"
                      stroke={color}
                      strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      style={{
                        transform: 'rotate(-90deg)',
                        transformOrigin: `${cx}px ${cy}px`,
                        cursor: 'pointer',
                        transition: 'stroke-width 0.2s ease',
                      }}
                    />
                  );
                });
              })()}
              <text x="120" y="115" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--color-fg, #fafafa)" fontFamily="monospace">
                {hoveredIndex !== null ? aggregatedData[hoveredIndex]?.value : totalSum}
              </text>
              <text x="120" y="132" textAnchor="middle" fontSize="10" fill="var(--color-fg-tertiary, #71717a)">
                {hoveredIndex !== null ? aggregatedData[hoveredIndex]?.label : 'Total'}
              </text>
            </svg>

            {/* Donut Legend */}
            <div className="donut-legend-list">
              {aggregatedData.map((d, idx) => {
                const color = CHART_PALETTE[idx % CHART_PALETTE.length];
                const pct = totalSum > 0 ? Math.round((d.value / totalSum) * 100) : 0;
                return (
                  <div
                    key={idx}
                    className={`legend-item ${hoveredIndex === idx ? 'active' : ''}`}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <span className="legend-color-dot" style={{ backgroundColor: color }} />
                    <span className="legend-name truncate">{d.label}</span>
                    <span className="legend-metric font-mono">{d.value}</span>
                    <span className="legend-pct text-tertiary">({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
