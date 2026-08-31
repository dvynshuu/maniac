import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from './constants';

/**
 * Generates Schema.org JSON-LD structured data for MANIAC.
 * Strictly adheres to schema.org standards with genuine product attributes.
 */
export function getStructuredData() {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    'name': SITE_NAME,
    'alternateName': 'MANIAC Workspace',
    'url': SITE_URL,
    'description': DEFAULT_DESCRIPTION,
    'inLanguage': 'en-US'
  };

  const softwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/#software`,
    'name': SITE_NAME,
    'applicationCategory': 'ProductivityApplication',
    'operatingSystem': 'Web, Chrome, Edge, Safari, Firefox',
    'url': SITE_URL,
    'description': DEFAULT_DESCRIPTION,
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD'
    },
    'featureList': [
      'Local-first architecture with IndexedDB storage',
      'Client-side AES-256-GCM encryption',
      'Block-based modular rich text editor',
      'Relational databases with Table, Board, and Calendar views',
      'Knowledge graph visualization and bidirectional backlinks',
      'Active recall and spaced repetition practice engine',
      'Habit and quantitative metric tracking',
      'Notion ZIP package import parser',
      'Offline-first zero-latency operation',
      'Cross-tab synchronization via CRDT'
    ]
  };

  return [websiteSchema, softwareApplicationSchema];
}
