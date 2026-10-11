/**
 * Path and String Normalization for Notion Import
 * 
 * Centralizes all path sanitization, Unicode normalization,
 * URL decoding, HTML entity resolution, and Notion UUID extraction.
 */

/**
 * Normalizes a file path into a canonical relative POSIX path.
 * - Converts backslashes to forward slashes
 * - Strips leading `./` or `/`
 * - Decodes URL encoding (e.g., `%20` -> ` `)
 * - Decodes HTML entities (e.g., `&amp;` -> `&`)
 * - Resolves relative `.` and `..` segments
 * - Normalizes Unicode to NFC
 * 
 * @param {string} rawPath
 * @returns {string}
 */
export function normalizePath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return '';

  let p = rawPath.replace(/\\/g, '/');

  // Decode HTML entities commonly found in index.html hrefs
  p = p.replace(/&amp;/g, '&')
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"')
       .replace(/&#39;/g, "'");

  // Attempt URL decoding safely
  try {
    p = decodeURIComponent(p);
  } catch {
    // If malformed percent sequences exist, decode greedily where possible
    p = p.replace(/%([0-9a-fA-F]{2})/g, (match, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return match;
      }
    });
  }

  // Unicode NFC normalization
  p = p.normalize('NFC');

  // Strip leading slashes or dot-slashes
  p = p.replace(/^(\.\/|\/)+/, '');

  // Resolve relative segments like 'a/b/../c' -> 'a/c'
  const parts = p.split('/');
  const stack = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack.join('/');
}

/**
 * Extracts a Notion UUID from a filename, path, or index.html ID attribute.
 * Notion uses 32 hex characters, either formatted as:
 * - Hyphenated: 8-4-4-4-12 (e.g., 22af7b36-4951-8149-9801-c2721620bf06)
 * - Compact: 32 hex chars (e.g., 22af7b36495181499801c2721620bf06)
 * - Short dashed: 4-4 (e.g., ed4f-694a)
 * 
 * @param {string} str
 * @returns {string|null} 32-char lowercase hex string or null
 */
export function extractNotionUUID(str) {
  if (!str || typeof str !== 'string') return null;

  // Clean HTML id:: prefix if present
  let cleaned = str.replace(/^id::/i, '');

  // If a path with slashes was passed, take the last segment (filename)
  const segments = cleaned.split(/[/\\]/).filter(Boolean);
  const target = segments.length > 0 ? segments[segments.length - 1] : cleaned;

  // If filename starts with Export-, it is an export wrapper, not an entity UUID
  if (target.startsWith('Export-')) {
    return null;
  }

  // 1. Hyphenated standard UUID (36 chars with 4 hyphens)
  const hypMatch = target.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (hypMatch) {
    return hypMatch[1].replace(/-/g, '').toLowerCase();
  }

  // 2. Compact 32-char hex string (commonly attached at end of filenames)
  const compactMatch = target.match(/([0-9a-f]{32})(?:_all)?(?:\.[a-z0-9]+)?$/i);
  if (compactMatch) {
    return compactMatch[1].toLowerCase();
  }

  // 3. Any 32-char hex anywhere in string
  const any32 = target.match(/[0-9a-f]{32}/i);
  if (any32) {
    return any32[0].toLowerCase();
  }

  // 4. Fallback: Short dashed pattern (e.g. ed4f-694a)
  const shortMatch = target.match(/([0-9a-f]{4}-[0-9a-f]{4})/i);
  if (shortMatch) {
    return shortMatch[1].toLowerCase();
  }

  return null;
}

/**
 * Decodes standard HTML entities commonly found in index.html text and hrefs.
 * @param {string} str
 * @returns {string}
 */
export function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Cleans a Notion filename into a clean user-facing title.
 * Strips:
 * - File extensions (.md, .csv, .html, etc.)
 * - `_all` suffix for companion CSVs
 * - Notion 32-char UUID or short hash
 * - HTML entities (&amp;, etc.)
 * - Trailing whitespace
 * 
 * @param {string} filename
 * @returns {string}
 */
export function cleanNotionTitle(filename) {
  if (!filename || typeof filename !== 'string') return '';

  let name = filename.split('/').pop().split('\\').pop();

  // Decode HTML entities
  name = decodeHtmlEntities(name);

  // Attempt URL decoding safely
  try {
    name = decodeURIComponent(name);
  } catch {}

  // Strip (Inline database) marker first if present
  name = name.replace(/\s*\(Inline database\)\s*$/i, '');

  // Strip extension
  name = name.replace(/\.[a-zA-Z0-9]+$/, '');

  // Strip companion suffix
  name = name.replace(/_all$/, '');

  // Strip 32-char hex UUID (with preceding space or hyphen)
  name = name.replace(/[\s_-]+[0-9a-f]{32}$/i, '');

  // Strip hyphenated UUID
  name = name.replace(/[\s_-]+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, '');

  // Strip short dashed hex (e.g. "ed4f-694a")
  name = name.replace(/[\s_-]+[0-9a-f]{4}-[0-9a-f]{4}$/i, '');

  name = name.trim();
  return name || 'Untitled';
}

/**
 * Checks if a filename is an _all.csv companion
 * @param {string} pathOrName
 * @returns {boolean}
 */
export function isAllCompanionCsv(pathOrName) {
  if (!pathOrName) return false;
  return /_all\.csv$/i.test(pathOrName);
}

/**
 * Returns the primary CSV counterpart for an _all.csv file
 * @param {string} allCsvPath
 * @returns {string}
 */
export function getPrimaryCsvPath(allCsvPath) {
  if (!allCsvPath) return '';
  return allCsvPath.replace(/_all\.csv$/i, '.csv');
}

/**
 * Normalizes property name for schema matching
 * @param {string} propName
 * @returns {string}
 */
export function normalizePropertyName(propName) {
  if (!propName || typeof propName !== 'string') return '';
  return propName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}
