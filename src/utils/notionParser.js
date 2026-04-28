import JSZip from 'jszip';
import { createId, generateLexicalOrder } from './helpers';
import { applyFidelityLayer } from './notionFidelityLayer';

// ─── Notion Export Parser ───────────────────────────────────────
// Accepts a Notion export ZIP (HTML or Markdown+CSV) and converts
// it into Maniac-compatible pages, blocks, database rows/cells, and blobs.

// Yield control to the main thread to prevent UI freezing during heavy parsing
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Main entry: parse a Notion ZIP file into Maniac data
 * @param {File} file - The ZIP file from user input
 * @param {(progress: {phase: string, percent: number, detail: string}) => void} onProgress
 * @returns {Promise<{pages, blocks, databaseRows, databaseCells, blobs}>}
 */
export async function parseNotionExport(file, onProgress = () => {}) {
  onProgress({ phase: 'extracting', percent: 5, detail: 'Extracting ZIP...' });
  const zip = await JSZip.loadAsync(file);

  // Detect format
  const filePaths = Object.keys(zip.files);
  const hasHtml = filePaths.some(f => f.endsWith('.html'));
  const hasMd = filePaths.some(f => f.endsWith('.md'));
  const format = hasHtml ? 'html' : hasMd ? 'markdown' : 'unknown';

  if (format === 'unknown') {
    throw new Error('Unrecognized Notion export format. Please export as HTML or Markdown & CSV.');
  }

  onProgress({ phase: 'analyzing', percent: 10, detail: 'Analyzing structure...' });

  // Build folder tree → page hierarchy
  const allPages = [];
  const allBlocks = [];
  const allDbRows = [];
  const allDbCells = [];
  const allBlobs = [];

  // Collect content files and image files
  const contentFiles = [];
  const imageFiles = [];
  const csvFiles = [];

  for (const [path, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const lower = path.toLowerCase();
    if (lower.endsWith('.html') || lower.endsWith('.md')) {
      contentFiles.push({ path, zipEntry });
    } else if (lower.endsWith('.csv')) {
      csvFiles.push({ path, zipEntry });
    } else if (/\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)$/i.test(lower)) {
      imageFiles.push({ path, zipEntry });
    }
  }

  // Sort content files by path depth so parents are created before children
  contentFiles.sort((a, b) => a.path.split('/').length - b.path.split('/').length);

  // Filter out index.html and index.md files which are just root tables of contents
  const validContentFiles = contentFiles.filter(f => {
    const name = f.path.split('/').pop().toLowerCase();
    return name !== 'index.html' && name !== 'index.md';
  });

  // ─── Phase 1: Create pages from folder/file structure ─────
  onProgress({ phase: 'pages', percent: 20, detail: `Creating ${validContentFiles.length} pages...` });

  const pageMap = new Map(); // subpageFolder -> page.id

  for (let i = 0; i < validContentFiles.length; i++) {
    const { path } = validContentFiles[i];
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    const title = cleanNotionFileName(fileName);
    const folderPath = parts.slice(0, -1).join('/');

    // Find parent page
    let parentId = pageMap.get(folderPath) || null;

    // Fallback check by parent directory name if exact path fails
    if (!parentId && parts.length > 1) {
      const parentDirName = parts[parts.length - 2];
      const parentTitle = cleanNotionFileName(parentDirName);
      for (const pg of allPages) {
        if (pg.title === parentTitle) {
          parentId = pg.id;
          break;
        }
      }
    }

    const siblings = allPages.filter(p => p.parentId === parentId);
    const lastSort = siblings.length > 0 ? siblings[siblings.length - 1].sortOrder : null;
    const sortOrder = generateLexicalOrder(lastSort, null);

    const page = {
      id: createId(),
      parentId,
      title: title || 'Untitled',
      icon: guessPageIcon(title),
      coverImage: null,
      sortOrder,
      isArchived: false,
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    allPages.push(page);
    
    // The folder containing subpages for this page has exactly this path without extension
    const subpageFolder = path.substring(0, path.lastIndexOf('.'));
    pageMap.set(subpageFolder, page.id);
  }

  // ─── Phase 2: Parse content files into blocks ─────
  const totalFiles = validContentFiles.length + csvFiles.length;
  let processed = 0;

  for (const { path, zipEntry } of validContentFiles) {
    const text = await zipEntry.async('string');
    const subpageFolder = path.substring(0, path.lastIndexOf('.'));

    // Find the page for this file
    const pageId = pageMap.get(subpageFolder);
    let page = allPages.find(p => p.id === pageId);
    
    if (!page) {
      // Fallback: match by title
      const parts = path.split('/');
      const title = cleanNotionFileName(parts[parts.length - 1]);
      page = allPages.find(p => p.title === title);
    }
    if (!page) continue;

    const blocks = format === 'html'
      ? parseHtmlToBlocks(text, page.id)
      : parseMarkdownToBlocks(text, page.id);

    // Apply Notion fidelity enrichment (callout colors, list depths, rich text, etc.)
    applyFidelityLayer(blocks);

    allBlocks.push(...blocks);
    processed++;
    const pct = 30 + Math.floor((processed / totalFiles) * 40);
    onProgress({ phase: 'parsing', percent: pct, detail: `Parsed: ${page.title}` });
  }

  // ─── Phase 3: Parse CSV databases ─────
  for (const { path, zipEntry } of csvFiles) {
    const csvText = await zipEntry.async('string');
    const parts = path.split('/');
    const folderPath = parts.slice(0, -1).join('/');
    const title = cleanNotionFileName(parts[parts.length - 1]);

    const subpageFolder = path.substring(0, path.lastIndexOf('.'));
    let pageId = pageMap.get(subpageFolder);
    let page = allPages.find(p => p.id === pageId);

    // Find or create the parent page
    let parentId = pageMap.get(folderPath) || null;

    if (!page) {
      // Fallback: match by title at same hierarchy level
      page = allPages.find(p => p.title === title && p.parentId === parentId);
    }

    if (!page) {
      const siblings = allPages.filter(p => p.parentId === parentId);
      const lastSort = siblings.length > 0 ? siblings[siblings.length - 1].sortOrder : null;
      
      // Create a page for this database
      page = {
        id: createId(), parentId, title: title || 'Imported Database',
        icon: '📊', coverImage: null, sortOrder: generateLexicalOrder(lastSort, null),
        isArchived: false, isFavorite: false, createdAt: Date.now(), updatedAt: Date.now(),
      };
      allPages.push(page);
      pageMap.set(subpageFolder, page.id);
    }

    const { block, rows, cells } = parseCsvToDatabase(csvText, page.id);
    allBlocks.push(block);
    allDbRows.push(...rows);
    allDbCells.push(...cells);

    processed++;
    const pct = 30 + Math.floor((processed / totalFiles) * 40);
    onProgress({ phase: 'databases', percent: pct, detail: `Database: ${title}` });

    // Yield to main thread periodically to prevent UI freezing
    if (processed % 10 === 0) await yieldToMain();
  }

  // ─── Phase 4: Extract images (parallel batches) ─────
  onProgress({ phase: 'images', percent: 75, detail: `Extracting ${imageFiles.length} images...` });

  const IMAGE_BATCH_SIZE = 5;
  for (let batchStart = 0; batchStart < imageFiles.length; batchStart += IMAGE_BATCH_SIZE) {
    const batch = imageFiles.slice(batchStart, batchStart + IMAGE_BATCH_SIZE);
    
    // Process batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(async ({ path, zipEntry }) => {
        const data = await zipEntry.async('arraybuffer');
        const ext = path.split('.').pop().toLowerCase();
        const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon' };
        const mimeType = mimeMap[ext] || 'application/octet-stream';
        const blob = new Blob([data], { type: mimeType });
        const hash = await hashBlob(data);
        return { hash, blob, mimeType, size: blob.size, createdAt: Date.now(), path };
      })
    );

    for (const result of batchResults) {
      if (result.status !== 'fulfilled') continue;
      const { hash, blob, mimeType, size, createdAt, path } = result.value;

      allBlobs.push({ hash, blob, mimeType, size, createdAt });

      // Link image blocks that reference this file
      const fileName = path.split('/').pop();
      for (const block of allBlocks) {
        if (block.type === 'image' && block._imageSrc) {
          const srcName = block._imageSrc.split('/').pop();
          if (decodeURIComponent(srcName) === decodeURIComponent(fileName) || srcName === fileName) {
            block.properties = { ...block.properties, hash };
            delete block._imageSrc;
          }
        }
      }
    }

    const progress = Math.min(batchStart + IMAGE_BATCH_SIZE, imageFiles.length);
    onProgress({ phase: 'images', percent: 75 + Math.floor((progress / imageFiles.length) * 15), detail: `Image ${progress}/${imageFiles.length}` });

    // Yield between batches
    await yieldToMain();
  }

  // Clean up temp markers
  for (const block of allBlocks) {
    delete block._imageSrc;
  }

  onProgress({ phase: 'complete', percent: 100, detail: 'Import ready!' });

  return { pages: allPages, blocks: allBlocks, databaseRows: allDbRows, databaseCells: allDbCells, blobs: allBlobs };
}

