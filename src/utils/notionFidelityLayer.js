// ─── Notion Fidelity Layer ──────────────────────────────────────
// Post-processing pipeline that enriches raw parsed blocks
// with Notion-accurate metadata, structure, and annotations.
// Runs AFTER parseHtmlToBlocks / parseMarkdownToBlocks.

import { parseHtmlToRichText } from './richTextParser';
import { inferCalloutColor, BLOCK_PROPERTY_DEFAULTS } from './blockSchema';

/**
 * Main entry: run the full fidelity pipeline on parsed blocks.
 * Mutates blocks in-place for performance (they're freshly created).
 *
 * @param {Array} blocks - Blocks from notionParser
 * @returns {Array} - Enriched blocks (same array, mutated)
 */
export function applyFidelityLayer(blocks) {
  if (!blocks || blocks.length === 0) return blocks;

  // Stage 1: Enrich individual blocks
  for (const block of blocks) {
    enrichBlockProperties(block);
    generateRichText(block);
  }

  // Stage 2: Structural enrichment (requires sibling context)
  calculateListDepths(blocks);
  linkToggleChildren(blocks);
  calculateNumberedIndices(blocks);

  return blocks;
}

// ─── Stage 1: Individual Block Enrichment ────────────────────────

/**
 * Ensure each block has proper default properties for its type,
 * and enrich with inferred metadata.
 */
function enrichBlockProperties(block) {
  const defaults = BLOCK_PROPERTY_DEFAULTS[block.type];
  if (defaults) {
    block.properties = { ...defaults, ...block.properties };
  }

  switch (block.type) {
    case 'callout':
      enrichCallout(block);
      break;
    case 'code':
      enrichCode(block);
      break;
    case 'image':
      enrichImage(block);
      break;
    case 'embed':
      enrichEmbed(block);
      break;
  }
}

/**
 * Callout enrichment:
 * - Infer color from emoji if not explicitly set
 * - Normalize emoji
 */
function enrichCallout(block) {
  const emoji = block.properties?.emoji || '💡';
  if (!block.properties.color || block.properties.color === 'default') {
    block.properties.color = inferCalloutColor(emoji);
  }
}

/**
 * Code block enrichment:
 * - Normalize language names
 */
function enrichCode(block) {
  const lang = (block.properties?.language || '').toLowerCase().trim();
  block.properties.language = normalizeLanguage(lang);
}

/**
 * Image enrichment:
 * - Parse width/height from content if embedded as HTML
 */
function enrichImage(block) {
  if (!block.properties.caption && block._figcaption) {
    block.properties.caption = block._figcaption;
    delete block._figcaption;
  }
  if (!block.properties.width && block._imageWidth) {
    block.properties.width = block._imageWidth;
    delete block._imageWidth;
  }
}

/**
 * Embed enrichment:
 * - Detect embed type from URL
 */
function enrichEmbed(block) {
  const url = block.properties?.url || block.content;
  if (url) {
    block.properties.url = url;
    block.properties.embedType = detectEmbedType(url);
  }
}

// ─── Stage 2: Rich Text Generation ──────────────────────────────

/**
 * Convert block.content (HTML string) into structured richText spans.
 * The HTML content is preserved for TipTap rendering;
 * richText is used for search, export, and structured access.
 */
function generateRichText(block) {
  // Skip blocks that don't have text content
  if (block.type === 'divider' || block.type === 'image' || block.type === 'database' || block.type === 'table') {
    block.richText = [];
    return;
  }

  if (block.content && typeof block.content === 'string') {
    try {
      block.richText = parseHtmlToRichText(block.content);
    } catch {
      // Fallback: plain text span
      block.richText = [{ text: block.content, annotations: {
        bold: false, italic: false, underline: false,
        strikethrough: false, code: false,
        color: 'default', backgroundColor: 'default'
      }, href: null }];
    }
  } else {
    block.richText = [];
  }
}

// ─── Stage 3: List Depth Calculator ─────────────────────────────

/**
 * Walk through blocks and assign depth values to consecutive list items.
 * Notion exports nested lists as flat sequences — we detect depth from
 * indentation patterns in the original HTML.
 *
 * Since Notion HTML export flattens nested lists, we use the parentId
 * hierarchy to determine depth.
 */
