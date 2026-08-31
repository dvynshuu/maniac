import { useEffect } from 'react';
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE
} from './constants';

function setMetaTag(attributeName, attributeValue, content) {
  let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonical(url) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function setJsonLd(data) {
  const scriptId = 'maniac-json-ld';
  let script = document.getElementById(scriptId);
  if (!data) {
    if (script) script.remove();
    return;
  }
  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

/**
 * SEO Component for React Routes.
 * Updates DOM head elements with route-specific metadata, canonical tags, Open Graph, and Structured Data.
 */
export default function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonical = SITE_URL,
  robots = 'index, follow',
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  structuredData = null
}) {
  useEffect(() => {
    // 1. Document Title
    document.title = title;

    // 2. Meta Description
    setMetaTag('name', 'description', description);

    // 3. Meta Robots
    setMetaTag('name', 'robots', robots);

    // 4. Canonical URL
    if (canonical) {
      setCanonical(canonical);
    }

    // 5. Open Graph
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonical || SITE_URL);
    setMetaTag('property', 'og:site_name', SITE_NAME);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:image:width', '1200');
    setMetaTag('property', 'og:image:height', '630');
    setMetaTag('property', 'og:image:alt', 'MANIAC — Turn Chaos into a System');

    // 6. Twitter / X Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);
    setMetaTag('name', 'twitter:image:alt', 'MANIAC — Turn Chaos into a System');

    // 7. JSON-LD Structured Data
    setJsonLd(structuredData);
  }, [title, description, canonical, robots, ogImage, ogType, structuredData]);

  return null;
}
