/**
 * Markdown to Maniac Blocks Parser
 * 
 * Converts Notion exported Markdown into Maniac-compatible block objects
 * with deterministic IDs, accurate indentation hierarchy (parentId),
 * inline database placeholder resolution, and clean property header stripping.
 */

import { generateBlockId } from '../normalization/idGenerator.js';
import { generateLexicalOrder } from '../../../utils/helpers.js';
import { applyFidelityLayer } from '../../../utils/notionFidelityLayer.js';
import { extractNotionUUID, decodeHtmlEntities } from '../normalization/pathNormalizer.js';

/**
 * Parses Markdown content into an array of Maniac block records.
 * 
 * @param {string} md - Raw markdown text
 * @param {string} pageId - Deterministic Maniac Page ID
 * @param {{
 *   isDatabaseRow?: boolean,
 *   pageTitle?: string,
 * }} [options]
 * @returns {import('../model/types').NotionImportBlock[]}
 */
export function parseMarkdownToBlocks(md, pageId, options = {}) {
  if (!md || typeof md !== 'string') return [];

  const rawBlocks = [];
  const decodedMd = decodeHtmlEntities(md);
  const lines = decodedMd.split(/\r?\n/);
  const isDbRow = Boolean(options.isDatabaseRow);
  const targetTitle = (options.pageTitle || '').trim().toLowerCase();

  let i = 0;

  // ─── 1. Strip Redundant Leading Page Title Heading (# <Title>) ───
  while (i < lines.length && !lines[i].trim()) i++;
  if (i < lines.length) {
    const firstLine = lines[i].trim();
    if (firstLine.startsWith('# ')) {
      // Notion always puts `# <Page Title>` as the first non-empty line of the file.
      // Since Maniac displays the title in its PageHeader, this heading is stripped.
      i++;
    }
  }

  // ─── 2. Strip Database Row Property Frontmatter (Status: Done, etc.) ───
  while (i < lines.length && !lines[i].trim()) i++;

  if (isDbRow) {
    while (i < lines.length) {
      const l = lines[i].trim();
      if (!l) {
        // Notion places a blank line between frontmatter properties and body content
        i++;
        break;
      }
      // Check if line is a row property: "Property Name: Value" or ": Value" or "Prop:: Value"
      // Must not be a bullet list (-), todo (- [ ]), blockquote (>), code (```), image (!), or heading (#)
      if (!/^[-*+#>!`]/.test(l) && /^[^\n:]*::?\s*/.test(l)) {
        i++;
      } else {
        break;
      }
    }
  }

  // ─── 3. Parse Remaining Lines with Indentation Stack ──────────────
  const indentStack = []; // Array<{ indent: number, id: string, type: string }>
  let sortCounter = 'a';
  let blockIndex = 0;

  const nextSort = () => {
    const s = sortCounter;
    sortCounter = generateLexicalOrder(sortCounter, null);
    return s;
  };

  const getIndent = (line) => {
    let spaces = 0;
    for (let c = 0; c < line.length; c++) {
      if (line[c] === ' ') spaces++;
      else if (line[c] === '\t') spaces += 4;
      else break;
    }
    return spaces;
  };

  const getParentId = (currentIndent) => {
    while (indentStack.length > 0 && indentStack[indentStack.length - 1].indent >= currentIndent) {
      indentStack.pop();
    }
    return indentStack.length > 0 ? indentStack[indentStack.length - 1].id : null;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    const currentIndent = getIndent(line);

    // Code Block (Fenced)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'plain text';
      let code = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code += (code ? '\n' : '') + lines[i];
        i++;
      }
      const bId = generateBlockId(pageId, blockIndex++, 'code');
      rawBlocks.push({
        id: bId,
        pageId,
        parentId: getParentId(currentIndent),
        type: 'code',
        content: code,
        properties: { language: lang },
        sortOrder: nextSort(),
      });
      i++;
      continue;
    }

    // Standalone Inline Database Link: [Title](path.csv)
    const dbLinkMatch = trimmed.match(/^\[([^\]]+)\]\((.+\.csv)\)$/i);
    if (dbLinkMatch) {
      const dbTitle = dbLinkMatch[1].trim();
      const csvHref = dbLinkMatch[2].trim();
      const uuid = extractNotionUUID(csvHref);
      const bId = generateBlockId(pageId, blockIndex++, 'database_placeholder');

      rawBlocks.push({
        id: bId,
        pageId,
        parentId: getParentId(currentIndent),
        type: 'database_placeholder',
        content: dbTitle,
        properties: {},
        sortOrder: nextSort(),
        _csvHref: csvHref,
        _dbTitle: dbTitle,
        _dbUuid: uuid,
      });
      i++;
      continue;
    }

    // Standalone Embed Link: [https://...](https://...)
    const embedMatch = trimmed.match(/^\[(https?:\/\/.+)\]\(\1\)$/i);
    if (embedMatch) {
      const url = embedMatch[1];
      const bId = generateBlockId(pageId, blockIndex++, 'embed');
      rawBlocks.push({
        id: bId,
        pageId,
        parentId: getParentId(currentIndent),
        type: 'embed',
        content: url,
        properties: { url },
        sortOrder: nextSort(),
      });
      i++;
      continue;
    }

    // Headings (H1, H2, H3)
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const type = level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3';
      const content = headingMatch[2].trim();
      indentStack.length = 0; // Headings reset list nesting
      const bId = generateBlockId(pageId, blockIndex++, type);
      rawBlocks.push({
        id: bId,
        pageId,
        parentId: null,
        type,
        content,
        properties: {},
        sortOrder: nextSort(),
      });
      i++;
      continue;
    }

    // Horizontal Divider
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      const bId = generateBlockId(pageId, blockIndex++, 'divider');
      rawBlocks.push({
        id: bId,
        pageId,
        parentId: getParentId(currentIndent),
        type: 'divider',
        content: '',
        properties: {},
        sortOrder: nextSort(),
      });
      i++;
      continue;
    }

    // Todo / Task List
    const todoMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.*)/);
    if (todoMatch) {
      const checked = todoMatch[1].toLowerCase() === 'x';
      const content = todoMatch[2].trim();
      const parentId = getParentId(currentIndent);
      const bId = generateBlockId(pageId, blockIndex++, 'todo');
      rawBlocks.push({
        id: bId,
        pageId,
        parentId,
        type: 'todo',
        content,
        properties: { checked },
        sortOrder: nextSort(),
      });
      indentStack.push({ indent: currentIndent, id: bId, type: 'todo' });
      i++;
      continue;
    }

    // Bullet List Item
    if (/^[-*+]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[-*+]\s+/, '').trim();
      // Skip completely empty bullet items with no follow-up
      if (!content && i + 1 < lines.length && getIndent(lines[i + 1]) <= currentIndent) {
        i++;
        continue;
      }
      const parentId = getParentId(currentIndent);
      const bId = generateBlockId(pageId, blockIndex++, 'bullet');
      rawBlocks.push({
        id: bId,
        pageId,
        parentId,
        type: 'bullet',
        content,
        properties: {},
        sortOrder: nextSort(),
      });
      indentStack.push({ indent: currentIndent, id: bId, type: 'bullet' });
      i++;
      continue;
    }

    // Numbered List Item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const content = numMatch[2].trim();
      const parentId = getParentId(currentIndent);
      const bId = generateBlockId(pageId, blockIndex++, 'numbered');
      rawBlocks.push({
        id: bId,
        pageId,
        parentId,
        type: 'numbered',
        content,
        properties: {},
        sortOrder: nextSort(),
      });
      indentStack.push({ indent: currentIndent, id: bId, type: 'numbered' });
      i++;
      continue;
    }

    // Callout or Blockquote
    if (trimmed.startsWith('> ') || trimmed === '>') {
      let quoteText = trimmed.startsWith('> ') ? trimmed.slice(2) : '';
      i++;
      while (i < lines.length && (lines[i].trim().startsWith('> ') || lines[i].trim() === '>')) {
        const qLine = lines[i].trim();
        quoteText += (quoteText ? '\n' : '') + (qLine.startsWith('> ') ? qLine.slice(2) : '');
        i++;
      }

      const parentId = getParentId(currentIndent);
      const emojiMatch = quoteText.match(/^([\p{Emoji}\u200d]+)\s*(.*)/su);
      if (emojiMatch && emojiMatch[1] && emojiMatch[2]) {
        const bId = generateBlockId(pageId, blockIndex++, 'callout');
        rawBlocks.push({
          id: bId,
          pageId,
          parentId,
          type: 'callout',
          content: emojiMatch[2].trim(),
          properties: { emoji: emojiMatch[1], color: 'default' },
          sortOrder: nextSort(),
        });
      } else {
        const bId = generateBlockId(pageId, blockIndex++, 'quote');
        rawBlocks.push({
          id: bId,
          pageId,
          parentId,
          type: 'quote',
          content: quoteText.trim(),
          properties: {},
          sortOrder: nextSort(),
        });
      }
      continue;
    }

    // Image Reference
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\((.+)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1].trim();
      const src = imgMatch[2].trim();
      const bId = generateBlockId(pageId, blockIndex++, 'image');
      rawBlocks.push({
        id: bId,
        pageId,
        parentId: getParentId(currentIndent),
        type: 'image',
        content: '',
        properties: { hash: '', caption: alt, width: null, alignment: 'center' },
        sortOrder: nextSort(),
        _imageSrc: src,
      });
      i++;
      continue;
    }

    // Multi-line continuation: If current line does not start with any block marker,
    // and immediately follows a previous block without a blank line
    if (rawBlocks.length > 0 && i > 0 && lines[i - 1].trim()) {
      const lastBlock = rawBlocks[rawBlocks.length - 1];
      if (['bullet', 'numbered', 'todo', 'text', 'quote'].includes(lastBlock.type)) {
        lastBlock.content += (lastBlock.content ? '\n' : '') + trimmed;
        i++;
        continue;
      }
    }

    // Default: Paragraph / Text block
    const bId = generateBlockId(pageId, blockIndex++, 'text');
    rawBlocks.push({
      id: bId,
      pageId,
      parentId: getParentId(currentIndent),
      type: 'text',
      content: trimmed,
      properties: {},
      sortOrder: nextSort(),
    });
    i++;
  }

  // Enrich with Maniac fidelity layer (richText, word count, timestamps, monotonic versioning)
  const now = Date.now();
  const enriched = rawBlocks.map(block => {
    const base = {
      id: block.id,
      pageId: block.pageId,
      parentId: block.parentId,
      type: block.type,
      content: block.content || '',
      properties: block.properties || {},
      sortOrder: block.sortOrder,
      orderKey: block.sortOrder,
      version: '1',
      actorId: 'notion-importer',
      updatedLogical: 1,
      createdAt: now,
      updatedAt: now,
      words: block.content ? block.content.trim().split(/\s+/).length : 0,
    };
    if (block._imageSrc) {
      base._imageSrc = block._imageSrc;
    }
    if (block._dbUuid) {
      base._dbUuid = block._dbUuid;
      base._dbTitle = block._dbTitle;
      base._csvHref = block._csvHref;
    }
    return base;
  });

  return applyFidelityLayer(enriched);
}