// ─── HTML Parser ────────────────────────────────────────────────

function parseHtmlToBlocks(html, pageId) {
  const blocks = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.querySelector('.page-body') || doc.body;
  if (!body) return blocks;

  let sortCounter = 'a';
  const nextSort = () => {
    const s = sortCounter;
    sortCounter = generateLexicalOrder(sortCounter, null);
    return s;
  };

  const processNode = (node, parentId = null) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        blocks.push(makeBlock(pageId, 'text', text, {}, nextSort(), parentId));
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();
    const classList = [...(node.classList || [])];

    // Headings
    if (tag === 'h1') {
      blocks.push(makeBlock(pageId, 'heading1', getInnerHtml(node), {}, nextSort(), parentId));
      return;
    }
    if (tag === 'h2') {
      blocks.push(makeBlock(pageId, 'heading2', getInnerHtml(node), {}, nextSort(), parentId));
      return;
    }
    if (tag === 'h3') {
      blocks.push(makeBlock(pageId, 'heading3', getInnerHtml(node), {}, nextSort(), parentId));
      return;
    }

    // Divider
    if (tag === 'hr') {
      blocks.push(makeBlock(pageId, 'divider', '', {}, nextSort(), parentId));
      return;
    }

    // Callout — detect from figure.callout or div with callout class
    if ((tag === 'figure' || tag === 'div') && classList.some(c => c.includes('callout'))) {
      const emojiEl = node.querySelector('.icon');
      const emoji = emojiEl ? emojiEl.textContent.trim() : '💡';
      const contentEl = node.querySelector('.callout-text') || node;
      const text = getInnerHtml(contentEl).replace(emoji, '').trim();
      // Extract color from Notion's class (e.g. 'callout-color-yellow_background')
      const colorClass = classList.find(c => c.startsWith('callout-color-'));
      const color = colorClass ? colorClass.replace('callout-color-', '') : 'default';
      blocks.push(makeBlock(pageId, 'callout', text, { emoji, color }, nextSort(), parentId));
      return;
    }

    // Code block
    if (tag === 'pre') {
      const codeEl = node.querySelector('code');
      const text = codeEl ? codeEl.textContent : node.textContent;
      const lang = codeEl?.className?.replace('language-', '') || 'plain text';
      blocks.push(makeBlock(pageId, 'code', text, { language: lang }, nextSort(), parentId));
      return;
    }

    // Image — extract caption, width, alt
    if (tag === 'img' || (tag === 'figure' && node.querySelector('img'))) {
      const img = tag === 'img' ? node : node.querySelector('img');
      if (img) {
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';
        const style = img.getAttribute('style') || '';
        const widthMatch = style.match(/width:\s*(\d+)px/i) || img.getAttribute('width');
        const width = widthMatch ? (typeof widthMatch === 'string' ? parseInt(widthMatch) : parseInt(widthMatch[1])) : null;
        // Extract figcaption if inside a figure
        const figcaption = tag === 'figure' ? node.querySelector('figcaption') : null;
        const caption = figcaption ? getTextContent(figcaption) : alt;
        const props = { hash: '', caption: caption || '', width, alignment: 'center' };
        const block = makeBlock(pageId, 'image', '', props, nextSort(), parentId);
        block._imageSrc = src;
        blocks.push(block);
      }
      return;
    }

    // Embed — detect bookmark/embed links
    if (tag === 'figure' && classList.some(c => c.includes('bookmark') || c.includes('embed'))) {
      const linkEl = node.querySelector('a');
      const url = linkEl ? linkEl.getAttribute('href') : '';
      const caption = getTextContent(node.querySelector('figcaption') || node.querySelector('.bookmark-title') || node).trim();
      if (url) {
        blocks.push(makeBlock(pageId, 'embed', caption, { url, caption }, nextSort(), parentId));
        return;
      }
    }

    // Blockquote
    if (tag === 'blockquote') {
      blocks.push(makeBlock(pageId, 'quote', getInnerHtml(node), {}, nextSort(), parentId));
      return;
    }

    // Toggle (details/summary)
    if (tag === 'details') {
      const summary = node.querySelector('summary');
      const summaryText = summary ? getTextContent(summary) : 'Toggle';
      const childContent = getTextContent(node).replace(summaryText, '').trim();
      blocks.push(makeBlock(pageId, 'toggle', summaryText, { expanded: false, childContent }, nextSort(), parentId));
      return;
    }

    // Table
    if (tag === 'table') {
      const tableData = parseHtmlTable(node);
      if (tableData.headers.length > 0) {
        blocks.push(makeBlock(pageId, 'table', '', { headers: tableData.headers, rows: tableData.rows }, nextSort(), parentId));
      }
      return;
    }

    // Lists — handle nesting recursively
    if (tag === 'ul' || tag === 'ol') {
      const items = node.querySelectorAll(':scope > li');
      items.forEach(li => {
        const checkbox = li.querySelector(':scope > input[type="checkbox"], :scope > label > input[type="checkbox"]');
        let blockType;
        let props = {};
        if (checkbox) {
          blockType = 'todo';
          props.checked = checkbox.checked || checkbox.hasAttribute('checked');
        } else if (tag === 'ol') {
          blockType = 'numbered';
        } else {
          blockType = 'bullet';
        }

        // Get direct text content (exclude nested lists)
        const textParts = [];
        for (const child of li.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            textParts.push(child.textContent);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const childTag = child.tagName.toLowerCase();
            if (childTag !== 'ul' && childTag !== 'ol') {
              textParts.push(child.outerHTML || child.textContent);
            }
          }
        }
        const content = textParts.join('').trim();
        const listBlock = makeBlock(pageId, blockType, content, props, nextSort(), parentId);
        blocks.push(listBlock);

        // Process nested lists as children
        const nestedList = li.querySelector(':scope > ul, :scope > ol');
        if (nestedList) {
          // Recurse: create child blocks with parentId pointing to this list item
          const nestedTag = nestedList.tagName.toLowerCase();
          const nestedItems = nestedList.querySelectorAll(':scope > li');
          nestedItems.forEach(nestedLi => {
            const nestedCheckbox = nestedLi.querySelector(':scope > input[type="checkbox"]');
            let nestedType;
            let nestedProps = { depth: 1 };
            if (nestedCheckbox) {
              nestedType = 'todo';
              nestedProps.checked = nestedCheckbox.checked || nestedCheckbox.hasAttribute('checked');
            } else if (nestedTag === 'ol') {
              nestedType = 'numbered';
            } else {
              nestedType = 'bullet';
            }
            const nestedContent = getInnerHtml(nestedLi).replace(/<(ul|ol)[\s\S]*$/i, '').trim();
            blocks.push(makeBlock(pageId, nestedType, nestedContent, nestedProps, nextSort(), listBlock.id));
          });
        }
      });
      return;
    }

    // Paragraph
    if (tag === 'p') {
      const text = getInnerHtml(node).trim();
      if (text) {
        blocks.push(makeBlock(pageId, 'text', text, {}, nextSort(), parentId));
      }
      return;
    }

    // Div containers — recurse into children
    if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'main' || tag === 'header') {
      for (const child of node.children) {
        processNode(child, parentId);
      }
      return;
    }

    // Fallback: if it has meaningful text, create a text block
    const fallbackText = getTextContent(node).trim();
    if (fallbackText && tag !== 'style' && tag !== 'script' && tag !== 'head' && tag !== 'link' && tag !== 'meta' && tag !== 'title') {
      blocks.push(makeBlock(pageId, 'text', fallbackText, {}, nextSort(), parentId));
    }
  };

  for (const child of body.children) {
    processNode(child);
  }

  return blocks;
}

