// ─── Block Schema — Notion-Fidelity Data Model ─────────────────
// Defines the canonical block structure, rich text span model,
// and per-type property schemas for pixel-perfect Notion rendering.

import { createId } from './helpers';
import type { Block, BlockType, RichTextAnnotation, RichTextSpan, BlockProperties } from '../types';

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
      theme: 'card',
      bgColor: 'var(--color-surface-2)',
      textColor: 'var(--color-fg)',
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
      theme: 'card',
      bgColor: 'var(--color-surface-2)',
      textColor: 'var(--color-fg)',
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
      theme: 'card',
      bgColor: 'var(--color-surface-2)',
      textColor: 'var(--color-fg)',
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
  toggle_heading1: { expanded: true },
  toggle_heading2: { expanded: true },
  toggle_heading3: { expanded: true },
  table_of_contents: {},
  bookmark: { url: '', title: '', description: '', favicon: '', thumbnail: '' },
  synced_block: { sourceBlockId: null, isOriginal: true },
  synced_reference: { sourceBlockId: null },
  tracker: {},
  column_list: { columnRatios: [0.5, 0.5] },
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
