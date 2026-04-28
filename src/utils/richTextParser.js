// ─── Rich Text Parser ───────────────────────────────────────────
// Converts HTML strings ↔ structured RichTextSpan[] arrays.
// This is the critical bridge between Notion export HTML and our
// annotation-based data model.

import { createAnnotations, createRichTextSpan } from './blockSchema';

// ─── HTML → RichTextSpan[] ───────────────────────────────────────

/**
 * Parse an HTML string into an array of RichTextSpan objects.
 * Handles nested formatting tags, links, colored spans, and inline code.
 *
 * @param {string} html - HTML content (e.g. from Notion export or TipTap)
 * @returns {Array<{text: string, annotations: object, href: string|null}>}
 */
export function parseHtmlToRichText(html) {
  if (!html || typeof html !== 'string') return [];

  // Strip wrapping <p> tags for single-paragraph content
  const trimmed = html.trim();
  if (!trimmed) return [];

  // Use DOMParser for correct HTML interpretation
  const doc = new DOMParser().parseFromString(
    `<body>${trimmed}</body>`,
    'text/html'
  );
  const body = doc.body;
  if (!body) return [];

  const spans = [];
  walkNode(body, createAnnotations(), null, spans);

  // Post-process: merge adjacent spans with identical annotations
  return mergeAdjacentSpans(spans);
}

/**
 * Recursive DOM walker. Accumulates formatting context as it descends,
 * and emits RichTextSpan objects for each text node.
 *
 * @param {Node} node - Current DOM node
 * @param {object} annotations - Current annotation state (inherited)
 * @param {string|null} href - Current link URL (inherited)
 * @param {Array} spans - Output array (mutated)
 */
function walkNode(node, annotations, href, spans) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    // Don't skip whitespace-only nodes — they may be meaningful spaces
    // between inline elements. But skip truly empty strings.
    if (text.length > 0) {
      spans.push(createRichTextSpan(text, { ...annotations }, href));
    }
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const tag = node.tagName.toLowerCase();

  // Skip non-content elements
  if (tag === 'style' || tag === 'script' || tag === 'head' || tag === 'meta' || tag === 'link') {
    return;
  }

  // Clone annotations for this branch (avoid mutating parent)
  let childAnnotations = { ...annotations };
  let childHref = href;

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
    childAnnotations.backgroundColor = extractHighlightColor(node) || 'yellow_background';
  }

  // Links
  if (tag === 'a') {
    childHref = node.getAttribute('href') || null;
  }

  // Notion-specific: <span> with style for colors
  if (tag === 'span') {
    const style = node.getAttribute('style') || '';
    const colorMatch = style.match(/color:\s*([^;]+)/i);
    const bgMatch = style.match(/background(?:-color)?:\s*([^;]+)/i);

    if (colorMatch) {
      childAnnotations.color = mapCssColorToNotion(colorMatch[1].trim());
    }
    if (bgMatch) {
      childAnnotations.backgroundColor = mapCssBgColorToNotion(bgMatch[1].trim());
    }

    // Notion export class-based colors
    const classList = [...(node.classList || [])];
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
  for (const child of node.childNodes) {
    walkNode(child, childAnnotations, childHref, spans);
  }
}

// ─── RichTextSpan[] → HTML ───────────────────────────────────────

/**
 * Convert structured RichTextSpan array back to HTML string.
 * Used to feed content into TipTap editor.
 *
 * @param {Array} spans - Array of RichTextSpan objects
 * @returns {string} HTML string
 */
export function richTextToHtml(spans) {
  if (!spans || spans.length === 0) return '';

  let html = '';
  for (const span of spans) {
    let text = escapeHtml(span.text);
    const a = span.annotations || {};

    // Apply formatting wrappers (innermost first)
    if (a.code) text = `<code>${text}</code>`;
    if (a.strikethrough) text = `<s>${text}</s>`;
    if (a.underline) text = `<u>${text}</u>`;
    if (a.italic) text = `<em>${text}</em>`;
    if (a.bold) text = `<strong>${text}</strong>`;

    // Color wrapping
    const styles = [];
    if (a.color && a.color !== 'default') {
      styles.push(`color: var(--notion-${a.color})`);
    }
    if (a.backgroundColor && a.backgroundColor !== 'default') {
      styles.push(`background: var(--notion-${a.backgroundColor})`);
    }

    if (styles.length > 0) {
      text = `<span style="${styles.join('; ')}">${text}</span>`;
    }

    // Highlight (mark)
    if (a.backgroundColor && a.backgroundColor !== 'default' && !styles.length) {
      text = `<mark>${text}</mark>`;
    }

    // Link wrapping
    if (span.href) {
      text = `<a href="${escapeHtml(span.href)}" rel="noopener noreferrer">${text}</a>`;
    }

    html += text;
  }

  // Wrap in paragraph tag for TipTap compatibility
  return `<p>${html}</p>`;
}

/**
 * Convert rich text spans to plain text (no formatting).
 */
export function richTextToPlainText(spans) {
  if (!spans || spans.length === 0) return '';
  return spans.map(s => s.text).join('');
}

// ─── Span Merging ────────────────────────────────────────────────

/**
 * Merge adjacent spans that have identical annotations and href.
 * Reduces span count and simplifies the data.
 */
function mergeAdjacentSpans(spans) {
  if (spans.length === 0) return [];

  const result = [spans[0]];
  for (let i = 1; i < spans.length; i++) {
    const prev = result[result.length - 1];
    const curr = spans[i];

    if (annotationsEqual(prev.annotations, curr.annotations) && prev.href === curr.href) {
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
function annotationsEqual(a, b) {
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
function mapCssColorToNotion(cssColor) {
  const lower = cssColor.toLowerCase().trim();

  // Direct Notion color names
  const directMap = {
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
function mapCssBgColorToNotion(cssBgColor) {
  const color = mapCssColorToNotion(cssBgColor);
  if (color !== 'default') return `${color}_background`;
  return 'default';
}

/**
 * Extract Notion color from a CSS class name.
 * Notion exports use classes like "highlight-yellow" or "color-red".
 */
function extractNotionColorClass(className) {
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
function extractHighlightColor(node) {
  const style = node.getAttribute('style') || '';
  const bgMatch = style.match(/background(?:-color)?:\s*([^;]+)/i);
  if (bgMatch) {
    return mapCssBgColorToNotion(bgMatch[1].trim());
  }
  return null;
}

// ─── Utilities ───────────────────────────────────────────────────

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
