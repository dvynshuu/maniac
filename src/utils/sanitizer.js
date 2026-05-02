import DOMPurify from 'dompurify';

// Defense-in-depth: Block data URIs in src attributes to mitigate SVG XSS vectors.
// We strictly use Blob URIs or standard HTTP/HTTPS URIs for images.
DOMPurify.addHook('uponSanitizeAttribute', function (node, data) {
  if (data.attrName === 'src') {
    const url = data.attrValue.trim().toLowerCase();
    if (url.startsWith('data:')) {
      data.keepAttr = false;
    }
  }
});

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * @param {string} html - The raw HTML string.
 * @returns {string} - The sanitized HTML string.
 */
export const sanitize = (html) => {
  if (typeof html !== 'string') return html;
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 's', 'code', 'pre', 'a', 'span', 'br',
      'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'img'
    ],
    ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'class', 'data-page-id', 'contenteditable'],
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button', 'svg', 'math', 'object', 'embed', 'base'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
    ALLOW_DATA_ATTR: false,
  });
};

export const content_sanitizer = sanitize;

/**
 * Recursively sanitizes object properties and arrays.
 * @param {any} obj - The object to sanitize
 * @returns {any} - The sanitized object
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => (typeof item === 'string' ? (item.startsWith('http') ? sanitizeUrl(item) : sanitize(item)) : (typeof item === 'object' ? sanitizeObject(item) : item)));
  }
  const cleanProps = {};
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      const val = obj[key];
      // If it looks like a URL, use URL sanitizer, otherwise use HTML sanitizer
      if (val.startsWith('http') || key.toLowerCase().includes('url')) {
        cleanProps[key] = sanitizeUrl(val);
      } else {
        cleanProps[key] = sanitize(val);
      }
    } else if (typeof obj[key] === 'object') {
      cleanProps[key] = sanitizeObject(obj[key]);
    } else if (typeof obj[key] === 'boolean' || typeof obj[key] === 'number') {
      cleanProps[key] = obj[key];
    }
  }
  return cleanProps;
};

/**
 * Sanitizes URLs to prevent javascript:/data:/vbscript: execution.
 * @param {string} url - The raw URL string.
 * @returns {string} - The sanitized URL string or '#' if invalid.
 */
export const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return '#';
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '#';

  try {
    // Attempt to parse to check protocol. This handles many evasion techniques.
    const parsed = new URL(trimmedUrl, window.location.origin);
    const protocol = parsed.protocol.toLowerCase();
    
    if (['javascript:', 'vbscript:', 'data:'].includes(protocol)) {
      return '#';
    }
  } catch (e) {
    // If it's a relative URL, it will fail parsing without a base, 
    // but the fallback base handles it above. 
    // If it still fails, it's likely a deeply malformed string.
    // We can do a regex check as a fallback defense in depth.
    if (/^\s*(javascript|vbscript|data):/i.test(trimmedUrl)) {
      return '#';
    }
  }

  return trimmedUrl;
};
