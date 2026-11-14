// ─── Rich Text Parser ───────────────────────────────────────────
// Converts HTML strings ↔ structured RichTextSpan[] arrays.
// This is the critical bridge between Notion export HTML and our
// annotation-based data model.

import React from 'react';
import { createAnnotations, createRichTextSpan } from './blockSchema';
import { RichTextSpan, RichTextAnnotation } from '../types/block';

// ─── HTML → RichTextSpan[] ───────────────────────────────────────

let _cachedParser: DOMParser | null = null;
function getDOMParser(): DOMParser | null {
  if (!_cachedParser && typeof DOMParser !== 'undefined') {
    _cachedParser = new DOMParser();
  }
  return _cachedParser;
}

/**
 * Parse an HTML string into an array of RichTextSpan objects.
 * Handles nested formatting tags, links, colored spans, and inline code.
 */
export function parseHtmlToRichText(html: string | null | undefined): RichTextSpan[] {
  if (!html || typeof html !== 'string') return [];

  // Strip wrapping <p> tags for single-paragraph content
  const trimmed = html.trim();
  if (!trimmed) return [];

  // Fast path: if content contains no HTML markup tags, bypass DOMParser entirely
  if (!trimmed.includes('<')) {
    return [{ text: trimmed, annotations: createAnnotations(), href: null }];
  }

  // In Node/test/worker environments without DOMParser, use lightweight tokenizing fallback
  const parser = getDOMParser();
  if (!parser) {
    return parseHtmlFallback(trimmed);
  }

  // Use cached DOMParser for correct HTML interpretation
  const doc = parser.parseFromString(
    `<body>${trimmed}</body>`,
    'text/html'
  );
  const body = doc.body;
  if (!body) return [];

  const spans: RichTextSpan[] = [];
  walkNode(body, createAnnotations(), null, spans);

  // Post-process: merge adjacent spans with identical annotations
  return mergeAdjacentSpans(spans);
}

/**
 * Lightweight tokenizing HTML fallback for Node.js test runner and headless environments.
 */
