// ─── Block Schema — Notion-Fidelity Data Model ─────────────────
// Defines the canonical block structure, rich text span model,
// and per-type property schemas for pixel-perfect Notion rendering.

import { createId } from './helpers';
import type { Block, BlockType, RichTextAnnotation, RichTextSpan, BlockProperties } from '../types';

// ─── Notion Color Palette ────────────────────────────────────────

export const NOTION_COLORS: Record<string, string> = {
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

export const NOTION_BACKGROUND_COLORS: Record<string, string> = {
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

export interface CalloutColorScheme {
  bg: string;
  border: string;
}

export const CALLOUT_COLORS: Record<string, CalloutColorScheme> = {
  default: { bg: 'rgba(255,255,255,0.055)', border: 'rgba(255,255,255,0.08)' },
  gray_background: { bg: 'rgba(155,154,151,0.1)', border: 'rgba(155,154,151,0.2)' },
  brown_background: { bg: 'rgba(186,133,111,0.1)', border: 'rgba(186,133,111,0.2)' },
  orange_background: { bg: 'rgba(199,125,72,0.1)', border: 'rgba(199,125,72,0.2)' },
  yellow_background: { bg: 'rgba(202,152,73,0.1)', border: 'rgba(202,152,73,0.2)' },
  green_background: { bg: 'rgba(82,158,114,0.1)', border: 'rgba(82,158,114,0.2)' },
  blue_background: { bg: 'rgba(94,135,201,0.1)', border: 'rgba(94,135,201,0.2)' },
  purple_background: { bg: 'rgba(144,101,176,0.1)', border: 'rgba(144,101,176,0.2)' },
  pink_background: { bg: 'rgba(193,76,138,0.1)', border: 'rgba(193,76,138,0.2)' },
  red_background: { bg: 'rgba(212,76,71,0.1)', border: 'rgba(212,76,71,0.2)' },
};

// ─── Emoji → Callout Color Inference ─────────────────────────────

export const EMOJI_COLOR_MAP: Record<string, string> = {
  '⚠️': 'yellow_background', '⚡': 'yellow_background', '🔔': 'yellow_background',
  '💡': 'yellow_background', '✨': 'yellow_background', '⭐': 'yellow_background',
  '🔴': 'red_background', '❌': 'red_background', '🚫': 'red_background',
  '⛔': 'red_background', '❗': 'red_background', '‼️': 'red_background',
  '🚨': 'red_background',
  '✅': 'green_background', '✔️': 'green_background', '🟢': 'green_background',
  '🌱': 'green_background', '🎉': 'green_background', '👍': 'green_background',
  '💙': 'blue_background', '🔵': 'blue_background', 'ℹ️': 'blue_background',
  '📘': 'blue_background', '🔗': 'blue_background',
  '🟣': 'purple_background', '💜': 'purple_background', '🎨': 'purple_background',
  '💗': 'pink_background', '🩷': 'pink_background',
  '🟠': 'orange_background', '🔥': 'orange_background', '🍊': 'orange_background',
  '🟤': 'brown_background', '☕': 'brown_background',
  '⬜': 'gray_background', '🩶': 'gray_background',
};

export function inferCalloutColor(emoji: string | null | undefined): string {
  if (!emoji) return 'default';
  return EMOJI_COLOR_MAP[emoji] || 'default';
}

// ─── Rich Text Span ──────────────────────────────────────────────

export function createAnnotations(overrides: Partial<RichTextAnnotation> = {}): RichTextAnnotation {
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

export function createRichTextSpan(
  text: string,
  annotations: Partial<RichTextAnnotation> = {},
  href: string | null = null
): RichTextSpan {
  return {
    text,
    annotations: createAnnotations(annotations),
    href,
  };
}

// ─── Block Property Schemas ──────────────────────────────────────

export const BLOCK_PROPERTY_DEFAULTS: Record<string, BlockProperties> = {
  text: {},
  heading1: {},
  heading2: {},
  heading3: {},
  bullet: { depth: 0 },
  numbered: { depth: 0 },
  todo: { checked: false },
  toggle: { expanded: true },
  callout: { emoji: '💡', color: 'default' },
  quote: {},
  divider: {},
  code: { language: 'plain text', caption: '', wrap: false },
  image: { hash: '', caption: '', width: null, alignment: 'center' },
  embed: {
    url: '',
    caption: '',
    embedType: 'generic',
    width: '100%',
    height: 'auto',
  },
  countdown: {
    width: '100%',
    height: '140px',
    caption: '',
    widgetSettings: {
      theme: 'sleekdark',
      bgColor: '#17171e',
      textColor: '#f3f3f4',
      title: 'Left in This Month',
      targetDate: '',
      workTime: 25,
      breakTime: 5,
      current: 0,
      target: 10,
    }
  },
  pomodoro: {
    width: '100%',
    height: '140px',
    caption: '',
    widgetSettings: {
      theme: 'sleekdark',
      bgColor: '#17171e',
      textColor: '#f3f3f4',
      title: 'Focus Timer',
      targetDate: '',
      workTime: 25,
      breakTime: 5,
      current: 0,
      target: 10,
    }
  },
  progress_bar: {
    width: '100%',
    height: '140px',
    caption: '',
    widgetSettings: {
      theme: 'sleekdark',
      bgColor: '#17171e',
      textColor: '#f3f3f4',
      title: 'Goal Tracker',
      targetDate: '',
      workTime: 25,
      breakTime: 5,
      current: 0,
      target: 10,
    }
  },
  widget: {
    width: '100%',
    height: 'auto',
    caption: '',
  },
  database: {
    schema: [
      {
        id: 'title',
        name: '',
        type: 'text',
        width: 200,
        config: {}
      },
      {
        id: 'tags',
        name: '',
        type: 'multi_select',
        width: 200,
        config: {}
      }
    ]
  },
  table: {
    cells: [['', ''], ['', '']],
    hasHeader: false,
    hasHeaderCol: false,
    columnWidths: [200, 200],
    rowHeights: [40, 40],
    isFitToPage: true,
  },
  tracker: {},
  column_list: {},
  column: { width: null },
  page: { pageId: null },
};

export function createFidelityBlock(pageId: string, type: BlockType, overrides: Partial<Block> = {}): Block {
  const defaults = BLOCK_PROPERTY_DEFAULTS[type] || {};
  const now = Date.now();
  const sortOrder = overrides.sortOrder || (overrides as any).orderKey || 'm';
  return {
    id: overrides.id || createId(),
    pageId,
    parentId: overrides.parentId !== undefined ? overrides.parentId : null,
    type,
    content: overrides.content || '',
    richText: overrides.richText || [],
    sortOrder,
    orderKey: sortOrder,
    version: overrides.version !== undefined ? overrides.version : 1,
    actorId: overrides.actorId || 'local-actor',
    updatedLogical: overrides.updatedLogical !== undefined ? overrides.updatedLogical : now,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    ...overrides,
    properties: { ...defaults, ...(overrides.properties || {}) },
  };
}

export const BULLET_MARKERS = ['disc', 'circle', 'square'];
export const NUMBERED_MARKERS = ['decimal', 'lower-alpha', 'lower-roman'];

export function getBulletMarker(depth = 0): string {
  return BULLET_MARKERS[depth % BULLET_MARKERS.length];
}

export function getNumberedMarker(depth = 0): string {
  return NUMBERED_MARKERS[depth % NUMBERED_MARKERS.length];
}
