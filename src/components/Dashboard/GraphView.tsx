import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ForceGraph2D from 'react-force-graph-2d';

interface ForceGraphInstance {
  d3Force: (forceName: string) => any;
  zoomToFit: (durationMs?: number, padding?: number) => void;
}
import { useBacklinkStore } from '../../stores/backlinkStore';
import { useNavigate } from 'react-router-dom';
import { Maximize2, Minimize2, Network, Search, X, SlidersHorizontal, Layers, Focus } from 'lucide-react';
import { detectCommunities } from '../../utils/louvain';

// ─── Color Palette & Deterministic Generator ──────────────────────────────
const PALETTE = {
  nodePrimary: '#6366F1',     // indigo-500
  nodeSecondary: '#8B5CF6',   // violet-500 (Hub nodes)
  nodeFavorite: '#F59E0B',    // amber-500
  nodeOrphan: '#64748B',      // slate-500
  linkDefault: 'rgba(99, 102, 241, 0.15)',
  linkHighlight: 'rgba(139, 92, 246, 0.7)',
  labelBg: 'rgba(15, 15, 20, 0.92)',
  labelText: 'rgba(243, 243, 244, 0.95)',
  particleColor: '#A78BFA',
} as const;

// 24 Hand-tuned high-contrast hex colors for community detection
const COMMUNITY_PALETTE: readonly string[] = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#8B5CF6', // Violet
  '#F97316', // Orange
  '#3B82F6', // Blue
  '#14B8A6', // Teal
  '#84CC16', // Lime
  '#E11D48', // Rose
  '#D946EF', // Fuchsia
  '#0EA5E9', // Sky
  '#22C55E', // Green
  '#EAB308', // Yellow
  '#A855F7', // Purple
  '#F43F5E', // Red
  '#2DD4BF', // Mint
  '#FB7185', // Coral
  '#38BDF8', // Light Sky
  '#A3E635', // Light Lime
  '#C084FC', // Light Violet
  '#F472B6', // Light Pink
  '#94A3B8', // Slate
];

// Fallback deterministic HSL-to-Hex converter for >24 communities
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Ultra-fast cached color converters avoiding memory churn
const rgbaCache = new Map<string, string>();
function hexToRgba(hex: string, alpha: number): string {
  const key = `${hex}_${alpha}`;
  let cached = rgbaCache.get(key);
  if (cached) return cached;

  let c = hex.replace('#', '');
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const num = parseInt(c, 16);
  if (Number.isNaN(num)) return `rgba(99, 102, 241, ${alpha})`;

  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  cached = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  rgbaCache.set(key, cached);
  return cached;
}

const lightenCache = new Map<string, string>();
function lightenHex(hex: string, percent: number): string {
  const key = `${hex}_${percent}`;
  let cached = lightenCache.get(key);
  if (cached) return cached;

  let c = hex.replace('#', '');
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const num = parseInt(c, 16);
  if (Number.isNaN(num)) return hex;

  const r = Math.min(255, Math.round(((num >> 16) & 255) + (255 - ((num >> 16) & 255)) * (percent / 100)));
  const g = Math.min(255, Math.round(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * (percent / 100)));
  const b = Math.min(255, Math.round((num & 255) + (255 - (num & 255)) * (percent / 100)));
  cached = `rgb(${r}, ${g}, ${b})`;
  lightenCache.set(key, cached);
  return cached;
}