function parseHtmlFallback(html: string): RichTextSpan[] {
  const spans: RichTextSpan[] = [];
  const tagRegex = /<(\/)?([a-z0-9_-]+)([^>]*)>|([^<]+)/gi;
  let match;

  let currentAnnotations = createAnnotations();
  let currentHref: string | null = null;
  const tagStack: { tag: string; annotations: RichTextAnnotation; href: string | null }[] = [];

  while ((match = tagRegex.exec(html)) !== null) {
    const [, isClose, tagName, attrs, textContent] = match;

    if (textContent) {
      if (textContent.length > 0) {
        spans.push(createRichTextSpan(textContent, { ...currentAnnotations }, currentHref));
      }
      continue;
    }

    const tag = (tagName || '').toLowerCase();

    if (tag === 'br') {
      spans.push(createRichTextSpan('\n', { ...currentAnnotations }, currentHref));
      continue;
    }

    if (isClose) {
      if (tagStack.length > 0) {
        const popped = tagStack.pop();
        if (popped) {
          currentAnnotations = popped.annotations;
          currentHref = popped.href;
        }
      }
      continue;
    }

    // Opening tag: Check for Mention
    if (attrs && (attrs.includes('data-mention') || attrs.includes('page-mention') || attrs.includes('mention-chip'))) {
      const pageIdMatch = attrs.match(/data-page-id=["']([^"']+)["']/) || attrs.match(/href=["'][^"']*\/page\/([^"']+)["']/);
      const pageId = pageIdMatch ? pageIdMatch[1] : '';
      const closeTagIdx = html.indexOf(`</${tag}>`, match.index);
      const innerHtml = closeTagIdx !== -1 ? html.substring(match.index + match[0].length, closeTagIdx) : '';
      const iconMatch = innerHtml.match(/mention-icon["']>([^<]+)<\//) || innerHtml.match(/data-icon=["']([^"']+)["']/);
      const titleMatch = innerHtml.match(/mention-label["']>([^<]+)<\//) || innerHtml.match(/data-title=["']([^"']+)["']/);
      const title = titleMatch ? titleMatch[1] : innerHtml.replace(/<[^>]+>/g, '').trim() || 'Untitled';
      const icon = iconMatch ? iconMatch[1] : '📄';

      spans.push({
        text: title,
        annotations: { ...currentAnnotations },
        href: `/app/page/${pageId}`,
        mention: { pageId, title, icon }
      });

      if (closeTagIdx !== -1) {
        tagRegex.lastIndex = closeTagIdx + `</${tag}>`.length;
      }
      continue;
    }

    // Opening tag: Check for Transclusion
    if (attrs && (attrs.includes('data-transclusion') || attrs.includes('transclusion-chip'))) {
      const blockIdMatch = attrs.match(/data-block-id=["']([^"']+)["']/);
      const pageIdMatch = attrs.match(/data-page-id=["']([^"']+)["']/);
      const textMatch = attrs.match(/data-text=["']([^"']+)["']/);
      const blockTypeMatch = attrs.match(/data-block-type=["']([^"']+)["']/);

      const blockId = blockIdMatch ? blockIdMatch[1] : '';
      const pageId = pageIdMatch ? pageIdMatch[1] : '';
      const text = textMatch ? textMatch[1] : 'Transcluded block';
      const blockType = blockTypeMatch ? blockTypeMatch[1] : 'text';

      spans.push({
        text: `⎘ ${text}`,
        annotations: { ...currentAnnotations },
        href: null,
        transclusion: { blockId, pageId, text, blockType }
      });

      const closeTagIdx = html.indexOf(`</${tag}>`, match.index);
      if (closeTagIdx !== -1) {
        tagRegex.lastIndex = closeTagIdx + `</${tag}>`.length;
      }
      continue;
    }

    // Opening tag: Check for Database Chip
    if (attrs && (attrs.includes('data-db-id') || attrs.includes('db-chip'))) {
      const databaseIdMatch = attrs.match(/data-db-id=["']([^"']+)["']/);
      const pageIdMatch = attrs.match(/data-page-id=["']([^"']+)["']/);
      const labelMatch = attrs.match(/data-label=["']([^"']+)["']/);

      const databaseId = databaseIdMatch ? databaseIdMatch[1] : '';
      const pageId = pageIdMatch ? pageIdMatch[1] : '';
      const label = labelMatch ? labelMatch[1] : 'Database';

      spans.push({
        text: label,
        annotations: { ...currentAnnotations },
        href: null,
        databaseChip: { databaseId, pageId, label }
      });

      const closeTagIdx = html.indexOf(`</${tag}>`, match.index);
      if (closeTagIdx !== -1) {
        tagRegex.lastIndex = closeTagIdx + `</${tag}>`.length;
      }
      continue;
    }

    // Formatting tags
    tagStack.push({ tag, annotations: { ...currentAnnotations }, href: currentHref });

    if (tag === 'strong' || tag === 'b') currentAnnotations.bold = true;
    if (tag === 'em' || tag === 'i') currentAnnotations.italic = true;
    if (tag === 'u') currentAnnotations.underline = true;
    if (tag === 's' || tag === 'del' || tag === 'strike') currentAnnotations.strikethrough = true;
    if (tag === 'code') currentAnnotations.code = true;
    if (tag === 'mark') currentAnnotations.backgroundColor = 'yellow_background';
    if (tag === 'a' && attrs) {
      const hrefMatch = attrs.match(/href=["']([^"']+)["']/);
      if (hrefMatch) currentHref = hrefMatch[1];
    }
  }

  return mergeAdjacentSpans(spans);
}

/**
 * Recursive DOM walker. Accumulates formatting context as it descends,
 * and emits RichTextSpan objects for each text node.
 */
function walkNode(node: Node, annotations: RichTextAnnotation, href: string | null, spans: RichTextSpan[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    // Don't skip whitespace-only nodes — they may be meaningful spaces
    // between inline elements. But skip truly empty strings.
    if (text.length > 0) {
      spans.push(createRichTextSpan(text, { ...annotations }, href));
    }
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as Element;
  const tag = element.tagName.toLowerCase();

  // Skip non-content elements
  if (tag === 'style' || tag === 'script' || tag === 'head' || tag === 'meta' || tag === 'link') {
    return;
  }

  // Handle line breaks
  if (tag === 'br') {
    spans.push(createRichTextSpan('\n', { ...annotations }, href));
    return;
  }

  // Handle Mentions (@page)
  if (element.hasAttribute('data-mention') || element.classList.contains('mention-chip') || element.classList.contains('page-mention')) {
    const pageId = element.getAttribute('data-page-id') || element.getAttribute('href')?.replace(/^.*\/page\//, '') || '';
    const title = element.getAttribute('data-title') || element.querySelector('.mention-label')?.textContent || element.textContent || 'Untitled';
    const icon = element.getAttribute('data-icon') || element.querySelector('.mention-icon')?.textContent || '📄';
    spans.push({
      text: title,
      annotations: { ...annotations },
      href: `/app/page/${pageId}`,
      mention: { pageId, title, icon }
    });
    return;
  }

  // Handle Transclusions (((blockId)))
  if (element.hasAttribute('data-transclusion') || element.classList.contains('transclusion-chip')) {
    const blockId = element.getAttribute('data-block-id') || '';
    const pageId = element.getAttribute('data-page-id') || '';
    const text = element.getAttribute('data-text') || element.textContent?.replace(/^⎘\s*/, '') || '';
    const blockType = element.getAttribute('data-block-type') || 'text';
    spans.push({
      text: `⎘ ${text}`,
      annotations: { ...annotations },
      href: null,
      transclusion: { blockId, pageId, text, blockType }
    });
    return;
  }

  // Handle Database Chips
  if (element.hasAttribute('data-db-id') || element.classList.contains('db-chip')) {
    const databaseId = element.getAttribute('data-db-id') || '';
    const pageId = element.getAttribute('data-page-id') || '';
    const label = element.getAttribute('data-label') || element.textContent || '';
    spans.push({
      text: label,
      annotations: { ...annotations },
      href: null,
      databaseChip: { databaseId, pageId, label }
    });
    return;
  }

  // Clone annotations for this branch (avoid mutating parent)
  const childAnnotations: RichTextAnnotation = { ...annotations };
  let childHref: string | null = href;

  // ── Apply formatting based on tag ──

  // Bold
  if (tag === 'strong' || tag === 'b') {
    childAnnotations.bold = true;
  }

  // Italic
  if (tag === 'em' || tag === 'i') {
    childAnnotations.italic = true;
  }

  // Underline
  if (tag === 'u') {
    childAnnotations.underline = true;
  }

  // Strikethrough
  if (tag === 's' || tag === 'del' || tag === 'strike') {
    childAnnotations.strikethrough = true;
  }

  // Inline code
  if (tag === 'code') {
    childAnnotations.code = true;
  }

  // Mark / highlight
  if (tag === 'mark') {
    childAnnotations.backgroundColor = extractHighlightColor(element) || 'yellow_background';
  }

  // Links
  if (tag === 'a') {
    childHref = element.getAttribute('href') || null;
  }

  // Notion-specific: <span> with style for colors
  if (tag === 'span') {
    const style = element.getAttribute('style') || '';
    const colorMatch = style.match(/color:\s*([^;]+)/i);
    const bgMatch = style.match(/background(?:-color)?:\s*([^;]+)/i);

    if (colorMatch) {
      childAnnotations.color = mapCssColorToNotion(colorMatch[1].trim());
    }
    if (bgMatch) {
      childAnnotations.backgroundColor = mapCssBgColorToNotion(bgMatch[1].trim());
    }

    // Notion export class-based colors
    const classList = Array.from(element.classList || []);
    for (const cls of classList) {
      const textColor = extractNotionColorClass(cls);
      if (textColor) {
        if (cls.includes('background')) {
          childAnnotations.backgroundColor = textColor;
        } else {
          childAnnotations.color = textColor;
        }
      }
    }
  }

  // ── Recurse into children ──
  const childNodes = Array.from(node.childNodes);
  for (const child of childNodes) {
    walkNode(child, childAnnotations, childHref, spans);
  }
}

// ─── Span Merging ────────────────────────────────────────────────

/**
 * Merge adjacent spans that have identical annotations and href.
 * Reduces span count and simplifies the data.
 */
function mergeAdjacentSpans(spans: RichTextSpan[]): RichTextSpan[] {
  if (spans.length === 0) return [];

  const result = [spans[0]];
  for (let i = 1; i < spans.length; i++) {
    const prev = result[result.length - 1];
    const curr = spans[i];

    const hasChips = prev.mention || curr.mention || prev.transclusion || curr.transclusion || prev.databaseChip || curr.databaseChip;
    if (!hasChips && annotationsEqual(prev.annotations, curr.annotations) && prev.href === curr.href) {
      // Merge text
      result[result.length - 1] = {
        ...prev,
        text: prev.text + curr.text,
      };
    } else {
      result.push(curr);
    }
  }

  // Filter out empty spans
  return result.filter(s => s.text.length > 0);
}

/**
 * Deep equality check for annotation objects.
 */
function annotationsEqual(a?: Partial<RichTextAnnotation>, b?: Partial<RichTextAnnotation>): boolean {
  if (!a || !b) return a === b;
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strikethrough === b.strikethrough &&
    a.code === b.code &&
    a.color === b.color &&
    a.backgroundColor === b.backgroundColor
  );
}

// ─── Color Mapping ───────────────────────────────────────────────

/**
 * Map a CSS color value to a Notion color name.
 * Handles both rgb() and named colors from Notion exports.
 */
function mapCssColorToNotion(cssColor: string): string {
  const lower = cssColor.toLowerCase().trim();

  // Direct Notion color names
  const directMap: Record<string, string> = {
    'gray': 'gray', 'brown': 'brown', 'orange': 'orange',
    'yellow': 'yellow', 'green': 'green', 'blue': 'blue',
    'purple': 'purple', 'pink': 'pink', 'red': 'red',
  };
  if (directMap[lower]) return directMap[lower];

  // RGB value matching (approximate — Notion uses specific RGB values)
  const rgbMap = [
    { r: 155, g: 154, b: 151, name: 'gray' },
    { r: 186, g: 133, b: 111, name: 'brown' },
    { r: 199, g: 125, b: 72,  name: 'orange' },
    { r: 202, g: 152, b: 73,  name: 'yellow' },
    { r: 82,  g: 158, b: 114, name: 'green' },
    { r: 94,  g: 135, b: 201, name: 'blue' },
    { r: 144, g: 101, b: 176, name: 'purple' },
    { r: 193, g: 76,  b: 138, name: 'pink' },
    { r: 212, g: 76,  b: 71,  name: 'red' },
  ];

  const rgbMatch = lower.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch.map(Number);
    let closest = 'default';
    let minDist = Infinity;
    for (const entry of rgbMap) {
      const dist = Math.abs(r - entry.r) + Math.abs(g - entry.g) + Math.abs(b - entry.b);
      if (dist < minDist && dist < 80) { // Threshold for matching
        minDist = dist;
        closest = entry.name;
      }
    }
    return closest;
  }

  return 'default';
}

/**
 * Map a CSS background-color to a Notion background color name.
 */
function mapCssBgColorToNotion(cssBgColor: string): string {
  const color = mapCssColorToNotion(cssBgColor);
  if (color !== 'default') return `${color}_background`;
  return 'default';
}

/**
 * Extract Notion color from a CSS class name.
 * Notion exports use classes like "highlight-yellow" or "color-red".
 */
function extractNotionColorClass(className: string): string | null {
  const colors = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
  for (const color of colors) {
    if (className.includes(color)) {
      if (className.includes('background')) {
        return `${color}_background`;
      }
      return color;
    }
  }
  return null;
}

/**
 * Extract highlight color from a <mark> element's style.
 */
function extractHighlightColor(node: Element): string | null {
  const style = node.getAttribute('style') || '';
  const bgMatch = style.match(/background(?:-color)?:\s*([^;]+)/i);
  if (bgMatch) {
    return mapCssBgColorToNotion(bgMatch[1].trim());
  }
  return null;
}

// ─── Utilities ───────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── React VDOM Renderer ──────────────────────────────────────────

/**
 * Render structured RichTextSpan[] into lightweight, pure React VDOM.
 * Bypasses all ProseMirror, TipTap, and heavy editor DOM overhead.
 */
export function renderRichTextToVDOM(spans: RichTextSpan[]): React.ReactNode {
  if (!spans || spans.length === 0) return null;

  return spans.map((span, index) => {
    // 1. Mention Chip (@page)
    if (span.mention) {
      return React.createElement(
        'a',
        {
          key: index,
          className: 'page-mention mention-chip',
          href: span.href || `/app/page/${span.mention.pageId}`,
          'data-page-id': span.mention.pageId,
          contentEditable: false,
        },
        React.createElement('span', { className: 'mention-icon' }, span.mention.icon || '📄'),
        React.createElement('span', { className: 'mention-label' }, span.mention.title || span.text)
      );
    }

    // 2. Transclusion Chip (((blockId)))
    if (span.transclusion) {
      return React.createElement(
        'span',
        {
          key: index,
          className: 'transclusion-chip',
          'data-transclusion': '',
          'data-block-id': span.transclusion.blockId,
          'data-page-id': span.transclusion.pageId,
          'data-text': span.transclusion.text,
          'data-block-type': span.transclusion.blockType,
          contentEditable: false,
          title: `Transcluded from ${span.transclusion.pageId}`,
        },
        `⎘ ${span.transclusion.text}`
      );
    }

    // 3. Database Chip
    if (span.databaseChip) {
      return React.createElement(
        'span',
        {
          key: index,
          className: 'db-chip',
          'data-db-id': span.databaseChip.databaseId,
          'data-page-id': span.databaseChip.pageId,
          contentEditable: false,
        },
        `📊 ${span.databaseChip.label || span.text}`
      );
    }

    // 4. Formatted Text Span
    let node: React.ReactNode = span.text;

    // Handle newlines
    if (typeof span.text === 'string' && span.text.includes('\n')) {
      const parts = span.text.split('\n');
      node = parts.map((part, pIdx) =>
        React.createElement(
          React.Fragment,
          { key: pIdx },
          pIdx > 0 ? React.createElement('br') : null,
          part
        )
      );
    }

    const { annotations, href } = span;
    if (annotations) {
      if (annotations.code) {
        node = React.createElement('code', null, node);
      }
      if (annotations.bold) {
        node = React.createElement('strong', null, node);
      }
      if (annotations.italic) {
        node = React.createElement('em', null, node);
      }
      if (annotations.underline) {
        node = React.createElement('u', null, node);
      }
      if (annotations.strikethrough) {
        node = React.createElement('s', null, node);
      }
      if (annotations.backgroundColor && annotations.backgroundColor !== 'default') {
        node = React.createElement('mark', { className: `hl-${annotations.backgroundColor}` }, node);
      }
      if (annotations.color && annotations.color !== 'default') {
        node = React.createElement('span', { className: `color-${annotations.color}` }, node);
      }
    }

    if (href) {
      node = React.createElement(
        'a',
        {
          href,
          className: 'editor-link',
          target: '_blank',
          rel: 'noopener noreferrer',
          onClick: (e: React.MouseEvent) => {
            if (!e.metaKey && !e.ctrlKey) {
              e.stopPropagation();
            }
          },
        },
        node
      );
    }

    return React.createElement(React.Fragment, { key: index }, node);
  });
}
