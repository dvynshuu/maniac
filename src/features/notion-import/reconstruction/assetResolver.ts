/**
 * Asset Reference Resolver
 * 
 * Resolves Markdown and HTML image references (e.g., ![](img.png) or ![](../dir/img.png))
 * against extracted assets using relative path calculation and content hashes.
 */

import { normalizePath } from '../normalization/pathNormalizer.js';
import { DIAGNOSTIC_CODES } from '../diagnostics/diagnostics.js';

/**
 * Resolves image references in blocks to their extracted binary assets.
 * 
 * @param {Array<import('../model/types').NotionImportBlock>} blocks
 * @param {Array<import('../model/types').NotionImportPage>} pages
 * @param {Map<string, import('../model/types').NotionImportAsset>} assetMap - normalized ZIP path -> asset
 * @param {import('../diagnostics/diagnostics').createDiagnostics} diagnostics
 */
export function resolveAssetReferences(blocks, pages, assetMap, diagnostics) {
  const pageMap = new Map();
  for (const page of pages) {
    pageMap.set(page.id, page);
  }

  // Also build filename lookup map for relative matches
  const filenameMap = new Map();
  for (const [zipPath, asset] of assetMap.entries()) {
    const filename = zipPath.split('/').pop().toLowerCase();
    if (!filenameMap.has(filename)) {
      filenameMap.set(filename, []);
    }
    filenameMap.get(filename).push(asset);
  }

  let resolvedCount = 0;

  for (const block of blocks) {
    if (block.type !== 'image' || !block._imageSrc) continue;

    const rawSrc = block._imageSrc;
    const owningPage = pageMap.get(block.pageId);
    let matchedAsset = null;

    // Strategy 1: Exact normalized path match
    const normSrc = normalizePath(rawSrc);
    if (assetMap.has(normSrc)) {
      matchedAsset = assetMap.get(normSrc);
    }

    // Strategy 2: Relative to owning page's directory
    if (!matchedAsset && owningPage && owningPage.sourcePath) {
      const pageDir = owningPage.sourcePath.split('/').slice(0, -1).join('/');
      const combined = pageDir ? `${pageDir}/${normSrc}` : normSrc;
      const combinedNorm = normalizePath(combined);
      if (assetMap.has(combinedNorm)) {
        matchedAsset = assetMap.get(combinedNorm);
      }
    }

    // Strategy 3: Filename matching (if unique or closest path)
    if (!matchedAsset) {
      const filename = normSrc.split('/').pop().toLowerCase();
      const candidates = filenameMap.get(filename);
      if (candidates && candidates.length === 1) {
        matchedAsset = candidates[0];
      } else if (candidates && candidates.length > 1 && owningPage && owningPage.sourcePath) {
        // Find candidate with closest path prefix match
        const pageDir = owningPage.sourcePath.split('/').slice(0, -1).join('/');
        matchedAsset = candidates.find(c => c.zipPath.startsWith(pageDir)) || candidates[0];
      }
    }

    if (matchedAsset) {
      block.properties = {
        ...block.properties,
        hash: matchedAsset.hash,
        assetId: matchedAsset.id,
        mimeType: matchedAsset.mimeType,
      };
      delete block._imageSrc;
      resolvedCount++;
    } else {
      diagnostics.warn(DIAGNOSTIC_CODES.UNRESOLVED_ASSET, `Could not resolve asset reference: ${rawSrc}`, {
        rawSrc,
        page: owningPage ? owningPage.title : 'unknown',
      });
    }
  }

  return resolvedCount;
}
