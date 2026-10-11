import DOMPurify from 'dompurify';

let purify: any = DOMPurify;
if (typeof DOMPurify === 'function' && typeof window !== 'undefined') {
  purify = (DOMPurify as any)(window);
}

// Defense-in-depth: Block data URIs in src attributes to mitigate SVG XSS vectors.
// We strictly use Blob URIs or standard HTTP/HTTPS URIs for images.
if (purify && typeof purify.addHook === 'function') {
  purify.addHook('uponSanitizeAttribute', function (_node: any, data: any) {
    if (data.attrName === 'src') {
      const url = data.attrValue.trim().toLowerCase();
      if (url.startsWith('data:')) {
        data.keepAttr = false;
      }
    }
  });
}

/**
 * Sanitizes HTML content to prevent XSS attacks.
 */
export const sanitize = (html: any): string => {
  if (typeof html !== 'string') return html as any;
  if (!purify || typeof purify.sanitize !== 'function') return html;
  
  return purify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'u', 's', 'code', 'pre', 'a', 'span', 'br',
      'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'img', 'div', 'p'
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
 */
export const sanitizeObject = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => (typeof item === 'string' ? (item.startsWith('http') ? sanitizeUrl(item) : sanitize(item)) : (typeof item === 'object' ? sanitizeObject(item) : item)));
  }
  const cleanProps: Record<string, any> = {};
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      const val = obj[key];
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
 */
export const sanitizeUrl = (url: any): string => {
  if (typeof url !== 'string') return '#';
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '#';

  try {
    const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost';
    const parsed = new URL(trimmedUrl, origin);
    const protocol = parsed.protocol.toLowerCase();
    
    if (['javascript:', 'vbscript:', 'data:'].includes(protocol)) {
      return '#';
    }
  } catch (e) {
    if (/^\s*(javascript|vbscript|data):/i.test(trimmedUrl)) {
      return '#';
    }
  }

  return trimmedUrl;
};