// Unescape HTML entities from titles
function unescapeTitle(str: string | undefined | null): string {
  if (!str) return 'Untitled';
  if (!str.includes('&')) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Safe canvas roundRect helper
function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

interface GraphPage {
  id: string;
  title?: string;
  icon?: string;
  parentId?: string | null;
  isFavorite?: boolean;
  isArchived?: boolean;
}

interface GraphNode {
  id: string;
  name: string;
  val: number;
  color: string;
  icon: string;
  isFavorite: boolean;
  connections: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  isStructural?: boolean;
  isSemantic?: boolean;
}

interface GraphViewProps {
  pages: GraphPage[];
}

export default function GraphView({ pages }: GraphViewProps) {
  const navigate = useNavigate();
  const forwardLinks = useBacklinkStore(s => s.forwardLinks);

  // Viewport dimensions
  const [inlineWidth, setInlineWidth] = useState(0);
  const [inlineHeight, setInlineHeight] = useState(0);
  const [fsWidth, setFsWidth] = useState(0);
  const [fsHeight, setFsHeight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  // Single active graph ref to prevent multi-engine coordinate mutation race conditions
  const inlineGraphRef = useRef<ForceGraphInstance | null>(null);
  const fullscreenGraphRef = useRef<ForceGraphInstance | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Auto-zoom control: only zoom once on initial load or reset, never override user dragging
  const hasInitialZoomedRef = useRef(false);

  // Interactive UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [linkFilter, setLinkFilter] = useState({ structural: true, semantic: true });
  const [colorMode, setColorMode] = useState<'standard' | 'community'>('standard');

  // ─── Inline Resize Observer ──────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || isFullscreen) return;

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          setInlineWidth(Math.floor(width));
          setInlineHeight(Math.floor(height));
        }
      }
    });
    observer.observe(containerRef.current);

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setInlineWidth(Math.floor(rect.width));
      setInlineHeight(Math.floor(rect.height));
    }

    return () => observer.disconnect();
  }, [isFullscreen]);

  // ─── Fullscreen Resize Handling ──────────────────────────────
  useEffect(() => {
    if (!isFullscreen) return;

    const updateFsSize = () => {
      if (fullscreenContainerRef.current) {
        const rect = fullscreenContainerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setFsWidth(Math.floor(rect.width));
          setFsHeight(Math.floor(rect.height));
        }
      } else {
        setFsWidth(window.innerWidth);
        setFsHeight(Math.max(200, window.innerHeight - 80));
      }
    };

    updateFsSize();
    window.addEventListener('resize', updateFsSize);

    // Escape key listener to close fullscreen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Lock background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('resize', updateFsSize);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  // ─── Configure Physics Forces on Active Graph ────────────────
  useEffect(() => {
    const activeRef = isFullscreen ? fullscreenGraphRef.current : inlineGraphRef.current;
    const activeW = isFullscreen ? fsWidth : inlineWidth;
    const activeH = isFullscreen ? fsHeight : inlineHeight;

    if (activeRef && activeW > 0 && activeH > 0) {
      // Repulsion force to give nodes breathing room
      activeRef.d3Force('charge')?.strength(-60);
      // Center mass force
      activeRef.d3Force('center')?.x(activeW / 2).y(activeH / 2);
    }
  }, [isFullscreen, inlineWidth, inlineHeight, fsWidth, fsHeight]);

  // Reset initial zoom flag on significant filter or data changes
  useEffect(() => {
    hasInitialZoomedRef.current = false;
  }, [pages.length, linkFilter, colorMode]);

  // ─── Build Graph Data with Full Determinism & Filtering ─────
  const { graphData, communityMetadata } = useMemo(() => {
    const activePages = pages.filter(p => !p.isArchived);
    const validNodeIds = new Set(activePages.map(n => n.id));

    const linksMap = new Map<string, GraphLink>();

    // 1. Add forward links (explicit @ mentions in blocks)
    Object.entries(forwardLinks).forEach(([source, targets]) => {
      if (validNodeIds.has(source)) {
        targets.forEach(target => {
          if (validNodeIds.has(target) && source !== target) {
            const key = `${source}->${target}`;
            linksMap.set(key, { source, target, isSemantic: true });
          }
        });
      }
    });

    // 2. Add structural links (parent -> child hierarchy) with proper dual-flagging
    activePages.forEach(p => {
      if (p.parentId && validNodeIds.has(p.parentId) && p.parentId !== p.id) {
        const key = `${p.parentId}->${p.id}`;
        const existing = linksMap.get(key);
        if (existing) {
          // If a mention already existed between parent and child, tag both
          existing.isStructural = true;
        } else {
          linksMap.set(key, { source: p.parentId, target: p.id, isStructural: true });
        }
      }
    });

    const allLinks = Array.from(linksMap.values());

    // 3. Filter links based on current user toggles
    const filteredLinks = allLinks.filter(l => {
      if (l.isStructural && l.isSemantic) return linkFilter.structural || linkFilter.semantic;
      if (l.isStructural) return linkFilter.structural;
      return linkFilter.semantic;
    });

    // 4. Run Louvain Community Detection
    const communities = colorMode === 'community'
      ? detectCommunities(activePages, filteredLinks)
      : {};

    const communityColors: Record<string, string> = {};
    const topCommunities: Array<{ id: string; color: string; count: number }> = [];

    if (colorMode === 'community') {
      const sizes: Record<string, number> = {};
      Object.values(communities).forEach(cId => {
        const key = String(cId);
        sizes[key] = (sizes[key] || 0) + 1;
      });

      const sortedComms = Object.keys(sizes).sort((a, b) => sizes[b] - sizes[a]);

      sortedComms.forEach((commId, idx) => {
        let color: string;
        if (sizes[commId] === 1) {
          color = PALETTE.nodeOrphan;
        } else if (idx < COMMUNITY_PALETTE.length) {
          color = COMMUNITY_PALETTE[idx];
        } else {
          const hue = (idx * 137.5) % 360;
          color = hslToHex(hue, 75, 60);
        }
        communityColors[commId] = color;
        if (sizes[commId] > 1 && topCommunities.length < 5) {
          topCommunities.push({ id: commId, color, count: sizes[commId] });
        }
      });
    }

    // 5. Count connections per node for dynamic sizing
    const connectionCount: Record<string, number> = {};
    filteredLinks.forEach(l => {
      const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      connectionCount[s] = (connectionCount[s] || 0) + 1;
      connectionCount[t] = (connectionCount[t] || 0) + 1;
    });

    // 6. Assemble Nodes
    const nodes: GraphNode[] = activePages.map(p => {
      const conns = connectionCount[p.id] || 0;
      const baseSize = 8;
      const connBoost = Math.min(conns * 2, 14);
      const favBoost = p.isFavorite ? 4 : 0;

      let color: string = PALETTE.nodePrimary;
      if (colorMode === 'community') {
        color = communityColors[communities[p.id]] || PALETTE.nodePrimary;
      } else {
        if (p.isFavorite) color = PALETTE.nodeFavorite;
        else if (conns === 0) color = PALETTE.nodeOrphan;
        else if (conns >= 3) color = PALETTE.nodeSecondary;
      }

      return {
        id: p.id,
        name: unescapeTitle(p.title),
        val: baseSize + connBoost + favBoost,
        color,
        icon: p.icon || '',
        isFavorite: Boolean(p.isFavorite),
        connections: conns,
      };
    });

    return {
      graphData: { nodes, links: filteredLinks },
      communityMetadata: { topCommunities },
    };
  }, [pages, forwardLinks, linkFilter, colorMode]);

  // Fast O(1) node lookup map for link render loop
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    graphData.nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [graphData.nodes]);

  // ─── Connected Node Set for Hover Highlighting ───────────────
  const highlightSet = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const set = new Set<string>([hoveredNode]);
    graphData.links.forEach(l => {
      const sId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      if (sId === hoveredNode) set.add(tId);
      if (tId === hoveredNode) set.add(sId);
    });
    return set;
  }, [hoveredNode, graphData.links]);

  // ─── Search Highlight Node Sets ──────────────────────────────
  const searchHighlightSets = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().trim();

    const matched = new Set<string>();
    graphData.nodes.forEach(n => {
      if (n.name.toLowerCase().includes(query)) {
        matched.add(n.id);
      }
    });

    const neighbors = new Set<string>();
    graphData.links.forEach(l => {
      const sId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      if (matched.has(sId) && !matched.has(tId)) neighbors.add(tId);
      if (matched.has(tId) && !matched.has(sId)) neighbors.add(sId);
    });

    return { matched, neighbors, all: new Set<string>([...matched, ...neighbors]) };
  }, [searchQuery, graphData]);

  // ─── Highly Optimized Dot Grid Canvas Background ────────────
  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
    // If zoomed out far, throttle or skip dot grid to prevent thread locking
    if (globalScale < 0.25) return;

    const gridSize = globalScale < 0.5 ? 80 : 40;
    const t = ctx.getTransform();
    const visibleLeft = -t.e / t.a;
    const visibleTop = -t.f / t.d;
    const visibleRight = visibleLeft + ctx.canvas.width / t.a;
    const visibleBottom = visibleTop + ctx.canvas.height / t.d;

    const startX = Math.floor(visibleLeft / gridSize) * gridSize;
    const endX = Math.ceil(visibleRight / gridSize) * gridSize;
    const startY = Math.floor(visibleTop / gridSize) * gridSize;
    const endY = Math.ceil(visibleBottom / gridSize) * gridSize;

    // Safety guard: max 3,000 dots per frame
    const countX = Math.round((endX - startX) / gridSize);
    const countY = Math.round((endY - startY) / gridSize);
    if (countX * countY > 3000) return;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    const dotSize = Math.max(1 / globalScale, 1.2 / globalScale);

    // Batch all dots into a single path and single fill call
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.rect(x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
      }
    }
    ctx.fill();
  }, []);

  // ─── Custom Node Renderer ───────────────────────────────────
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.val) || node.val <= 0) return;

    const isSearchActive = searchHighlightSets !== null;
    const isSearchMatch = isSearchActive && searchHighlightSets.matched.has(node.id);
    const isSearchNeighbor = isSearchActive && !isSearchMatch && searchHighlightSets.neighbors.has(node.id);
    const isSearchDimmed = isSearchActive && !isSearchMatch && !isSearchNeighbor;

    const isHighlighted = highlightSet.has(node.id);
    const isHovered = hoveredNode === node.id;
    const isHoverDimmed = Boolean(hoveredNode && !isHighlighted);

    const isDimmed = isSearchDimmed || (!isSearchActive && isHoverDimmed);

    const radius = node.val / 2;
    const label = node.name;

    // Outer glow ring (always visible, extra bright for search matches)
    if (!isDimmed) {
      const glowGrad = ctx.createRadialGradient(node.x, node.y, radius * 0.5, node.x, node.y, radius * 2.8);
      glowGrad.addColorStop(0, hexToRgba(node.color, isSearchMatch ? 0.75 : 0.22));
      glowGrad.addColorStop(1, hexToRgba(node.color, 0));
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();
    }

    // Search match crisp focus ring
    if (isSearchMatch) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 4 / globalScale, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }

    // Hover animated dashed ring
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 3.5 / globalScale, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(node.color, 0.9);
      ctx.lineWidth = 1.8 / globalScale;
      ctx.setLineDash([3 / globalScale, 3 / globalScale]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Node body with radial highlight
    const nodeGrad = ctx.createRadialGradient(
      node.x - radius * 0.3, node.y - radius * 0.3, 0,
      node.x, node.y, radius
    );
    nodeGrad.addColorStop(0, lightenHex(node.color, 35));
    nodeGrad.addColorStop(1, node.color);

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = nodeGrad;
    ctx.globalAlpha = isDimmed ? 0.08 : (isSearchMatch ? 1 : (isSearchNeighbor ? 0.6 : 1));
    ctx.fill();
    ctx.globalAlpha = 1;

    // Specular inner dot
    if (!isDimmed) {
      ctx.beginPath();
      ctx.arc(node.x - radius * 0.25, node.y - radius * 0.25, radius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();
    }

    // Emoji icon inside node (at higher zoom levels)
    if (globalScale > 1.2 && node.icon && !isDimmed) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const iconSize = Math.max(radius * 1.1, 8 / globalScale);
      ctx.font = `${iconSize}px sans-serif`;
      ctx.fillText(node.icon, node.x, node.y);
    }

    // Favorite star badge
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

    // Label pill rendering
    const showLabel = isSearchMatch || isHovered || isHighlighted || (globalScale > 0.55 && !isDimmed);
    if (showLabel) {
      const fontSize = Math.max(8 / globalScale, Math.min(13 / globalScale, 11 / globalScale));
      ctx.font = isSearchMatch
        ? `600 ${fontSize}px Inter, -apple-system, sans-serif`
        : `500 ${fontSize}px Inter, -apple-system, sans-serif`;

      const textWidth = ctx.measureText(label).width;
      const padX = fontSize * 0.5;
      const padY = fontSize * 0.35;
      const bgW = textWidth + padX * 2;
      const bgH = fontSize + padY * 2;
      const labelY = node.y + radius + 5 / globalScale;

      ctx.globalAlpha = isDimmed ? 0.08 : (isSearchMatch ? 1 : (isSearchNeighbor ? 0.6 : 1));

      // Label background pill
      ctx.beginPath();
      drawRoundRect(ctx, node.x - bgW / 2, labelY, bgW, bgH, 3 / globalScale);
      ctx.fillStyle = isSearchMatch ? 'rgba(20, 20, 28, 0.96)' : PALETTE.labelBg;
      ctx.fill();

      if (isSearchMatch) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1 / globalScale;
        ctx.stroke();
      }

      // Accent colored indicator on left of label pill
      ctx.beginPath();
      drawRoundRect(ctx, node.x - bgW / 2, labelY, 2.5 / globalScale, bgH, 1.5 / globalScale);
      ctx.fillStyle = isSearchMatch ? '#ffffff' : node.color;
      ctx.fill();

      // Label text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isSearchMatch ? '#ffffff' : PALETTE.labelText;
      ctx.fillText(label, node.x, labelY + bgH / 2);

      // Connection count badge pill
      if (node.connections > 0 && !isSearchDimmed) {
        const countStr = String(node.connections);
        const countFontSize = fontSize * 0.75;
        ctx.font = `600 ${countFontSize}px Inter, sans-serif`;
        const countW = ctx.measureText(countStr).width + countFontSize * 0.6;
        const countH = countFontSize + countFontSize * 0.4;
        const countX = node.x + bgW / 2 + 3 / globalScale;
        const countY = labelY + (bgH - countH) / 2;

        ctx.beginPath();
        drawRoundRect(ctx, countX, countY, countW, countH, 2 / globalScale);
        ctx.fillStyle = hexToRgba(node.color, 0.25);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = node.color;
        ctx.fillText(countStr, countX + countW / 2, countY + countH / 2);
      }

      ctx.globalAlpha = 1;
    }
  }, [hoveredNode, highlightSet, searchHighlightSets]);

  // ─── Custom Link Renderer (O(1) lookups, cached colors) ─────
  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!link.source || !link.target ||
        !Number.isFinite(link.source.x) || !Number.isFinite(link.source.y) ||
        !Number.isFinite(link.target.x) || !Number.isFinite(link.target.y)) {
      return;
    }

    const sNode = (typeof link.source === 'object' ? link.source : nodeMap.get(link.source)) as GraphNode | undefined;
    const tNode = (typeof link.target === 'object' ? link.target : nodeMap.get(link.target)) as GraphNode | undefined;

    const sId = sNode?.id || link.source;
    const tId = tNode?.id || link.target;

    const isSearchActive = searchHighlightSets !== null;
    const isLinkSearchHighlighted = Boolean(
      isSearchActive &&
      (searchHighlightSets.matched.has(sId) || searchHighlightSets.matched.has(tId)) &&
      (searchHighlightSets.all.has(sId) && searchHighlightSets.all.has(tId))
    );

    const isSearchDimmed = isSearchActive && !isLinkSearchHighlighted;
    const isHoverHighlighted = Boolean(hoveredNode && highlightSet.has(sId) && highlightSet.has(tId));
    const isHoverDimmed = Boolean(hoveredNode && !isHoverHighlighted);

    const isDimmed = isSearchDimmed || (!isSearchActive && isHoverDimmed);
    const isHighlighted = isLinkSearchHighlighted || isHoverHighlighted;

    const sx = link.source.x;
    const sy = link.source.y;
    const tx = link.target.x;
    const ty = link.target.y;

    const sColor = sNode?.color || PALETTE.nodePrimary;
    const tColor = tNode?.color || PALETTE.nodePrimary;

    ctx.globalAlpha = isDimmed ? 0.02 : (isHighlighted ? 0.9 : 0.35);

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);

    // Only compute heavy linear gradients for active/highlighted connections
    if (isHighlighted) {
      const grad = ctx.createLinearGradient(sx, sy, tx, ty);
      grad.addColorStop(0, hexToRgba(sColor, 0.9));
      grad.addColorStop(1, hexToRgba(tColor, 0.9));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5 / globalScale;
    } else {
      ctx.strokeStyle = hexToRgba(sColor, 0.28);
      ctx.lineWidth = 1 / globalScale;
    }
    ctx.stroke();

    // Directional arrow with negative-ratio prevention
    if (!isDimmed) {
      const dx = tx - sx;
      const dy = ty - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const targetRadius = (tNode?.val || 8) / 2;
      const minDistance = targetRadius + 6 / globalScale;

      if (dist > minDistance) {
        const arrowLen = (isHighlighted ? 8 : 6) / globalScale;
        const ratio = Math.max(0.05, (dist - targetRadius - 2 / globalScale) / dist);
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
        ctx.fillStyle = isHighlighted ? hexToRgba(sColor, 0.95) : hexToRgba(sColor, 0.4);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  }, [hoveredNode, highlightSet, searchHighlightSets, nodeMap]);

  // ─── Event Handlers ──────────────────────────────────────────
  const handleNodeClick = useCallback((node: any) => {
    if (node?.id) {
      navigate(`/app/page/${node.id}`);
      if (isFullscreen) setIsFullscreen(false);
    }
  }, [navigate, isFullscreen]);

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node?.id || null);
  }, []);

  // Recenter / Zoom to Fit
  const handleRecenter = useCallback(() => {
    const activeRef = isFullscreen ? fullscreenGraphRef.current : inlineGraphRef.current;
    if (activeRef) {
      activeRef.zoomToFit(400, isFullscreen ? 60 : 30);
    }
  }, [isFullscreen]);

  // Initial auto-zoom on cooling complete (run once, ignore node drags)
  const handleEngineStop = useCallback(() => {
    if (!hasInitialZoomedRef.current) {
      hasInitialZoomedRef.current = true;
      handleRecenter();
    }
  }, [handleRecenter]);

  // ─── Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activeNodes = pages.filter(p => !p.isArchived).length;
    const totalEdges = graphData.links.length;
    return { activeNodes, totalEdges };
  }, [pages, graphData.links]);

  // ─── Shared Graph Props ──────────────────────────────────────
  const sharedGraphProps = {
    graphData,
    nodeCanvasObject,
    linkCanvasObject,
    linkCanvasObjectMode: () => 'replace' as const,
    nodeRelSize: 6,
    onNodeClick: handleNodeClick,
    onNodeHover: handleNodeHover,
    onBackgroundClick: () => setHoveredNode(null),
    d3AlphaDecay: 0.04,
    d3VelocityDecay: 0.35,
    warmupTicks: 40,
    cooldownTicks: 120,
    enablePointerInteraction: true,
    onRenderFramePre: drawBackground,
    onEngineStop: handleEngineStop,
    minZoom: 0.1,
    maxZoom: 4,
  };

  // ─── Floating Controls Overlay ───────────────────────────────
  const renderControls = (full = false) => {
    const matchCount = searchHighlightSets ? searchHighlightSets.matched.size : 0;

    return (
      <div
        style={{
          position: 'absolute',
          top: full ? '16px' : '10px',
          left: full ? '20px' : '10px',
          right: full ? '20px' : '10px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          {/* Search Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(15, 15, 22, 0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '5px 12px',
              width: full ? '260px' : '160px',
              transition: 'all 0.2s ease',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
              pointerEvents: 'auto',
            }}
          >
            <Search size={12} style={{ color: 'var(--text-tertiary)', marginRight: '6px', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search nodes..."
              aria-label="Search graph nodes"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '11px',
                width: '100%',
                fontWeight: 500,
              }}
            />
            {searchQuery && (
              <button
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                  marginLeft: '4px',
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Quick Filters, Color Mode & Recenter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(15, 15, 22, 0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              padding: '3px 6px',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
              pointerEvents: 'auto',
            }}
          >
            {/* Structural Filter */}
            <button
              aria-label="Toggle structural hierarchy links"
              aria-pressed={linkFilter.structural}
              onClick={() => setLinkFilter(prev => ({ ...prev, structural: !prev.structural }))}
              style={{
                background: linkFilter.structural ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                border: '1px solid ' + (linkFilter.structural ? 'rgba(99, 102, 241, 0.45)' : 'transparent'),
                color: linkFilter.structural ? '#A5B4FC' : 'var(--text-tertiary)',
                borderRadius: '14px',
                padding: '3px 7px',
                fontSize: '9px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <SlidersHorizontal size={8} />
              Structural
            </button>

            {/* Semantic Filter */}
            <button
              aria-label="Toggle semantic mention links"
              aria-pressed={linkFilter.semantic}
              onClick={() => setLinkFilter(prev => ({ ...prev, semantic: !prev.semantic }))}
              style={{
                background: linkFilter.semantic ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
                border: '1px solid ' + (linkFilter.semantic ? 'rgba(139, 92, 246, 0.45)' : 'transparent'),
                color: linkFilter.semantic ? '#C084FC' : 'var(--text-tertiary)',
                borderRadius: '14px',
                padding: '3px 7px',
                fontSize: '9px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Network size={8} />
              Semantic
            </button>

            <div style={{ width: '1px', height: '10px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 2px' }} />

            {/* Color Mode Selector */}
            <button
              aria-label="Toggle community color clusters"
              aria-pressed={colorMode === 'community'}
              onClick={() => setColorMode(prev => prev === 'standard' ? 'community' : 'standard')}
              style={{
                background: colorMode === 'community' ? 'rgba(16, 185, 129, 0.22)' : 'transparent',
                border: '1px solid ' + (colorMode === 'community' ? 'rgba(16, 185, 129, 0.45)' : 'transparent'),
                color: colorMode === 'community' ? '#34D399' : 'var(--text-tertiary)',
                borderRadius: '14px',
                padding: '3px 7px',
                fontSize: '9px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Layers size={8} />
              {colorMode === 'community' ? 'Community' : 'Standard'}
            </button>

            <div style={{ width: '1px', height: '10px', background: 'rgba(255, 255, 255, 0.15)', margin: '0 2px' }} />

            {/* Recenter View Button */}
            <button
              aria-label="Reset zoom and center view"
              title="Recenter view"
              onClick={handleRecenter}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                borderRadius: '14px',
                padding: '3px 5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
              <Focus size={11} />
            </button>
          </div>
        </div>

        {/* Search Results Count */}
        {searchQuery && (
          <div
            style={{
              alignSelf: 'flex-start',
              fontSize: '9px',
              fontWeight: 600,
              background: 'rgba(15, 15, 22, 0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-secondary)',
              padding: '3px 8px',
              borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
              pointerEvents: 'auto',
            }}
          >
            {matchCount} {matchCount === 1 ? 'node match' : 'nodes match'}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ─── Compact Streamlined Header ────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.04em' }}>
            {stats.activeNodes} NODES
          </span>
          <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.18)' }}>•</span>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.04em' }}>
            {stats.totalEdges} EDGES
          </span>
        </div>
        <button
          aria-label="Maximize Graph"
          title="Fullscreen Graph (Press Esc to close)"
          onClick={() => setIsFullscreen(true)}
          style={{
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            borderRadius: '7px',
            padding: '5px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* ─── Inline Graph Canvas ────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '220px',
          width: '100%',
          height: '100%',
        }}
      >
        {renderControls(false)}

        {/* Render inline ForceGraph ONLY when not in fullscreen mode to prevent dual-physics collision */}
        {!isFullscreen && inlineWidth > 0 && inlineHeight > 0 && stats.activeNodes > 0 && (
          <ForceGraph2D
            ref={inlineGraphRef}
            width={inlineWidth}
            height={inlineHeight}
            {...sharedGraphProps}
          />
        )}

        {stats.activeNodes === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px' }}>
            No active nodes found. Create pages and link them with @ to build your graph.
          </div>
        )}

        {!isFullscreen && (inlineWidth === 0 || inlineHeight === 0) && stats.activeNodes > 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: PALETTE.nodePrimary, animation: 'pulse 1.5s infinite' }} />
            Initializing graph engine...
          </div>
        )}
      </div>

      {/* ─── Fullscreen Overlay ──────────────────────────────── */}
      {isFullscreen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Workspace Graph Fullscreen View"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(8, 8, 12, 0.98)',
            backdropFilter: 'blur(24px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* ── Fullscreen Header ── */}
          <div style={{
            padding: '16px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.02)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '10px',
                background: `linear-gradient(135deg, ${PALETTE.nodePrimary}, ${PALETTE.nodeSecondary})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Network size={18} color="#fff" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                  Workspace Graph
                </h3>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>
                  {stats.activeNodes} nodes · {stats.totalEdges} connections · Click a node to navigate · Esc to close
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Dynamic Accurate Legend */}
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                {colorMode === 'community' ? (
                  <>
                    {communityMetadata.topCommunities.map((c, i) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, boxShadow: `0 0 6px ${hexToRgba(c.color, 0.4)}` }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                          Cluster {i + 1} ({c.count})
                        </span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: PALETTE.nodeOrphan }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Orphan</span>
                    </div>
                  </>
                ) : (
                  [
                    { color: PALETTE.nodePrimary, label: 'Connected' },
                    { color: PALETTE.nodeSecondary, label: 'Hub (3+)' },
                    { color: PALETTE.nodeFavorite, label: 'Favorite' },
                    { color: PALETTE.nodeOrphan, label: 'Orphan' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${hexToRgba(item.color, 0.4)}` }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>{item.label}</span>
                    </div>
                  ))
                )}
              </div>

              <button
                className="btn btn-secondary"
                aria-label="Close fullscreen"
                onClick={() => setIsFullscreen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
              >
                <Minimize2 size={13} />
                <span style={{ fontSize: '12px' }}>Close</span>
              </button>
            </div>
          </div>

          {/* ── Fullscreen Canvas Container ── */}
          <div ref={fullscreenContainerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {renderControls(true)}
            {fsWidth > 0 && fsHeight > 0 && (
              <ForceGraph2D
                ref={fullscreenGraphRef}
                width={fsWidth}
                height={fsHeight}
                {...sharedGraphProps}
              />
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