function parseHtmlTable(tableEl) {
  const headers = [];
  const rows = [];
  const headerRow = tableEl.querySelector('thead tr') || tableEl.querySelector('tr');
  if (headerRow) {
    headerRow.querySelectorAll('th, td').forEach(cell => {
      headers.push(cell.textContent.trim());
    });
  }
  const bodyRows = tableEl.querySelectorAll('tbody tr');
  (bodyRows.length > 0 ? bodyRows : tableEl.querySelectorAll('tr')).forEach((tr, i) => {
    if (i === 0 && bodyRows.length === 0) return; // skip header row
    const cells = [];
    tr.querySelectorAll('td, th').forEach(cell => cells.push(cell.textContent.trim()));
    if (cells.length > 0) rows.push(cells);
  });
  return { headers, rows };
}

// ─── Markdown Parser ────────────────────────────────────────────

function parseMarkdownToBlocks(md, pageId) {
  const blocks = [];
  const lines = md.split('\n');
  let sortCounter = 'a';
  const nextSort = () => {
    const s = sortCounter;
    sortCounter = generateLexicalOrder(sortCounter, null);
    return s;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) { i++; continue; }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const type = level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3';
      blocks.push(makeBlock(pageId, type, headingMatch[2], {}, nextSort()));
      i++; continue;
    }

    // Divider
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push(makeBlock(pageId, 'divider', '', {}, nextSort()));
      i++; continue;
    }

    // Todo
    const todoMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.*)/);
    if (todoMatch) {
      const checked = todoMatch[1].toLowerCase() === 'x';
      blocks.push(makeBlock(pageId, 'todo', todoMatch[2], { checked }, nextSort()));
      i++; continue;
    }

    // Bullet
    if (/^[-*+]\s+/.test(trimmed)) {
      blocks.push(makeBlock(pageId, 'bullet', trimmed.replace(/^[-*+]\s+/, ''), {}, nextSort()));
      i++; continue;
    }

    // Numbered
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      blocks.push(makeBlock(pageId, 'numbered', numMatch[2], {}, nextSort()));
      i++; continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'plain text';
      let code = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code += (code ? '\n' : '') + lines[i];
        i++;
      }
      blocks.push(makeBlock(pageId, 'code', code, { language: lang }, nextSort()));
      i++; continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      let quoteText = trimmed.slice(2);
      i++;
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteText += '\n' + lines[i].trim().slice(2);
        i++;
      }
      blocks.push(makeBlock(pageId, 'quote', quoteText, {}, nextSort()));
      continue;
    }

    // Image
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      const b = makeBlock(pageId, 'image', '', { hash: '' }, nextSort());
      b._imageSrc = imgMatch[2];
      blocks.push(b);
      i++; continue;
    }

    // Default: text
    blocks.push(makeBlock(pageId, 'text', trimmed, {}, nextSort()));
    i++;
  }

  return blocks;
}

