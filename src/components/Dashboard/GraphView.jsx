import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useBacklinkStore } from '../../stores/backlinkStore';
import { useNavigate } from 'react-router-dom';
import { Maximize2, Minimize2, Network } from 'lucide-react';

// ─── Color palette ───────────────────────────────────────────────
const PALETTE = {
  nodePrimary: '#6366F1',     // indigo-500
  nodeSecondary: '#8B5CF6',   // violet-500
  nodeFavorite: '#F59E0B',    // amber-500
  nodeOrphan: '#64748B',      // slate-500
  linkDefault: 'rgba(99, 102, 241, 0.12)',
  linkHighlight: 'rgba(139, 92, 246, 0.6)',
  labelBg: 'rgba(15, 15, 20, 0.88)',
  labelText: 'rgba(243, 243, 244, 0.95)',
  gridLine: 'rgba(255, 255, 255, 0.018)',
  particleColor: '#A78BFA',
};

export default function GraphView({ pages }) {
  const navigate = useNavigate();
  const forwardLinks = useBacklinkStore(s => s.forwardLinks);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const fullscreenGraphRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);

  // ─── Resize Observer ─────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || isFullscreen) return;

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setWidth(entries[0].contentRect.width);
        setHeight(entries[0].contentRect.height);
      }
    });
    observer.observe(containerRef.current);

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setWidth(rect.width);
      setHeight(rect.height);
    }

    return () => observer.disconnect();
  }, [isFullscreen]);

  // ─── Build Graph Data ────────────────────────────────────────
  const graphData = useMemo(() => {
    const activePages = pages.filter(p => !p.isArchived);
    const validNodeIds = new Set(activePages.map(n => n.id));
    
    const links = [];
    
    // Add forward links (explicit @ mentions in blocks)
    Object.entries(forwardLinks).forEach(([source, targets]) => {
      if (validNodeIds.has(source)) {
        targets.forEach(target => {
          if (validNodeIds.has(target)) {
            links.push({ source, target });
          }
        });
      }
    });

    // Add structural links (parent -> child hierarchy)
    activePages.forEach(p => {
      if (p.parentId && validNodeIds.has(p.parentId)) {
        // Prevent duplicate links if a parent also mentions its child explicitly
        const exists = links.some(l => l.source === p.parentId && l.target === p.id);
        if (!exists) {
          links.push({ source: p.parentId, target: p.id, isStructural: true });
        }
      }
    });

    // Count connections per node for dynamic sizing
    const connectionCount = {};
    links.forEach(l => {
      connectionCount[l.source] = (connectionCount[l.source] || 0) + 1;
      connectionCount[l.target] = (connectionCount[l.target] || 0) + 1;
    });

    const nodes = activePages.map(p => {
      const conns = connectionCount[p.id] || 0;
      // Size nodes by connectivity: more connections = larger node
      const baseSize = 5;
      const connBoost = Math.min(conns * 2, 12);
      const favBoost = p.isFavorite ? 4 : 0;

      let color = PALETTE.nodePrimary;
      if (p.isFavorite) color = PALETTE.nodeFavorite;
      else if (conns === 0) color = PALETTE.nodeOrphan;
      else if (conns >= 3) color = PALETTE.nodeSecondary;

      return {
        id: p.id,
        name: p.title || 'Untitled',
        val: baseSize + connBoost + favBoost,
        color,
        icon: p.icon || '',
        isFavorite: p.isFavorite,
        connections: conns,
      };
    });

    return { nodes, links };
  }, [pages, forwardLinks]);

  // ─── Connected node set for hover highlighting ───────────────
  const highlightSet = useMemo(() => {
    if (!hoveredNode) return new Set();
    const set = new Set([hoveredNode]);
    graphData.links.forEach(l => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      if (sId === hoveredNode) set.add(tId);
      if (tId === hoveredNode) set.add(sId);
    });
    return set;
  }, [hoveredNode, graphData.links]);

  // ─── Custom Canvas: Background Grid ─────────────────────────
  const drawBackground = useCallback((ctx, globalScale) => {
    const gridSize = 40;
    ctx.strokeStyle = PALETTE.gridLine;
    ctx.lineWidth = 1 / globalScale;

    // Draw a subtle dot grid instead of lines for a more premium feel
    const t = ctx.getTransform();
    const visibleLeft = -t.e / t.a;
    const visibleTop = -t.f / t.d;
    const visibleRight = visibleLeft + ctx.canvas.width / t.a;
    const visibleBottom = visibleTop + ctx.canvas.height / t.d;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    const dotSize = 1.2 / globalScale;

    for (let x = Math.floor(visibleLeft / gridSize) * gridSize; x < visibleRight; x += gridSize) {
      for (let y = Math.floor(visibleTop / gridSize) * gridSize; y < visibleBottom; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  // ─── Custom Node Renderer ───────────────────────────────────
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.val) || node.val <= 0) return;

    const isHighlighted = highlightSet.has(node.id);
    const isHovered = hoveredNode === node.id;
    const isDimmed = hoveredNode && !isHighlighted;
    const radius = node.val / 2;
    const label = node.name;

    // ── Outer glow ring (always visible, subtle) ──
    if (!isDimmed) {
      const glowGrad = ctx.createRadialGradient(node.x, node.y, radius * 0.5, node.x, node.y, radius * 3);
      glowGrad.addColorStop(0, node.color + '30');
      glowGrad.addColorStop(1, node.color + '00');
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();
    }

    // ── Hover ring animation ──
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 4 / globalScale, 0, Math.PI * 2);
      ctx.strokeStyle = node.color + 'AA';
      ctx.lineWidth = 2 / globalScale;
      ctx.setLineDash([4 / globalScale, 4 / globalScale]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Node body with radial gradient ──
    const nodeGrad = ctx.createRadialGradient(
      node.x - radius * 0.3, node.y - radius * 0.3, 0,
      node.x, node.y, radius
    );
    nodeGrad.addColorStop(0, lightenColor(node.color, 40));
    nodeGrad.addColorStop(1, node.color);

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = nodeGrad;
    ctx.globalAlpha = isDimmed ? 0.15 : 1;
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Inner highlight dot (specular) ──
    if (!isDimmed) {
      ctx.beginPath();
      ctx.arc(node.x - radius * 0.25, node.y - radius * 0.25, radius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fill();
    }

    // ── Icon inside node (at higher zoom) ──
    if (globalScale > 1.2 && node.icon && !isDimmed) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const iconSize = Math.max(radius * 1.1, 8 / globalScale);
      ctx.font = `${iconSize}px sans-serif`;
      ctx.fillText(node.icon, node.x, node.y);
    }

    // ── Favorite star badge ──
    if (node.isFavorite && !isDimmed) {
      const badgeX = node.x + radius * 0.7;
      const badgeY = node.y - radius * 0.7;
      const badgeR = 3 / globalScale;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.nodeFavorite;
      ctx.fill();
      ctx.strokeStyle = '#0a0a0b';
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
    }

    // ── Label ──
    const showLabel = isHovered || isHighlighted || globalScale > 1.8;
    if (showLabel && !isDimmed) {
      const fontSize = Math.min(12 / globalScale, 5);
      ctx.font = `500 ${fontSize}px Inter, -apple-system, sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const padX = fontSize * 0.5;
      const padY = fontSize * 0.35;
      const bgW = textWidth + padX * 2;
      const bgH = fontSize + padY * 2;
      const labelY = node.y + radius + 6 / globalScale;

      // Label pill background
      ctx.beginPath();
      ctx.roundRect(node.x - bgW / 2, labelY, bgW, bgH, 3 / globalScale);
      ctx.fillStyle = PALETTE.labelBg;
      ctx.fill();

      // Accent left border on label
      ctx.beginPath();
      ctx.roundRect(node.x - bgW / 2, labelY, 2 / globalScale, bgH, [3 / globalScale, 0, 0, 3 / globalScale]);
      ctx.fillStyle = node.color;
      ctx.fill();

      // Label text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = PALETTE.labelText;
      ctx.fillText(label, node.x, labelY + bgH / 2);

      // Connection count badge
      if (node.connections > 0) {
        const countStr = String(node.connections);
        const countFontSize = fontSize * 0.75;
        ctx.font = `600 ${countFontSize}px Inter, sans-serif`;
        const countW = ctx.measureText(countStr).width + countFontSize * 0.6;
        const countH = countFontSize + countFontSize * 0.4;
        const countX = node.x + bgW / 2 + 3 / globalScale;
        const countY = labelY + (bgH - countH) / 2;

        ctx.beginPath();
        ctx.roundRect(countX, countY, countW, countH, 2 / globalScale);
        ctx.fillStyle = node.color + '33';
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = node.color;
        ctx.fillText(countStr, countX + countW / 2, countY + countH / 2);
      }
    }
  }, [hoveredNode, highlightSet]);

  // ─── Custom Link Renderer ──────────────────────────────────
  const linkCanvasObject = useCallback((link, ctx, globalScale) => {
    if (!link.source || !link.target || 
        !Number.isFinite(link.source.x) || !Number.isFinite(link.source.y) || 
        !Number.isFinite(link.target.x) || !Number.isFinite(link.target.y)) {
      return;
    }

    const sId = typeof link.source === 'object' ? link.source.id : link.source;
    const tId = typeof link.target === 'object' ? link.target.id : link.target;
    const isHighlighted = hoveredNode && highlightSet.has(sId) && highlightSet.has(tId);
    const isDimmed = hoveredNode && !isHighlighted;

    const sx = link.source.x, sy = link.source.y;
    const tx = link.target.x, ty = link.target.y;

    if (isDimmed) {
      ctx.globalAlpha = 0.04;
    }

    // Draw link as a gradient line
    const grad = ctx.createLinearGradient(sx, sy, tx, ty);
    const sourceNode = graphData.nodes.find(n => n.id === sId);
    const targetNode = graphData.nodes.find(n => n.id === tId);
    const sColor = sourceNode?.color || PALETTE.nodePrimary;
    const tColor = targetNode?.color || PALETTE.nodePrimary;

    if (isHighlighted) {
      grad.addColorStop(0, sColor + 'BB');
      grad.addColorStop(1, tColor + 'BB');
      ctx.lineWidth = 2 / globalScale;
    } else {
      grad.addColorStop(0, sColor + '25');
      grad.addColorStop(1, tColor + '25');
      ctx.lineWidth = 1 / globalScale;
    }

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = grad;
    ctx.stroke();

    // Draw directional arrow
    if (!isDimmed) {
      const arrowLen = 6 / globalScale;
      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const targetRadius = (targetNode?.val || 8) / 2;
        const ratio = (dist - targetRadius - 2 / globalScale) / dist;
        const ax = sx + dx * ratio;
        const ay = sy + dy * ratio;
        const angle = Math.atan2(dy, dx);

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(
          ax - arrowLen * Math.cos(angle - Math.PI / 7),
          ay - arrowLen * Math.sin(angle - Math.PI / 7)
        );
        ctx.lineTo(
          ax - arrowLen * Math.cos(angle + Math.PI / 7),
          ay - arrowLen * Math.sin(angle + Math.PI / 7)
        );
        ctx.closePath();
        ctx.fillStyle = isHighlighted ? (sColor + 'CC') : (sColor + '40');
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  }, [hoveredNode, highlightSet, graphData.nodes]);

  // ─── Event handlers ─────────────────────────────────────────
  const handleNodeClick = useCallback((node) => {
    navigate(`/page/${node.id}`);
    if (isFullscreen) setIsFullscreen(false);
  }, [navigate, isFullscreen]);

  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node?.id || null);
  }, []);

  // ─── Stats for header ───────────────────────────────────────
  const stats = useMemo(() => {
    const activeNodes = pages.filter(p => !p.isArchived).length;
    const totalEdges = graphData.links.length;
    return { activeNodes, totalEdges };
  }, [pages, graphData.links]);

  // ─── Shared graph props ─────────────────────────────────────
  const sharedGraphProps = {
    graphData,
    nodeCanvasObject,
    linkCanvasObject,
    linkCanvasObjectMode: () => 'replace',
    nodeRelSize: 6,
    onNodeClick: handleNodeClick,
    onNodeHover: handleNodeHover,
    onBackgroundClick: () => setHoveredNode(null),
    d3AlphaDecay: 0.04,
    d3VelocityDecay: 0.35,
    warmupTicks: 50,
    cooldownTicks: 150,
    enablePointerInteraction: true,
    onRenderFramePre: drawBackground,
  };

  return (
    <>
      {/* ─── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Network size={18} style={{ color: PALETTE.nodePrimary }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>Graph View</h3>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.04em' }}>
              {stats.activeNodes} NODES
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.04em' }}>
              {stats.totalEdges} EDGES
            </span>
          </div>
        </div>
        <button
          aria-label="Maximize Graph"
          onClick={() => setIsFullscreen(true)}
          style={{
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            borderRadius: '8px',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* ─── Inline Graph Canvas ────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.03) 0%, var(--bg-elevated) 70%)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '220px',
        }}
      >
        {width > 0 && height > 0 ? (
          <ForceGraph2D
            ref={graphRef}
            width={width}
            height={height}
            {...sharedGraphProps}
            onEngineStop={() => {
              if (graphRef.current) graphRef.current.zoomToFit(300, 30);
            }}
          />
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: PALETTE.nodePrimary, animation: 'pulse 1.5s infinite' }} />
            Initializing graph engine...
          </div>
        )}
      </div>

      {/* ─── Fullscreen Overlay ──────────────────────────────── */}
      {isFullscreen && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(8, 8, 12, 0.97)',
            backdropFilter: 'blur(20px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {/* ── Fullscreen Header ── */}
          <div style={{
            padding: '20px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '10px',
                background: `linear-gradient(135deg, ${PALETTE.nodePrimary}, ${PALETTE.nodeSecondary})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Network size={18} color="#fff" />
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                  Workspace Graph
                </h3>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', margin: 0 }}>
                  {stats.activeNodes} nodes · {stats.totalEdges} connections · Click a node to navigate
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Legend */}
              <div style={{ display: 'flex', gap: '16px', marginRight: '16px' }}>
                {[
                  { color: PALETTE.nodePrimary, label: 'Connected' },
                  { color: PALETTE.nodeFavorite, label: 'Favorite' },
                  { color: PALETTE.nodeOrphan, label: 'Orphan' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}44` }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>{item.label}</span>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setIsFullscreen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Minimize2 size={14} />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* ── Fullscreen Canvas ── */}
          <div style={{ flex: 1, position: 'relative' }}>
            <ForceGraph2D
              ref={fullscreenGraphRef}
              {...sharedGraphProps}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.25}
              onEngineStop={() => {
                if (fullscreenGraphRef.current) fullscreenGraphRef.current.zoomToFit(500, 80);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Utility: Lighten a hex color ──────────────────────────────
function lightenColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
  const b = Math.min(255, (num & 0x0000FF) + amount);
  return `rgb(${r}, ${g}, ${b})`;
}
