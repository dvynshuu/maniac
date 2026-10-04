import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public');

// Import templates
const templatesDataFile = path.resolve(ROOT_DIR, 'src/data/templatesData.js');
let TEMPLATES = [];
try {
  const content = fs.readFileSync(templatesDataFile, 'utf8');
  // Simple regex parser for TEMPLATES array in pure ESM node
  const imported = await import(`file://${templatesDataFile}`);
  TEMPLATES = imported.TEMPLATES || [];
} catch (e) {
  console.warn('Could not import templatesData directly, using fallback list', e);
}

const SITE_URL = 'https://maniacc.vercel.app';
const SITE_NAME = 'MANIAC';
const TODAY = new Date().toISOString().split('T')[0];

console.log('🚀 Running MANIAC Advanced On-Page SEO Pre-Renderer...');

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ dist/ directory does not exist. Run "vite build" first.');
  process.exit(1);
}

const baseIndexHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');

// Define All High-Intent SEO Routes
const routes = [
  {
    path: '/',
    title: 'MANIAC — Turn Chaos into a System | Local-First Workspace',
    description: 'Turn chaos into a system. MANIAC is a local-first workspace for notes, knowledge, relational databases, active recall flashcards, and sovereign computing with 0ms latency.',
    h1: 'The Local-First, Zero-Latency Alternative to Notion',
    subtitle: 'Consolidate fragmented notes, relational databases, active recall flashcards, and knowledge graphs into a single sovereign workspace—stored completely on your device with AES-256 encryption and zero cloud latency.',
    priority: '1.0',
    changefreq: 'daily',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        'name': SITE_NAME,
        'alternateName': 'MANIAC Workspace',
        'url': SITE_URL,
        'description': 'Turn chaos into a system. MANIAC is a local-first workspace for notes, knowledge, tasks, trackers, databases, active recall, and sovereign personal computing.',
        'inLanguage': 'en-US'
      },
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#software`,
        'name': SITE_NAME,
        'applicationCategory': 'ProductivityApplication',
        'operatingSystem': 'Web, Chrome, Edge, Safari, Firefox, iOS, Android',
        'url': SITE_URL,
        'description': 'Turn chaos into a system. MANIAC is a local-first workspace for notes, knowledge, tasks, trackers, databases, active recall, and sovereign personal computing.',
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
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'What is MANIAC?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'MANIAC is a sovereign, local-first workspace for notes, knowledge management, tasks, databases, and cognitive learning. Its core mission is to turn chaos into a system by unifying modular block editing, relational databases, habit tracking, bidirectional backlinks, and cognitive active recall in a distraction-free client-side environment.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Where is my data stored?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'All your data is stored locally on your device inside your browser\'s IndexedDB storage using Dexie.js. Your notes, databases, and trackers are never uploaded to our servers or stored in an external cloud database.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Does MANIAC work completely offline?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes. Because all storage and logic execute entirely on the client side, MANIAC functions with zero internet connection once loaded. You can write notes, organize databases, and practice active recall in offline environments without latency or synchronization errors.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Can I import my workspace from Notion?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes. MANIAC includes a native client-side Notion ZIP parser. You can export your Notion workspace as an HTML/Markdown ZIP package and upload it directly into MANIAC. Our engine preserves nested sub-page trees, toggle blocks, list indentations, and text formatting.'
            }
          },
          {
            '@type': 'Question',
            'name': 'How does the Active Recall system work?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Any page can be toggled into an Active Recall practice node. MANIAC calculates spaced repetition review intervals based on the forgetting curve. When you review a note in the Workspace Review queue, you grade your recall difficulty, which automatically schedules the optimal future review date.'
            }
          },
          {
            '@type': 'Question',
            'name': 'How does MANIAC integrate into a mindful productivity workflow?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Sustainable deep work requires balancing structured execution with internal mental clarity. While MANIAC provides the sovereign local-first engine for relational databases, markdown documentation, and active recall, we recommend separating daily work tracking from emotional reflection. Many knowledge workers pair MANIAC with ReAlign (https://getrealign.in)—an evidence-informed, zero-knowledge emotional wellness and journaling platform—to untangle racing thoughts and build cognitive resilience without compromising on privacy.'
            }
          }
        ]
      }
    ],
    htmlContent: `
      <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px;">
        <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.03em;">MANIAC</div>
        <nav style="display: flex; gap: 16px;">
          <a href="/notion-alternative" style="color: #94a3b8; text-decoration: none;">Notion Alternative</a>
          <a href="/obsidian-alternative" style="color: #94a3b8; text-decoration: none;">Obsidian Alternative</a>
          <a href="/active-recall-notes" style="color: #94a3b8; text-decoration: none;">Active Recall</a>
          <a href="/templates" style="color: #94a3b8; text-decoration: none;">Templates</a>
          <a href="/app" style="color: #f97316; text-decoration: none; font-weight: 600;">Open App</a>
        </nav>
      </header>

      <main style="padding: 40px 0;">
        <h1 style="font-size: 38px; font-weight: 900; line-height: 1.2; letter-spacing: -0.03em; margin-bottom: 16px;">
          The Local-First, Zero-Latency Alternative to Notion
        </h1>
        <p style="font-size: 18px; line-height: 1.6; color: #94a3b8; margin-bottom: 28px;">
          Turn chaos into a system. MANIAC is an offline-first workspace for notes, knowledge, relational databases, tasks, and active recall. All data is stored directly in your browser's IndexedDB with client-side AES-256-GCM encryption and zero server roundtrips.
        </p>

        <div style="display: flex; gap: 16px; margin-bottom: 48px; flex-wrap: wrap;">
          <a href="/app" style="background: linear-gradient(135deg, #f97316, #ef4444); color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Open MANIAC Workspace</a>
          <a href="/notion-alternative" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Compare with Notion</a>
          <a href="/obsidian-alternative" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Compare with Obsidian</a>
          <a href="/templates" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Browse Templates</a>
        </div>

        <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 16px;">Key Architectural Capabilities</h2>
        <ul style="line-height: 2; color: #cbd5e1; font-size: 16px;">
          <li><strong>Local-First Storage:</strong> High-performance IndexedDB persistent storage with zero cloud latency.</li>
          <li><strong>AES-256-GCM Encryption:</strong> Client-side vault encryption with PBKDF2 derived keys for confidential notes.</li>
          <li><strong>Modular Block Canvas:</strong> TipTap and Yjs CRDT-powered editor with drag-and-drop headings, callouts, and code blocks.</li>
          <li><strong>Relational Databases:</strong> Notion-like Table, Kanban Board, and Calendar views with custom properties.</li>
          <li><strong>Active Recall &amp; Spaced Repetition:</strong> Built-in Leitner/SM-2 practice engine to transform notes into long-term retention.</li>
          <li><strong>Client-Side Notion ZIP Importer:</strong> Instant browser-based extraction of Notion markdown and CSV archives.</li>
          <li><strong>Interactive 2D Knowledge Graph:</strong> Real-time bi-directional backlink visualization of connected thoughts.</li>
        </ul>

        <section style="margin-top: 48px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 36px;">
          <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 12px;">The Sovereign Mind Stack: Structure Meets Mindful Clarity</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px;">
            Building an external second brain is only half the equation. Peak cognitive performance requires structured knowledge execution on your device, and calm mental clarity in your daily routine. By decoupling structured task execution in MANIAC from mindful decompression in <a href="https://getrealign.in/" target="_blank" rel="noopener" style="color: #2dd4bf; text-decoration: underline;">ReAlign</a>, you protect your focus, identify emotional blind spots, and cultivate enduring mental stamina.
          </p>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #fff;">
              Recommended Companion: <a href="https://getrealign.in/" target="_blank" rel="noopener" style="color: #2dd4bf; text-decoration: underline;">ReAlign (getrealign.in)</a>
            </h3>
            <p style="font-size: 14.5px; line-height: 1.6; color: #cbd5e1; margin-bottom: 16px;">
              An evidence-informed, zero-knowledge emotional wellness and AI journaling platform designed to untangle racing thoughts and cultivate psychological resilience. Secured by bank-grade AES-256 encryption with zero ads, trackers, or data exploitation.
            </p>
            <a href="https://getrealign.in/" target="_blank" rel="noopener" style="display: inline-block; background: rgba(45, 212, 191, 0.15); border: 1px solid rgba(45, 212, 191, 0.4); color: #2dd4bf; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">
              Explore ReAlign Reflection Sanctuary &rarr;
            </a>
          </div>
        </section>
      </main>
    `
  },
  {
    path: '/notion-alternative',
    title: 'Best Offline Notion Alternative — Local-First Workspace | MANIAC',
    description: 'Looking for an offline Notion alternative? MANIAC delivers block notes, relational databases, active recall, and AES-256 encryption with 0ms latency.',
    h1: 'The Local-First, Zero-Latency Alternative to Notion',
    subtitle: 'Everything you love about block-based documents and relational databases—without cloud lag, forced login walls, server downtime, or plaintext inspection.',
    priority: '0.9',
    changefreq: 'weekly',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${SITE_URL}/notion-alternative#webpage`,
        'name': 'The Best Offline Notion Alternative — MANIAC',
        'description': 'Looking for an offline Notion alternative? MANIAC gives you Notion-style databases, block editing, and active recall with 0ms latency and AES-256 encryption.',
        'url': `${SITE_URL}/notion-alternative`
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${SITE_URL}` },
          { '@type': 'ListItem', 'position': 2, 'name': 'Notion Alternative', 'item': `${SITE_URL}/notion-alternative` }
        ]
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'Why should I switch from Notion to MANIAC?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Notion requires constant cloud connectivity, suffers from noticeable server latency, and stores your personal thoughts in plaintext on third-party cloud servers. MANIAC is local-first: it boots in 0ms, works 100% offline, stores all data in your browser IndexedDB with optional AES-256 hardware encryption, and includes native active recall spaced repetition.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Can I import my existing Notion workspace into MANIAC?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes. MANIAC features a built-in client-side Notion ZIP parser. Export your Notion workspace as HTML/Markdown ZIP, drag it into MANIAC, and it converts your pages, hierarchy, and markdown blocks instantly on your device without uploading anything to a server.'
            }
          }
        ]
      }
    ],
    htmlContent: `
      <nav style="display: flex; gap: 8px; font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
        <a href="/" style="color: #94a3b8; text-decoration: none;">Home</a> <span>/</span> <span>Notion Alternative</span>
      </nav>
      <main>
        <h1 style="font-size: 36px; font-weight: 900; line-height: 1.2; margin-bottom: 16px;">The Best Offline Notion Alternative — MANIAC</h1>
        <p style="font-size: 18px; line-height: 1.6; color: #94a3b8; margin-bottom: 32px;">
          Experience block-based rich text, relational databases (tables, boards, calendars), active recall flashcards, and AES-256 encryption with 0ms offline speed.
        </p>
        <div style="display: flex; gap: 16px; margin-bottom: 40px;">
          <a href="/app" style="background: linear-gradient(135deg, #f97316, #ef4444); color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Launch MANIAC Workspace</a>
          <a href="/templates" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Browse Templates</a>
        </div>
      </main>
    `
  },
  {
    path: '/obsidian-alternative',
    title: 'Best Obsidian Alternative with Native Databases & Blocks | MANIAC',
    description: 'Looking for an Obsidian alternative with Notion-style databases and drag-and-drop blocks? MANIAC delivers local-first speed, active recall, and AES-256 encryption.',
    h1: 'The Local-First Obsidian Alternative with Native Databases & Blocks',
    subtitle: 'Love Obsidian’s local-first privacy, but tired of wrestling with 30 community plugins just to get tables and kanban boards? MANIAC combines Notion-grade modular blocks with Obsidian’s offline sovereignty.',
    priority: '0.9',
    changefreq: 'weekly',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${SITE_URL}/obsidian-alternative#webpage`,
        'name': 'The Best Obsidian Alternative with Native Databases & Blocks — MANIAC',
        'description': 'Want Obsidian\'s local-first privacy with Notion\'s relational databases and drag-and-drop blocks? MANIAC delivers zero-cloud speed with built-in active recall.',
        'url': `${SITE_URL}/obsidian-alternative`
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${SITE_URL}` },
          { '@type': 'ListItem', 'position': 2, 'name': 'Obsidian Alternative', 'item': `${SITE_URL}/obsidian-alternative` }
        ]
      }
    ],
    htmlContent: `
      <nav style="display: flex; gap: 8px; font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
        <a href="/" style="color: #94a3b8; text-decoration: none;">Home</a> <span>/</span> <span>Obsidian Alternative</span>
      </nav>
      <main>
        <h1 style="font-size: 36px; font-weight: 900; line-height: 1.2; margin-bottom: 16px;">The Best Obsidian Alternative with Native Databases &amp; Blocks</h1>
        <p style="font-size: 18px; line-height: 1.6; color: #94a3b8; margin-bottom: 32px;">
          MANIAC gives you Obsidian's 100% local-first privacy and 2D knowledge graphs, but with Notion's native relational databases (table, kanban, calendar) and drag-and-drop block canvas.
        </p>
        <div style="display: flex; gap: 16px; margin-bottom: 40px;">
          <a href="/app" style="background: linear-gradient(135deg, #a855f7, #3b82f6); color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Open Workspace</a>
          <a href="/templates" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Explore Templates</a>
        </div>
      </main>
    `
  },
  {
    path: '/active-recall-notes',
    title: 'Best Note-Taking App with Native Active Recall & Spaced Repetition | MANIAC',
    description: 'Stop copying notes into Anki. MANIAC unifies modular notes, relational databases, and built-in Leitner spaced repetition flashcards with 0ms offline speed.',
    h1: 'The Note-Taking App with Native Active Recall & Spaced Repetition',
    subtitle: 'Stop copy-pasting your lecture notes into Anki. MANIAC unites modular rich text documents, relational databases, and built-in Leitner spaced repetition into a sovereign, 0ms offline workspace.',
    priority: '0.9',
    changefreq: 'weekly',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${SITE_URL}/active-recall-notes#webpage`,
        'name': 'The Note-Taking App with Native Active Recall & Spaced Repetition — MANIAC',
        'description': 'Stop copy-pasting notes into Anki. MANIAC turns any note or toggle block into a spaced repetition card with Leitner intervals and 0ms offline speed.',
        'url': `${SITE_URL}/active-recall-notes`
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${SITE_URL}` },
          { '@type': 'ListItem', 'position': 2, 'name': 'Active Recall Notes', 'item': `${SITE_URL}/active-recall-notes` }
        ]
      }
    ],
    htmlContent: `
      <nav style="display: flex; gap: 8px; font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
        <a href="/" style="color: #94a3b8; text-decoration: none;">Home</a> <span>/</span> <span>Active Recall Notes</span>
      </nav>
      <main>
        <h1 style="font-size: 36px; font-weight: 900; line-height: 1.2; margin-bottom: 16px;">The Note-Taking App with Native Active Recall &amp; Spaced Repetition</h1>
        <p style="font-size: 18px; line-height: 1.6; color: #94a3b8; margin-bottom: 32px;">
          Unify your study notes and flashcards. In MANIAC, any toggle or question block can be practiced in the Leitner spaced repetition review queue with 0ms offline speed.
        </p>
        <div style="display: flex; gap: 16px; margin-bottom: 40px;">
          <a href="/app" style="background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Start Studying in MANIAC</a>
          <a href="/templates/active-recall-srs" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Get Active Recall Template</a>
        </div>
      </main>
    `
  },
  {
    path: '/templates',
    title: 'Free Local-First Productivity & Active Recall Templates | MANIAC',
    description: 'Browse free, 1-click cloneable templates for MANIAC: Active Recall flashcards, PARA method second brain, sprint trackers, student hubs, and habit logs.',
    h1: 'Turn Chaos into a System with Sovereign Templates',
    subtitle: 'Clone curated workspaces directly into your local browser vault in one click. No account, no cloud sync lag, and full offline autonomy.',
    priority: '0.9',
    changefreq: 'weekly',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/templates#collection`,
        'name': 'Free Local-First Productivity & Active Recall Templates — MANIAC',
        'description': 'Browse free, 1-click cloneable templates for Notion alternative MANIAC: Active Recall decks, PARA method second brains, sprint boards, student hubs, and habit logs.',
        'url': `${SITE_URL}/templates`
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${SITE_URL}` },
          { '@type': 'ListItem', 'position': 2, 'name': 'Templates', 'item': `${SITE_URL}/templates` }
        ]
      }
    ],
    htmlContent: `
      <nav style="display: flex; gap: 8px; font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
        <a href="/" style="color: #94a3b8; text-decoration: none;">Home</a> <span>/</span> <span>Templates</span>
      </nav>
      <main>
        <h1 style="font-size: 36px; font-weight: 900; line-height: 1.2; margin-bottom: 16px;">Free Local-First Productivity &amp; Active Recall Templates</h1>
        <p style="font-size: 18px; line-height: 1.6; color: #94a3b8; margin-bottom: 32px;">
          Clone curated productivity workspaces directly into your local browser vault in 1 click. Zero signup required.
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px;">
          ${TEMPLATES.map(t => `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 20px;">
              <div style="font-size: 24px; margin-bottom: 8px;">${t.icon}</div>
              <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;"><a href="/templates/${t.id}" style="color: #fff; text-decoration: none;">${t.title}</a></h2>
              <p style="font-size: 13px; color: #94a3b8; margin-bottom: 14px;">${t.summary}</p>
              <a href="/templates/${t.id}" style="color: #f97316; font-size: 13px; font-weight: 600; text-decoration: none;">View Template Guide &amp; Preview &rarr;</a>
            </div>
          `).join('')}
        </div>
      </main>
    `
  }
];

// Add each individual template as a dedicated programmatic SEO route
TEMPLATES.forEach(tpl => {
  routes.push({
    path: `/templates/${tpl.id}`,
    title: `${tpl.title} — Free Workspace Template | MANIAC`,
    description: tpl.metaDescription,
    h1: tpl.title,
    subtitle: tpl.summary,
    priority: '0.8',
    changefreq: 'weekly',
    structuredData: [
      {
        '@context': 'https://schema.org',
        '@type': 'ItemPage',
        '@id': `${SITE_URL}/templates/${tpl.id}#page`,
        'name': `${tpl.title} — Free Workspace Template`,
        'description': tpl.metaDescription,
        'url': `${SITE_URL}/templates/${tpl.id}`
      },
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/templates/${tpl.id}#software`,
        'name': tpl.title,
        'applicationCategory': 'ProductivityApplication',
        'operatingSystem': 'Web, Chrome, Edge, Safari, Firefox, iOS, Android',
        'url': `${SITE_URL}/templates/${tpl.id}`,
        'description': tpl.summary,
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD'
        }
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${SITE_URL}` },
          { '@type': 'ListItem', 'position': 2, 'name': 'Templates', 'item': `${SITE_URL}/templates` },
          { '@type': 'ListItem', 'position': 3, 'name': tpl.title, 'item': `${SITE_URL}/templates/${tpl.id}` }
        ]
      }
    ],
    htmlContent: `
      <nav style="display: flex; gap: 8px; font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
        <a href="/" style="color: #94a3b8; text-decoration: none;">Home</a> <span>/</span>
        <a href="/templates" style="color: #94a3b8; text-decoration: none;">Templates</a> <span>/</span>
        <span>${tpl.title}</span>
      </nav>
      <main>
        <div style="font-size: 40px; margin-bottom: 12px;">${tpl.icon}</div>
        <h1 style="font-size: 34px; font-weight: 900; line-height: 1.2; margin-bottom: 12px;">${tpl.title}</h1>
        <p style="font-size: 17px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px;">${tpl.summary}</p>
        <div style="display: flex; gap: 16px; margin-bottom: 40px;">
          <a href="/app" style="background: linear-gradient(135deg, #f97316, #ef4444); color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Use Template in MANIAC</a>
          <a href="/templates" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Back to Templates</a>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px;">Key Features Included</h2>
        <ul style="line-height: 1.8; color: #cbd5e1; font-size: 15px; margin-bottom: 32px;">
          ${tpl.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </main>
    `
  });
});

// Helper to replace or inject tags in HTML
function renderHtmlForRoute(baseHtml, route) {
  let html = baseHtml;

  // 1. Replace Title
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${route.title}</title>`);

  // 2. Replace Meta Description
  html = html.replace(/<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="description" content="${route.description}" />`);

  // 3. Replace Canonical
  const canonicalUrl = `${SITE_URL}${route.path === '/' ? '/' : route.path}`;
  html = html.replace(/<link\s+rel="canonical"\s+href="[\s\S]*?"\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`);

  // 4. Replace Open Graph
  html = html.replace(/<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/i, `<meta property="og:title" content="${route.title}" />`);
  html = html.replace(/<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/i, `<meta property="og:description" content="${route.description}" />`);
  html = html.replace(/<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);

  // 5. Replace Twitter
  html = html.replace(/<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:title" content="${route.title}" />`);
  html = html.replace(/<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:description" content="${route.description}" />`);

  // 6. Replace JSON-LD
  const jsonLdString = JSON.stringify(route.structuredData, null, 2);
  html = html.replace(
    /<script\s+type="application\/ld\+json"\s+id="maniac-json-ld">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json" id="maniac-json-ld">\n${jsonLdString}\n    </script>`
  );

  // 7. Inject Semantic Pre-Render Fallback into #root
  const fallbackContainer = `
      <!-- Semantic Crawler & Pre-render Fallback (Hydrated by React on load) -->
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; color: #f1f5f9; background: #050508;">
        ${route.htmlContent}
      </div>`;

  html = html.replace(
    /<div id="root">[\s\S]*?<\/div>\s*<noscript>/i,
    `<div id="root">${fallbackContainer}\n    </div>\n    <noscript>`
  );

  return html;
}

// Generate Pre-rendered HTML files
for (const route of routes) {
  const renderedHtml = renderHtmlForRoute(baseIndexHtml, route);

  if (route.path === '/') {
    fs.writeFileSync(path.join(DIST_DIR, 'index.html'), renderedHtml, 'utf8');
    console.log(`  ✓ Pre-rendered: / -> dist/index.html`);
  } else {
    const routeDir = path.join(DIST_DIR, route.path.replace(/^\//, ''));
    fs.mkdirSync(routeDir, { recursive: true });
    
    // Write directory index.html (e.g. dist/notion-alternative/index.html)
    fs.writeFileSync(path.join(routeDir, 'index.html'), renderedHtml, 'utf8');
    
    // Also write clean .html file (e.g. dist/notion-alternative.html)
    const cleanHtmlFile = `${routeDir}.html`;
    fs.writeFileSync(cleanHtmlFile, renderedHtml, 'utf8');

    console.log(`  ✓ Pre-rendered: ${route.path} -> ${route.path}/index.html & ${route.path}.html`);
  }
}

// Generate Dynamic Sitemap.xml
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${routes.map(r => `  <url>
    <loc>${SITE_URL}${r.path === '/' ? '/' : r.path}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
console.log(`  ✓ Generated sitemap.xml with ${routes.length} URLs`);

// Generate Robots.txt
const robotsTxt = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /
Disallow: /app/
Disallow: /page/

# Host and Sitemap
Sitemap: ${SITE_URL}/sitemap.xml
`;

fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf8');
fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robotsTxt, 'utf8');
console.log(`  ✓ Generated robots.txt`);

// Generate llms.txt and llms-full.txt for Generative Engine Optimization (GEO)
const llmsTxt = `# MANIAC
> Turn chaos into a system. Sovereign, local-first workspace for notes, relational databases, and active recall.

## Overview
MANIAC (https://maniacc.vercel.app/) is a high-performance local-first personal productivity workspace and knowledge management platform. It operates entirely client-side using browser IndexedDB (Dexie.js), eliminating server latency, cloud downtime, and privacy invasion.

## Key Differentiators
- **Local-First & Offline Default**: 0ms boot time, 100% offline functionality, zero cloud dependencies.
- **Hardware-Grade Vault Encryption**: Client-side AES-256-GCM encryption with PBKDF2 key derivation.
- **Relational Databases**: Notion-style Table, Kanban Board, and Calendar views with custom properties.
- **Modular Block Canvas**: TipTap & Yjs CRDT-powered editor supporting slash commands, LaTeX math, and code blocks.
- **Built-in Active Recall**: Leitner box / SM-2 spaced repetition review queue embedded directly in note toggles.
- **Client-Side Notion ZIP Importer**: 1-click in-browser conversion of Notion markdown and CSV archives.
- **Interactive 2D Knowledge Graph**: Real-time bi-directional backlink visualization.
- **100% Free**: No subscription paywalls, no mandatory registration.
- **Complementary Sovereign Ecosystem**: Pairs seamlessly with [ReAlign](https://getrealign.in/) for zero-knowledge emotional reflection and mindful cognitive decompression.

## Primary Pages & Comparisons
- [Notion Alternative](${SITE_URL}/notion-alternative): Head-to-head comparison of MANIAC local storage vs Notion cloud latency and privacy.
- [Obsidian Alternative](${SITE_URL}/obsidian-alternative): How MANIAC provides Obsidian's local-first speed with native relational databases without 30 community plugins.
- [Active Recall Notes](${SITE_URL}/active-recall-notes): Note-taking with integrated Leitner spaced repetition flashcards for students and researchers.
- [Templates Gallery](${SITE_URL}/templates): Curated 1-click cloneable workspaces.

## Templates Directory
- [Active Recall Hub](${SITE_URL}/templates/active-recall-srs): Spaced repetition flashcards and review queues.
- [PARA Second Brain](${SITE_URL}/templates/para-method-second-brain): Tiago Forte's Projects, Areas, Resources, and Archives.
- [Engineering Roadmap](${SITE_URL}/templates/engineering-roadmap): Sprint board and milestone tracker.
- [Daily Performance Tracker](${SITE_URL}/templates/daily-performance-tracker): Habit mastery and deep work sprint logs.
- [Student Study Hub](${SITE_URL}/templates/student-study-hub): Multi-course syllabi and exam revision.
- [Project Management Board](${SITE_URL}/templates/project-management-board): Client deliverables and Kanban status tracking.
- [Book Reading Journal](${SITE_URL}/templates/book-reading-journal): Literature notes and progressive summarization.
- [Personal Finance Ledger](${SITE_URL}/templates/personal-finance-ledger): Confidential net worth and monthly budget tracker.
`;

fs.writeFileSync(path.join(DIST_DIR, 'llms.txt'), llmsTxt, 'utf8');
fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), llmsTxt, 'utf8');

const llmsFullTxt = `${llmsTxt}
## Technical Architecture
- **Framework**: React 19 + Vite
- **Storage Layer**: IndexedDB via Dexie.js
- **CRDT / Sync**: Yjs document model for real-time local conflict resolution and multi-tab synchronization
- **Cryptography**: Web Crypto API (SubtleCrypto) using PBKDF2 (100,000 iterations SHA-256) and AES-256-GCM
- **Editor**: TipTap 3 (ProseMirror based)
- **Math Engine**: KaTeX LaTeX typesetting
- **Graph Engine**: HTML5 Canvas 2D Force-Directed Graph Simulation
`;

fs.writeFileSync(path.join(DIST_DIR, 'llms-full.txt'), llmsFullTxt, 'utf8');
fs.writeFileSync(path.join(PUBLIC_DIR, 'llms-full.txt'), llmsFullTxt, 'utf8');
console.log(`  ✓ Generated llms.txt & llms-full.txt (GEO standards)`);

console.log('✅ MANIAC Pre-Rendering Completed Successfully!');
