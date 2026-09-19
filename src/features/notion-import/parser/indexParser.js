/**
 * Notion index.html Parser
 * 
 * Parses the canonical index.html hierarchy tree into a structured node list.
 * index.html is the single source of truth for the entire Notion workspace hierarchy.
 */

import { normalizePath, extractNotionUUID, cleanNotionTitle, decodeHtmlEntities } from '../normalization/pathNormalizer.js';

/**
 * Parses index.html into a list of NotionIndexEntry objects preserving full hierarchy.
 * @param {string} htmlContent
 * @returns {import('../model/types').NotionIndexEntry[]}
 */
export function parseNotionIndex(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') return [];

  const entries = [];
  const ulStack = [];

  // Match tags and text content
  const tagRegex = /<\/?([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  let match;
  let currentA = null;
  let workspaceId = null;

  while ((match = tagRegex.exec(htmlContent)) !== null) {
    const full = match[0];
    const tagName = match[1] ? match[1].toLowerCase() : null;
    const attrs = match[2] || '';
    const textContent = match[3];

    if (tagName === 'ul') {
      if (full.startsWith('</')) {
        if (ulStack.length > 0) {
          const completed = ulStack.pop();
          // Filter out root workspace wrapper if it only contains details
          if (completed.rawId !== workspaceId) {
            entries.push(completed);
          }
        }
      } else {
        const idMatch = attrs.match(/id="([^"]+)"/i);
        const rawId = idMatch ? idMatch[1] : '';

        // If this is the topmost UL, record as workspace identifier
        if (ulStack.length === 0) {
          workspaceId = rawId;
        }

        const parent = ulStack.length > 0 ? ulStack[ulStack.length - 1] : null;

        const node = {
          rawId,
          parentRawId: parent ? parent.rawId : null,
          title: '',
          rawTitle: '',
          path: '',
          href: '',
          isInline: false,
          isCsv: false,
          depth: ulStack.length,
          order: entries.length + ulStack.length,
          childRawIds: [],
        };

        if (parent) {
          parent.childRawIds.push(rawId);
        }

        ulStack.push(node);
      }
    } else if (tagName === 'a') {
      if (!full.startsWith('</')) {
        const hrefMatch = attrs.match(/href="([^"]+)"/i);
        const href = hrefMatch ? hrefMatch[1] : '';
        currentA = { href, text: '' };
      } else {
        if (currentA && ulStack.length > 0) {
          const currentUl = ulStack[ulStack.length - 1];
          if (!currentUl.title) {
            currentUl.rawTitle = decodeHtmlEntities(currentA.text.trim());
            currentUl.title = cleanNotionTitle(currentUl.rawTitle);
            currentUl.href = currentA.href;

            if (currentUl.rawTitle.includes('(Inline database)')) {
              currentUl.isInline = true;
            }

            if (currentA.href && !currentA.href.startsWith('http')) {
              currentUl.path = normalizePath(currentA.href);
            }

            if (currentUl.rawId.endsWith('.csv') || (currentA.href && currentA.href.endsWith('.csv'))) {
              currentUl.isCsv = true;
            }
          }
        }
        currentA = null;
      }
    } else if (textContent) {
      if (currentA) {
        currentA.text += textContent;
      }
    }
  }

  // Flush any remaining items on stack
  while (ulStack.length > 0) {
    const remaining = ulStack.pop();
    if (remaining.rawId !== workspaceId) {
      entries.push(remaining);
    }
  }

  // Post-process entries: resolve Notion UUIDs and classify entry types
  const processed = entries.map(entry => {
    const notionUUID = extractNotionUUID(entry.rawId) ||
                       extractNotionUUID(entry.path) ||
                       extractNotionUUID(entry.href) ||
                       entry.rawId.replace(/^id::/i, '').trim();

    const parentNotionUUID = entry.parentRawId && entry.parentRawId !== workspaceId
      ? (extractNotionUUID(entry.parentRawId) || entry.parentRawId.replace(/^id::/i, '').trim())
      : null;

    let type = 'page';
    if (entry.isInline || entry.isCsv) {
      type = 'database';
    }

    return {
      id: notionUUID,
      rawId: entry.rawId,
      title: entry.title || 'Untitled',
      rawTitle: entry.rawTitle,
      path: entry.path,
      href: entry.href,
      parentId: parentNotionUUID,
      parentRawId: entry.parentRawId,
      type,
      isInline: entry.isInline,
      isCsv: entry.isCsv,
      order: entry.order,
      depth: entry.depth,
      childIds: entry.childRawIds.map(cid => extractNotionUUID(cid) || cid.replace(/^id::/i, '').trim()),
    };
  });

  return processed;
}