// ─── CSV → Database Parser ──────────────────────────────────────

function parseCsvToDatabase(csvText, pageId) {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) return { block: null, rows: [], cells: [] };

  const headers = rows[0];
  const dataRows = rows.slice(1);
  const blockId = createId();

  // Build schema with type inference and color assignment
  const schema = headers.map((header, colIdx) => {
    const values = dataRows.map(r => (r[colIdx] || '').trim()).filter(Boolean);
    const headerLower = header.trim().toLowerCase();
    
    // Detect created/edited time columns by name
    let type;
    if (headerLower === 'created' || headerLower === 'created time' || headerLower === 'created_time') {
      type = 'date';
    } else if (headerLower === 'last edited' || headerLower === 'last edited time' || headerLower === 'last_edited_time') {
      type = 'date';
    } else {
      type = inferColumnType(values, header.trim());
    }

    const config = {};
    
    // For select/multi_select, extract unique options with cycling colors
    if (type === 'select' || type === 'multi_select') {
      const SELECT_COLORS = [
        'gray', 'blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'teal',
      ];
      const COLOR_MAP = {
        gray:   { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.7)' },
        blue:   { bg: 'rgba(96,165,250,0.15)',  text: '#60a5fa' },
        purple: { bg: 'rgba(167,139,250,0.15)', text: '#a78bfa' },
        pink:   { bg: 'rgba(244,114,182,0.15)', text: '#f472b6' },
        red:    { bg: 'rgba(248,113,113,0.15)', text: '#f87171' },
        orange: { bg: 'rgba(251,146,60,0.15)',  text: '#fb923c' },
        yellow: { bg: 'rgba(250,204,21,0.15)',  text: '#facc15' },
        green:  { bg: 'rgba(74,222,128,0.15)',  text: '#4ade80' },
        teal:   { bg: 'rgba(45,212,191,0.15)',  text: '#2dd4bf' },
      };
      
      const allValues = type === 'multi_select'
        ? [...new Set(values.flatMap(v => v.split(',').map(s => s.trim())).filter(Boolean))]
        : [...new Set(values)];
      
      config.options = allValues.map((value, i) => {
        const colorName = SELECT_COLORS[i % SELECT_COLORS.length];
        return { value, color: colorName, ...COLOR_MAP[colorName] };
      });
    }

    return {
      id: createId(),
      name: header.trim() || `Column ${colIdx + 1}`,
      type,
      width: 200,
      config,
    };
  });

  // Build rows + cells
  const dbRows = [];
  const dbCells = [];

  for (const dataRow of dataRows) {
    if (dataRow.every(cell => !cell.trim())) continue; // skip empty rows
    const rowId = createId();
    const now = Date.now();

    dbRows.push({ id: rowId, blockId, createdAt: now, updatedAt: now });

    schema.forEach((prop, colIdx) => {
      const rawValue = (dataRow[colIdx] || '').trim();
      const value = coerceValue(rawValue, prop.type);
      dbCells.push({
        id: `${rowId}_${prop.id}`,
        rowId,
        blockId,
        propertyId: prop.id,
        value,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  const block = makeBlock(pageId, 'database', '', { schema }, generateLexicalOrder(null, null));
  block.id = blockId;

  return { block, rows: dbRows, cells: dbCells };
}

function parseCsvRows(text) {
  const rows = [];
  let current = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(cell);
        cell = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        current.push(cell);
        cell = '';
        if (current.length > 0) rows.push(current);
        current = [];
        if (ch === '\r') i++;
      } else {
        cell += ch;
      }
    }
  }
  // Last row
  if (cell || current.length > 0) {
    current.push(cell);
    rows.push(current);
  }
  return rows;
}

function inferColumnType(values, headerName = '') {
  if (values.length === 0) return 'text';

  const sample = values.slice(0, 30);
  const headerLower = headerName.toLowerCase();

  // Check checkbox
  if (sample.every(v => /^(true|false|yes|no|✓|✗|☑|☐)$/i.test(v))) return 'checkbox';

  // Check number
  if (sample.every(v => !isNaN(Number(v)) && v !== '')) return 'number';

  // Check date
  if (sample.every(v => !isNaN(Date.parse(v)) && /\d{4}/.test(v))) return 'date';

  // Check URL
  if (sample.every(v => /^https?:\/\//i.test(v))) return 'url';

  // Check email
  if (sample.every(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) return 'email';

  // Check multi-select (comma-separated with consistent low cardinality per segment)
  const hasCommas = sample.filter(v => v.includes(',')).length;
  if (hasCommas >= sample.length * 0.3) {
    // Many values contain commas → likely multi-select
    const allSegments = sample.flatMap(v => v.split(',').map(s => s.trim())).filter(Boolean);
    const uniqueSegments = new Set(allSegments);
    // If segments are reused across rows, it's multi-select
    if (uniqueSegments.size < allSegments.length * 0.6) return 'multi_select';
  }

  // Check select (low cardinality)
  const unique = new Set(sample);
  if (unique.size <= 5 && sample.length >= 3) return 'select';
  // Also detect by header hint
  if (headerLower.includes('status') || headerLower.includes('type') || headerLower.includes('category') || headerLower.includes('priority')) {
    if (unique.size <= 10) return 'select';
  }
  if (headerLower.includes('tags') || headerLower.includes('labels')) {
    return 'multi_select';
  }

  return 'text';
}

function coerceValue(raw, type) {
  if (!raw) return type === 'checkbox' ? false : type === 'number' ? 0 : '';
  switch (type) {
    case 'checkbox': return /^(true|yes|✓|☑)$/i.test(raw);
    case 'number': return Number(raw) || 0;
    case 'date': return new Date(raw).toISOString().split('T')[0];
    case 'multi_select': return raw.split(',').map(s => s.trim()).filter(Boolean);
    default: return raw;
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function makeBlock(pageId, type, content, properties, sortOrder, parentId = null) {
  return {
    id: createId(),
    pageId,
    parentId,
    type,
    content: content || '',
    properties: properties || {},
    sortOrder,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function cleanNotionFileName(name) {
  // Remove file extension
  let clean = name.replace(/\.(html|md|csv)$/i, '');
  // Remove Notion's ID suffix (32-char hex at end)
  clean = clean.replace(/\s+[a-f0-9]{32}$/i, '');
  return clean.trim();
}

function getInnerHtml(node) {
  // Get innerHTML, preserving inline styles (for color detection)
  // but stripping Notion-specific class names and IDs
  let html = node.innerHTML || '';
  // Remove IDs (not useful)
  html = html.replace(/\s*id="[^"]*"/g, '');
  // Remove non-color classes but preserve style attributes for color/background parsing
  html = html.replace(/\s*class="[^"]*"/g, '');
  // Keep style attributes — they contain color info from Notion exports
  // html = html.replace(/\s*style="[^"]*"/g, ''); // REMOVED: was stripping colors
  return html.trim();
}

function getTextContent(node) {
  return (node.textContent || '').trim();
}

function guessPageIcon(title) {
  if (!title) return '📝';
  const t = title.toLowerCase();
  if (t.includes('task') || t.includes('todo')) return '✅';
  if (t.includes('note')) return '📝';
  if (t.includes('project')) return '🚀';
  if (t.includes('meeting')) return '📅';
  if (t.includes('idea')) return '💡';
  if (t.includes('read') || t.includes('book')) return '📚';
  if (t.includes('journal') || t.includes('diary')) return '📓';
  if (t.includes('recipe') || t.includes('food')) return '🍕';
  if (t.includes('travel')) return '✈️';
  if (t.includes('finance') || t.includes('budget')) return '💰';
  if (t.includes('health') || t.includes('fitness')) return '💪';
  if (t.includes('music')) return '🎵';
  if (t.includes('code') || t.includes('dev')) return '💻';
  if (t.includes('design')) return '🎨';
  if (t.includes('database') || t.includes('tracker')) return '📊';
  return '📝';
}

async function hashBlob(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get a preview summary of parsed data (for the UI)
 */
export function getImportSummary(data) {
  const { pages, blocks, databaseRows, databaseCells, blobs } = data;
  const dbBlocks = blocks.filter(b => b.type === 'database');
  return {
    totalPages: pages.length,
    totalBlocks: blocks.length,
    totalDatabases: dbBlocks.length,
    totalImages: blobs.length,
    totalDbRows: databaseRows.length,
    pageTree: buildPreviewTree(pages),
  };
}

function buildPreviewTree(pages) {
  const map = {};
  const roots = [];
  pages.forEach(p => { map[p.id] = { ...p, children: [] }; });
  pages.forEach(p => {
    if (p.parentId && map[p.parentId]) {
      map[p.parentId].children.push(map[p.id]);
    } else {
      roots.push(map[p.id]);
    }
  });
  return roots;
}
