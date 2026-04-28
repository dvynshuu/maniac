// ─── Block Schema — Notion-Fidelity Data Model ─────────────────
// Defines the canonical block structure, rich text span model,
// and per-type property schemas for pixel-perfect Notion rendering.

import { createId, generateLexicalOrder } from './helpers';

// ─── Notion Color Palette ────────────────────────────────────────
// These match Notion's exact color names from the API.

export const NOTION_COLORS = {
  // Text colors
  default: 'inherit',
  gray: 'rgba(155,154,151,1)',
  brown: 'rgba(186,133,111,1)',
  orange: 'rgba(199,125,72,1)',
  yellow: 'rgba(202,152,73,1)',
  green: 'rgba(82,158,114,1)',
  blue: 'rgba(94,135,201,1)',
  purple: 'rgba(144,101,176,1)',
  pink: 'rgba(193,76,138,1)',
  red: 'rgba(212,76,71,1)',
};

export const NOTION_BACKGROUND_COLORS = {
  default: 'transparent',
  gray_background: 'rgba(241,241,239,0.13)',
  brown_background: 'rgba(244,238,238,0.13)',
  orange_background: 'rgba(251,236,221,0.13)',
  yellow_background: 'rgba(251,243,219,0.13)',
  green_background: 'rgba(237,243,236,0.13)',
  blue_background: 'rgba(231,243,248,0.13)',
  purple_background: 'rgba(244,240,247,0.13)',
  pink_background: 'rgba(249,238,243,0.13)',
  red_background: 'rgba(253,235,236,0.13)',
};

// ─── Callout Color Presets (dark-mode tuned) ─────────────────────

export const CALLOUT_COLORS = {
  default:          { bg: 'rgba(255,255,255,0.055)', border: 'rgba(255,255,255,0.08)' },
  gray_background:  { bg: 'rgba(155,154,151,0.1)',   border: 'rgba(155,154,151,0.2)' },
  brown_background: { bg: 'rgba(186,133,111,0.1)',   border: 'rgba(186,133,111,0.2)' },
  orange_background:{ bg: 'rgba(199,125,72,0.1)',    border: 'rgba(199,125,72,0.2)' },
  yellow_background:{ bg: 'rgba(202,152,73,0.1)',    border: 'rgba(202,152,73,0.2)' },
  green_background: { bg: 'rgba(82,158,114,0.1)',    border: 'rgba(82,158,114,0.2)' },
  blue_background:  { bg: 'rgba(94,135,201,0.1)',    border: 'rgba(94,135,201,0.2)' },
  purple_background:{ bg: 'rgba(144,101,176,0.1)',   border: 'rgba(144,101,176,0.2)' },
  pink_background:  { bg: 'rgba(193,76,138,0.1)',    border: 'rgba(193,76,138,0.2)' },
  red_background:   { bg: 'rgba(212,76,71,0.1)',     border: 'rgba(212,76,71,0.2)' },
};

// ─── Emoji → Callout Color Inference ─────────────────────────────
// When Notion exports strip color metadata, we infer from the icon.

export const EMOJI_COLOR_MAP = {
  // Warning / caution
  '⚠️': 'yellow_background', '⚡': 'yellow_background', '🔔': 'yellow_background',
  '💡': 'yellow_background', '✨': 'yellow_background', '⭐': 'yellow_background',
  // Error / danger
  '🔴': 'red_background', '❌': 'red_background', '🚫': 'red_background',
  '⛔': 'red_background', '❗': 'red_background', '‼️': 'red_background',
  '🚨': 'red_background',
  // Success / positive
  '✅': 'green_background', '✔️': 'green_background', '🟢': 'green_background',
  '🌱': 'green_background', '🎉': 'green_background', '👍': 'green_background',
  // Info / neutral
  '💙': 'blue_background', '🔵': 'blue_background', 'ℹ️': 'blue_background',
  '📘': 'blue_background', '🔗': 'blue_background',
  // Purple / creative
  '🟣': 'purple_background', '💜': 'purple_background', '🎨': 'purple_background',
  // Pink
  '💗': 'pink_background', '🩷': 'pink_background',
  // Orange
  '🟠': 'orange_background', '🔥': 'orange_background', '🍊': 'orange_background',
  // Brown
  '🟤': 'brown_background', '☕': 'brown_background',
  // Gray
  '⬜': 'gray_background', '🩶': 'gray_background',
};

/**
 * Infer callout color from emoji icon.
 * Falls back to 'default' (neutral).
 */
export function inferCalloutColor(emoji) {
  if (!emoji) return 'default';
  return EMOJI_COLOR_MAP[emoji] || 'default';
}

// ─── Rich Text Span ──────────────────────────────────────────────

/**
 * Creates a default annotations object.
 */
export function createAnnotations(overrides = {}) {
  return {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    color: 'default',
    backgroundColor: 'default',
    ...overrides,
  };
}

/**
 * Creates a rich text span.
 * @param {string} text - The text content
 * @param {object} annotations - Formatting annotations
 * @param {string|null} href - Optional link URL
 */
export function createRichTextSpan(text, annotations = {}, href = null) {
  return {
    text,
    annotations: createAnnotations(annotations),
    href,
  };
}

// ─── Block Property Schemas ──────────────────────────────────────
// Default properties per block type.

export const BLOCK_PROPERTY_DEFAULTS = {
  text:     {},
  heading1: {},
  heading2: {},
  heading3: {},
  bullet:   { depth: 0 },
  numbered: { depth: 0 },
  todo:     { checked: false },
  toggle:   { expanded: true },
  callout:  { emoji: '💡', color: 'default' },
  quote:    {},
  divider:  {},
  code:     { language: 'plain text', caption: '', wrap: false },
  image:    { hash: '', caption: '', width: null, alignment: 'center' },
  embed:    { url: '', caption: '' },
  database: { schema: [] },
  table:    { headers: [], rows: [] },
  tracker:  {},
};

/**
 * Creates a fully-typed block with Notion-fidelity properties.
 * This wraps the existing createBlock helper with rich defaults.
 */
export function createFidelityBlock(pageId, type, overrides = {}) {
  const defaults = BLOCK_PROPERTY_DEFAULTS[type] || {};
  const now = Date.now();
  return {
    id: createId(),
    pageId,
    parentId: null,
    type,
    content: '',
    richText: [],     // Structured rich text spans
    properties: { ...defaults, ...overrides.properties },
    sortOrder: overrides.sortOrder || 'm',
    createdAt: now,
    updatedAt: now,
    ...overrides,
    // Ensure properties merge doesn't get overwritten
    properties: { ...defaults, ...(overrides.properties || {}) },
  };
}

// ─── List Marker Styles ──────────────────────────────────────────
// Notion cycles through these for nested lists.

export const BULLET_MARKERS = ['disc', 'circle', 'square'];
export const NUMBERED_MARKERS = ['decimal', 'lower-alpha', 'lower-roman'];

/**
 * Get the marker style for a given nesting depth.
 */
export function getBulletMarker(depth = 0) {
  return BULLET_MARKERS[depth % BULLET_MARKERS.length];
}

export function getNumberedMarker(depth = 0) {
  return NUMBERED_MARKERS[depth % NUMBERED_MARKERS.length];
}
