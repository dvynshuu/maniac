import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from './constants';

/**
 * Generates Schema.org JSON-LD structured data for MANIAC.
 * Strictly adheres to schema.org standards with genuine product attributes.
 */

export const HOMEPAGE_FAQS = [
  {
    q: 'What is MANIAC?',
    a: 'MANIAC is a sovereign, local-first workspace for notes, knowledge management, tasks, databases, and cognitive learning. Its core mission is to turn chaos into a system by unifying modular block editing, relational databases, habit tracking, bidirectional backlinks, and cognitive active recall in a distraction-free client-side environment.'
  },
  {
    q: 'Where is my data stored?',
    a: 'All your data is stored locally on your device inside your browser\'s IndexedDB storage using Dexie.js. Your notes, databases, and trackers are never uploaded to our servers or stored in an external cloud database.'
  },
  {
    q: 'Does MANIAC work completely offline?',
    a: 'Yes. Because all storage and logic execute entirely on the client side, MANIAC functions with zero internet connection once loaded. You can write notes, organize databases, and practice active recall in offline environments without latency or synchronization errors.'
  },
  {
    q: 'Can I import my workspace from Notion?',
    a: 'Yes. MANIAC includes a native client-side Notion ZIP parser. You can export your Notion workspace as an HTML/Markdown ZIP package and upload it directly into MANIAC. Our engine preserves nested sub-page trees, toggle blocks, list indentations, and text formatting without uploading anything to a server.'
  },
  {
    q: 'How does the Active Recall system work?',
    a: 'Any page can be toggled into an Active Recall practice node. MANIAC calculates spaced repetition review intervals based on the forgetting curve. When you review a note in the Workspace Review queue, you grade your recall difficulty, which automatically schedules the optimal future review date.'
  }
];

export function getBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`
    }))
  };
}

export function getHomepageStructuredData() {
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
    'operatingSystem': 'Web, Chrome, Edge, Safari, Firefox, iOS, Android',
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

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    'name': SITE_NAME,
    'url': SITE_URL,
    'logo': `${SITE_URL}/apple-touch-icon.png`,
    'sameAs': [
      'https://github.com/dvynshuu/maniac'
    ]
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    'mainEntity': HOMEPAGE_FAQS.map(faq => ({
      '@type': 'Question',
      'name': faq.q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.a
      }
    }))
  };

  return [websiteSchema, softwareApplicationSchema, organizationSchema, faqSchema];
}

export function getNotionAltStructuredData(faqs) {
  const webpage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}/notion-alternative#webpage`,
    'name': 'The Best Offline Notion Alternative — MANIAC',
    'description': 'Looking for an offline Notion alternative? MANIAC gives you Notion-style databases, block editing, and active recall with 0ms latency and AES-256 encryption.',
    'url': `${SITE_URL}/notion-alternative`
  };

  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Notion Alternative', url: '/notion-alternative' }
  ]);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(f => ({
      '@type': 'Question',
      'name': f.q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': f.a
      }
    }))
  };

  return [webpage, breadcrumbs, faqSchema];
}

export function getObsidianAltStructuredData(faqs) {
  const webpage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}/obsidian-alternative#webpage`,
    'name': 'The Local-First Obsidian Alternative with Native Databases & Blocks — MANIAC',
    'description': 'Want Obsidian\'s local-first privacy with Notion\'s relational databases and drag-and-drop blocks? MANIAC delivers zero-cloud speed with built-in active recall.',
    'url': `${SITE_URL}/obsidian-alternative`
  };

  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Obsidian Alternative', url: '/obsidian-alternative' }
  ]);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(f => ({
      '@type': 'Question',
      'name': f.q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': f.a
      }
    }))
  };

  return [webpage, breadcrumbs, faqSchema];
}

export function getActiveRecallStructuredData(faqs) {
  const webpage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}/active-recall-notes#webpage`,
    'name': 'The Note-Taking App with Native Active Recall & Spaced Repetition — MANIAC',
    'description': 'Stop copy-pasting notes into Anki. MANIAC turns any note or toggle block into a spaced repetition card with Leitner intervals and 0ms offline speed.',
    'url': `${SITE_URL}/active-recall-notes`
  };

  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Active Recall Notes', url: '/active-recall-notes' }
  ]);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(f => ({
      '@type': 'Question',
      'name': f.q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': f.a
      }
    }))
  };

  return [webpage, breadcrumbs, faqSchema];
}

export function getTemplatesCollectionStructuredData(templates) {
  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/templates#collection`,
    'name': 'Free Local-First Productivity & Active Recall Templates — MANIAC',
    'description': 'Browse free, 1-click cloneable templates for MANIAC: Active Recall decks, PARA method second brains, sprint boards, student hubs, and habit logs.',
    'url': `${SITE_URL}/templates`
  };

  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Templates', url: '/templates' }
  ]);

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'numberOfItems': templates.length,
    'itemListElement': templates.map((tpl, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': tpl.title,
      'url': `${SITE_URL}/templates/${tpl.id}`
    }))
  };

  return [collection, breadcrumbs, itemList];
}

export function getTemplateDetailStructuredData(template) {
  const itemPage = {
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    '@id': `${SITE_URL}/templates/${template.id}#page`,
    'name': `${template.title} — Free Workspace Template`,
    'description': template.metaDescription,
    'url': `${SITE_URL}/templates/${template.id}`
  };

  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/templates/${template.id}#software`,
    'name': template.title,
    'applicationCategory': 'ProductivityApplication',
    'operatingSystem': 'Web, Chrome, Edge, Safari, Firefox, iOS, Android',
    'url': `${SITE_URL}/templates/${template.id}`,
    'description': template.summary,
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD'
    }
  };

  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Templates', url: '/templates' },
    { name: template.title, url: `/templates/${template.id}` }
  ]);

  const faqSchema = template.faqs && template.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': template.faqs.map(f => ({
      '@type': 'Question',
      'name': f.q,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': f.a
      }
    }))
  } : null;

  return [itemPage, software, breadcrumbs, ...(faqSchema ? [faqSchema] : [])];
}

// Backward-compatible default export
export function getStructuredData() {
  return getHomepageStructuredData();
}