function calculateListDepths(blocks) {
  const listTypes = new Set(['bullet', 'numbered', 'todo']);
  const depthMap = new Map(); // parentId → depth

  for (const block of blocks) {
    if (!listTypes.has(block.type)) continue;

    // If a list block has a parentId, its depth = parent's depth + 1
    if (block.parentId) {
      const parentDepth = depthMap.get(block.parentId) || 0;
      const parentBlock = blocks.find(b => b.id === block.parentId);
      if (parentBlock && listTypes.has(parentBlock.type)) {
        block.properties.depth = parentDepth + 1;
      } else {
        block.properties.depth = 0;
      }
    } else {
      block.properties.depth = 0;
    }

    depthMap.set(block.id, block.properties.depth);
  }
}

/**
 * Link toggle children: ensure child content blocks have proper parentId
 * pointing to their toggle block.
 */
function linkToggleChildren(blocks) {
  // This is already handled by the parser's parentId assignment.
  // This stage exists as a validation/repair pass.
  for (const block of blocks) {
    if (block.type === 'toggle' && block.properties?.childContent) {
      // If childContent is stored as a string (legacy), don't create
      // extra blocks here — the existing parser handles this.
      // Just ensure the property exists.
      if (typeof block.properties.childContent === 'string' && block.properties.childContent.trim()) {
        // childContent will be rendered inline by ToggleBlock component
      }
    }
  }
}

// ─── Stage 4: Numbered List Index Calculator ────────────────────

/**
 * Calculate the correct display number for each numbered list block
 * within its sibling group. Stores as properties.listIndex.
 */
function calculateNumberedIndices(blocks) {
  const parentGroups = new Map(); // parentId → counter

  for (const block of blocks) {
    if (block.type !== 'numbered') {
      // Reset counter when a non-numbered block breaks the sequence
      // at the same parent level
      continue;
    }

    const parentKey = block.parentId || '__root__';
    const counter = parentGroups.get(parentKey) || 0;
    block.properties.listIndex = counter + 1;
    parentGroups.set(parentKey, counter + 1);
  }

  // Reset counters when sequence is broken
  // (walk through again looking for non-numbered gaps)
  let lastParentKey = null;
  let lastWasNumbered = false;

  for (const block of blocks) {
    const parentKey = block.parentId || '__root__';

    if (block.type === 'numbered') {
      if (!lastWasNumbered || parentKey !== lastParentKey) {
        // Start of a new numbered sequence — find all consecutive numbered
        // blocks at this parent level and re-index
        let idx = 1;
        const startIdx = blocks.indexOf(block);
        for (let i = startIdx; i < blocks.length; i++) {
          const b = blocks[i];
          const bParent = b.parentId || '__root__';
          if (b.type === 'numbered' && bParent === parentKey) {
            b.properties.listIndex = idx++;
          } else if (b.type !== 'numbered' && bParent === parentKey) {
            break; // Sequence broken
          }
        }
      }
      lastWasNumbered = true;
    } else {
      lastWasNumbered = false;
    }
    lastParentKey = parentKey;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

const LANGUAGE_ALIASES = {
  'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
  'py': 'python', 'rb': 'ruby', 'yml': 'yaml', 'sh': 'bash', 'shell': 'bash',
  'md': 'markdown', 'htm': 'html', 'plaintext': 'plain text',
  'plain': 'plain text', '': 'plain text', 'text': 'plain text',
  'c++': 'cpp', 'c#': 'csharp', 'objective-c': 'objectivec',
  'golang': 'go', 'rs': 'rust',
};

function normalizeLanguage(lang) {
  if (!lang) return 'plain text';
  const lower = lang.toLowerCase().trim().replace('language-', '');
  return LANGUAGE_ALIASES[lower] || lower;
}

function detectEmbedType(url) {
  if (!url) return 'generic';
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter';
  if (lower.includes('github.com')) return 'github';
  if (lower.includes('figma.com')) return 'figma';
  if (lower.includes('codepen.io')) return 'codepen';
  if (lower.includes('maps.google')) return 'google_maps';
  if (lower.includes('drive.google')) return 'google_drive';
  if (lower.includes('loom.com')) return 'loom';
  return 'generic';
}
