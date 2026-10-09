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

// Common Header for Crawler Semantic Fallback
const commonCrawlerNav = `
  <header style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; margin-bottom: 32px;">
    <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.03em;"><a href="/" style="color: #fff; text-decoration: none;">MANIAC</a></div>
    <nav style="display: flex; gap: 16px; flex-wrap: wrap;">
      <a href="/notion-alternative" style="color: #94a3b8; text-decoration: none; font-size: 14px;">Notion Alternative</a>
      <a href="/obsidian-alternative" style="color: #94a3b8; text-decoration: none; font-size: 14px;">Obsidian Alternative</a>
      <a href="/active-recall-notes" style="color: #94a3b8; text-decoration: none; font-size: 14px;">Active Recall</a>
      <a href="/templates" style="color: #94a3b8; text-decoration: none; font-size: 14px;">Templates</a>
      <a href="/app" style="color: #f97316; text-decoration: none; font-weight: 600; font-size: 14px;">Open App</a>
    </nav>
  </header>
`;

// Common Footer for Crawler Semantic Fallback
const commonCrawlerFooter = `
  <footer style="margin-top: 64px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 32px; color: #94a3b8; font-size: 13px;">
    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 24px; margin-bottom: 24px;">
      <div>
        <div style="font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 8px;">MANIAC</div>
        <p style="max-width: 320px; line-height: 1.6; margin: 0;">Turn chaos into a system. Sovereign, local-first workspace for notes, relational databases, active recall, and knowledge graphs.</p>
      </div>
      <div>
        <div style="font-weight: 700; color: #fff; margin-bottom: 8px;">Alternative Comparisons</div>
        <ul style="list-style: none; padding: 0; margin: 0; line-height: 2;">
          <li><a href="/notion-alternative" style="color: #94a3b8; text-decoration: none;">Notion Alternative</a></li>
          <li><a href="/obsidian-alternative" style="color: #94a3b8; text-decoration: none;">Obsidian Alternative</a></li>
          <li><a href="/active-recall-notes" style="color: #94a3b8; text-decoration: none;">Active Recall Notes</a></li>
        </ul>
      </div>
      <div>
        <div style="font-weight: 700; color: #fff; margin-bottom: 8px;">Curated Workspaces</div>
        <ul style="list-style: none; padding: 0; margin: 0; line-height: 2;">
          <li><a href="/templates/active-recall-srs" style="color: #94a3b8; text-decoration: none;">Active Recall Hub</a></li>
          <li><a href="/templates/para-method-second-brain" style="color: #94a3b8; text-decoration: none;">PARA Method Second Brain</a></li>
          <li><a href="/templates" style="color: #94a3b8; text-decoration: none;">All Free Templates</a></li>
        </ul>
      </div>
    </div>
    <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px;">
      © ${new Date().getFullYear()} MANIAC. All notes and relational databases stored strictly in local IndexedDB.
    </div>
  </footer>
`;

// Define All High-Intent SEO Routes
const routes = [
  {
    path: '/',
    title: 'MANIAC — Turn Chaos into a System | Local-First Workspace',
    description: 'Turn chaos into a system. MANIAC unifies notes, relational databases, active recall flashcards, and knowledge graphs in a 0ms offline browser vault.',
    h1: 'Turn Chaos into a System with a Sovereign, Local-First Workspace',
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
        'url': `${SITE_URL}/`,
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
        'url': `${SITE_URL}/`,
        'image': `${SITE_URL}/og-image.png`,
        'screenshot': `${SITE_URL}/og-image.png`,
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
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        'name': SITE_NAME,
        'url': `${SITE_URL}/`,
        'logo': `${SITE_URL}/apple-touch-icon.png`,
        'sameAs': [
          'https://github.com/dvynshuu/maniac'
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
      ${commonCrawlerNav}
      <main style="padding: 20px 0;">
        <h1 style="font-size: 38px; font-weight: 900; line-height: 1.2; letter-spacing: -0.03em; margin-bottom: 16px;">
          Turn Chaos into a System with a Sovereign, Local-First Workspace
        </h1>
        <p style="font-size: 18px; line-height: 1.6; color: #94a3b8; margin-bottom: 28px;">
          Consolidate fragmented notes, relational databases, active recall flashcards, and knowledge graphs into a single sovereign workspace—stored completely on your device with AES-256 encryption and zero cloud latency.
        </p>

        <div style="display: flex; gap: 16px; margin-bottom: 48px; flex-wrap: wrap;">
          <a href="/app" style="background: linear-gradient(135deg, #f97316, #ef4444); color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Open MANIAC Workspace</a>
          <a href="/notion-alternative" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Compare with Notion</a>
          <a href="/obsidian-alternative" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Compare with Obsidian</a>
          <a href="/active-recall-notes" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Active Recall Notes</a>
          <a href="/templates" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Browse Templates</a>
        </div>

        <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 16px;">Key Architectural Capabilities</h2>
        <ul style="line-height: 2; color: #cbd5e1; font-size: 16px; margin-bottom: 40px;">
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
        </section>
      </main>
      ${commonCrawlerFooter}
    `
  },
  {
    path: '/notion-alternative',
    title: 'Best Offline Notion Alternative — Local-First Workspace | MANIAC',
    description: 'Looking for an offline Notion alternative? MANIAC delivers block notes, relational databases, active recall, and AES-256 encryption with 0ms latency.',
    h1: 'The Best Offline Notion Alternative — Local-First & Zero-Latency',
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
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${SITE_URL}/` },
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
          },
          {
            '@type': 'Question',
            'name': 'Does MANIAC support relational databases like Notion?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes. MANIAC includes flexible relational databases with Table, Kanban Board, and Calendar views, complete with custom properties, filtering, sorting, and inline calculations.'
            }
          },
          {
            '@type': 'Question',
            'name': 'How does MANIAC differ from Obsidian?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Obsidian relies on plain markdown files with a plugin-heavy ecosystem and does not natively provide Notion-style block drag-and-drop or relational database tables out of the box. MANIAC delivers a cohesive Notion-like block canvas and rich databases combined with native Anki-style spaced repetition and a 2D knowledge graph.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Is MANIAC completely free and private?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes. MANIAC runs entirely on your device with no registration forms, no telemetry tracking, and no cloud paywalls. Your data remains your sovereign property.'
            }
          }
        ]
      }
    ],
    htmlContent: `
      ${commonCrawlerNav}
      <nav style="display: flex; gap: 8px; font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
        <a href="/" style="color: #94a3b8; text-decoration: none;">Home</a> <span>/</span> <span>Notion Alternative</span>
      </nav>
      <main>
        <h1 style="font-size: 36px; font-weight: 900; line-height: 1.2; margin-bottom: 16px;">The Best Offline Notion Alternative — Local-First &amp; Zero-Latency</h1>
        <p style="font-size: 18px; line-height: 1.6; color: #94a3b8; margin-bottom: 32px;">
          Experience block-based rich text, relational databases (tables, boards, calendars), active recall flashcards, and AES-256 encryption with 0ms offline speed.
        </p>
        <div style="display: flex; gap: 16px; margin-bottom: 40px; flex-wrap: wrap;">
          <a href="/app" style="background: linear-gradient(135deg, #f97316, #ef4444); color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Launch MANIAC Workspace</a>
          <a href="/templates" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Browse Templates</a>
        </div>

        <h2 style="font-size: 26px; font-weight: 800; margin-bottom: 16px;">Detailed Feature Comparison: MANIAC vs Notion</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 48px; font-size: 15px;">
          <thead>
            <tr style="border-bottom: 2px solid rgba(255,255,255,0.15); text-align: left;">
              <th style="padding: 12px;">Capability</th>
              <th style="padding: 12px; color: #f97316;">MANIAC (Local-First)</th>
              <th style="padding: 12px; color: #94a3b8;">Notion (Cloud-Centric)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
              <td style="padding: 12px;"><strong>Data Storage Location</strong></td>
              <td style="padding: 12px; color: #22c55e;">✓ Client-Side IndexedDB</td>
              <td style="padding: 12px; color: #ef4444;">✗ Proprietary Cloud Servers</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
              <td style="padding: 12px;"><strong>Offline Functionality</strong></td>
              <td style="padding: 12px; color: #22c55e;">✓ Complete &amp; Native 0ms</td>
              <td style="padding: 12px; color: #ef4444;">✗ Highly Limited / Read Only</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
              <td style="padding: 12px;"><strong>Data Encryption</strong></td>
              <td style="padding: 12px; color: #22c55e;">✓ Hardware AES-256-GCM Vault</td>
              <td style="padding: 12px; color: #ef4444;">✗ Unencrypted at Rest from Notion Staff</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
              <td style="padding: 12px;"><strong>Relational Databases</strong></td>
              <td style="padding: 12px; color: #22c55e;">✓ Tables, Boards, Calendars</td>
              <td style="padding: 12px; color: #22c55e;">✓ Full Database Suite</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
              <td style="padding: 12px;"><strong>Active Recall &amp; SRS</strong></td>
              <td style="padding: 12px; color: #22c55e;">✓ Built-in Leitner Algorithm</td>
              <td style="padding: 12px; color: #ef4444;">✗ Not Supported Natively</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
              <td style="padding: 12px;"><strong>Notion ZIP Importer</strong></td>
              <td style="padding: 12px; color: #22c55e;">✓ In-Browser Extraction</td>
              <td style="padding: 12px; color: #94a3b8;">N/A</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
              <td style="padding: 12px;"><strong>Pricing &amp; Account</strong></td>
              <td style="padding: 12px; color: #22c55e;">✓ 100% Free, No Sign-up</td>
              <td style="padding: 12px; color: #ef4444;">✗ Mandatory Account &amp; Paid Plans</td>
            </tr>
          </tbody>
        </table>

        <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 16px;">Why Discerning Knowledge Workers Switch</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 48px;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 20px;">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #f97316;">Zero Latency Architecture</h3>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0;">Notion requires constant network roundtrips to fetch pages and save edits. MANIAC writes synchronously to browser IndexedDB, eliminating all loading spinners and typing delays.</p>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 20px;">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #3b82f6;">Sovereign Privacy</h3>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0;">Cloud tools expose your private thoughts to data breaches, AI training pipelines, and employee inspection. MANIAC keeps your notes strictly on your device with hardware AES-256 encryption.</p>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 20px;">
            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #10b981;">Active Recall Integration</h3>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0;">Stop merely collecting notes. MANIAC transforms any toggle block into an active recall flashcard, using spaced repetition to guarantee permanent knowledge retention.</p>
          </div>
        </div>

        <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 16px;">Frequently Asked Questions</h2>
        <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 40px;">
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px;">
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #fff;">Why should I switch from Notion to MANIAC?</h3>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0;">Notion requires constant cloud connectivity, suffers from noticeable server latency, and stores your personal thoughts in plaintext on third-party cloud servers. MANIAC is local-first: it boots in 0ms, works 100% offline, stores all data in your browser IndexedDB with optional AES-256 hardware encryption, and includes native active recall spaced repetition.</p>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px;">
            <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #fff;">Can I import my existing Notion workspace into MANIAC?</h3>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0;">Yes. MANIAC features a built-in client-side Notion ZIP parser. Export your Notion workspace as HTML/Markdown ZIP, drag it into MANIAC, and it converts your pages, hierarchy, and markdown blocks instantly on your device without uploading anything to a server.</p>
          </div>
        </div>
      </main>
      ${commonCrawlerFooter}
    `
  },
  {
    path: '/obsidian-alternative',
    title: 'Best Obsidian Alternative with Native Databases & Blocks | MANIAC',
    description: 'Looking for an Obsidian alternative with Notion-style databases and drag-and-drop blocks? MANIAC delivers local-first speed, active recall, and AES-256 encryption.',
    h1: 'The Best Obsidian Alternative with Native Databases & Blocks',
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
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${SITE_URL}/` },
          { '@type': 'ListItem', 'position': 2, 'name': 'Obsidian Alternative', 'item': `${SITE_URL}/obsidian-alternative` }
        ]
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'Why choose MANIAC over Obsidian for personal knowledge management?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Obsidian relies on plain markdown files and requires dozens of third-party community plugins (like Dataview, Kanban, and Projects) that frequently break on updates. MANIAC provides native Notion-style relational databases (Table, Kanban, Calendar), modular drag-and-drop block editing, built-in active recall spaced repetition, and client-side AES-256 encryption right out of the box with zero plugins required.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Does MANIAC have bi-directional linking and a knowledge graph like Obsidian?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes. MANIAC features full bidirectional @ and [[ backlinks and an interactive real-time 2D force graph visualization of connected pages and thoughts, built directly into the core engine.'
            }
          }
        ]
      }
    ],
    htmlContent: `
      ${commonCrawlerNav}
      <nav style="display: flex; gap: 8px; font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
        <a href="/" style="color: #94a3b8; text-decoration: none;">Home</a> <span>/</span> <span>Obsidian Alternative</span>
      </nav>
      <main>
        <h1 style="font-size: 36px; font-weight: 900; line-height: 1.2; margin-bottom: 16px;">The Best Obsidian Alternative with Native Databases &amp; Blocks</h1>
        <p style="font-size: 18px; line-height: 1.6; color: #94a3b8; margin-bottom: 32px;">
          MANIAC gives you Obsidian's 100% local-first privacy and 2D knowledge graphs, but with Notion's native relational databases (table, kanban, calendar) and drag-and-drop block canvas.
        </p>
        <div style="display: flex; gap: 16px; margin-bottom: 40px; flex-wrap: wrap;">
          <a href="/app" style="background: linear-gradient(135deg, #a855f7, #3b82f6); color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Open Workspace</a>
          <a href="/templates" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Explore Templates</a>
        </div>

        <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 16px;">Core Comparisons vs Obsidian</h2>
        <ul style="line-height: 2; color: #cbd5e1; font-size: 16px; margin-bottom: 40px;">
          <li><strong>Native Relational DBs:</strong> Table, Kanban, and Calendar views without brittle Dataview plugins.</li>
          <li><strong>Rich Block Canvas:</strong> Drag-and-drop TipTap modular blocks instead of raw text syntax.</li>
          <li><strong>Integrated Active Recall:</strong> Turn notes directly into spaced repetition cards without third-party flashcard plugins.</li>
          <li><strong>Zero Cloud Costs:</strong> Free multi-tab CRDT sync and compressed snapshots without paying $8/mo for Obsidian Sync.</li>
        </ul>
      </main>
      ${commonCrawlerFooter}
    `
  },
  {
    path: '/active-recall-notes',
    title: 'Active Recall Note-Taking App with Spaced Repetition | MANIAC',
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
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${SITE_URL}/` },
          { '@type': 'ListItem', 'position': 2, 'name': 'Active Recall Notes', 'item': `${SITE_URL}/active-recall-notes` }
        ]
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'How does Active Recall in MANIAC work?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'In MANIAC, any note, toggle block, or document can be flagged for Active Recall. When you enter Workspace Review, MANIAC hides the answers and presents prompts in an interactive review queue. After self-testing, you rate your recall difficulty (Again, Hard, Good, Easy), and our Leitner / SM-2 spaced repetition algorithm schedules the optimal future review date based on the Ebbinghaus forgetting curve.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Why not just use Notion for notes and Anki for flashcards?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Switching between Notion and Anki forces dual maintenance: you write notes in one app, then spend hours manually copying sentences into flashcards in another. In MANIAC, your notes ARE your flashcards. You study with full surrounding context in 0ms offline.'
            }
          }
        ]
      }
    ],
    htmlContent: `
      ${commonCrawlerNav}
      <nav style="display: flex; gap: 8px; font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
        <a href="/" style="color: #94a3b8; text-decoration: none;">Home</a> <span>/</span> <span>Active Recall Notes</span>
      </nav>
      <main>
        <h1 style="font-size: 36px; font-weight: 900; line-height: 1.2; margin-bottom: 16px;">The Note-Taking App with Native Active Recall &amp; Spaced Repetition</h1>
        <p style="font-size: 18px; line-height: 1.6; color: #94a3b8; margin-bottom: 32px;">
          Unify your study notes and flashcards. In MANIAC, any toggle or question block can be practiced in the Leitner spaced repetition review queue with 0ms offline speed.
        </p>
        <div style="display: flex; gap: 16px; margin-bottom: 40px; flex-wrap: wrap;">
          <a href="/app" style="background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Start Studying in MANIAC</a>
          <a href="/templates/active-recall-srs" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Get Active Recall Template</a>
        </div>
      </main>
      ${commonCrawlerFooter}
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
          { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${SITE_URL}/` },
          { '@type': 'ListItem', 'position': 2, 'name': 'Templates', 'item': `${SITE_URL}/templates` }
        ]
      }
    ],
    htmlContent: `
      ${commonCrawlerNav}
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
      ${commonCrawlerFooter}
    `
  }
];

// Add each individual template as a dedicated programmatic SEO route with deep content
TEMPLATES.forEach(tpl => {
  const structuredDataList = [
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
      'image': `${SITE_URL}/og-image.png`,
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
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${SITE_URL}/` },
        { '@type': 'ListItem', 'position': 2, 'name': 'Templates', 'item': `${SITE_URL}/templates` },
        { '@type': 'ListItem', 'position': 3, 'name': tpl.title, 'item': `${SITE_URL}/templates/${tpl.id}` }
      ]
    }
  ];

  if (tpl.faqs && tpl.faqs.length > 0) {
    structuredDataList.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': tpl.faqs.map(f => ({
        '@type': 'Question',
        'name': f.q,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': f.a
        }
      }))
    });
  }

  routes.push({
    path: `/templates/${tpl.id}`,
    title: `${tpl.title} — Free Workspace Template | MANIAC`,
    description: tpl.metaDescription,
    h1: tpl.title,
    subtitle: tpl.summary,
    priority: '0.8',
    changefreq: 'weekly',
    structuredData: structuredDataList,
    htmlContent: `
      ${commonCrawlerNav}
      <nav style="display: flex; gap: 8px; font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
        <a href="/" style="color: #94a3b8; text-decoration: none;">Home</a> <span>/</span>
        <a href="/templates" style="color: #94a3b8; text-decoration: none;">Templates</a> <span>/</span>
        <span>${tpl.title}</span>
      </nav>
      <main>
        <div style="font-size: 40px; margin-bottom: 12px;">${tpl.icon}</div>
        <h1 style="font-size: 34px; font-weight: 900; line-height: 1.2; margin-bottom: 12px;">${tpl.title}</h1>
        <p style="font-size: 17px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px;">${tpl.summary}</p>
        <div style="display: flex; gap: 16px; margin-bottom: 40px; flex-wrap: wrap;">
          <a href="/app" style="background: linear-gradient(135deg, #f97316, #ef4444); color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Use Template in MANIAC</a>
          <a href="/templates" style="background: rgba(255,255,255,0.06); color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; border: 1px solid rgba(255,255,255,0.1);">Back to Templates</a>
        </div>

        <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 14px;">Key Features Included</h2>
        <ul style="line-height: 1.8; color: #cbd5e1; font-size: 15px; margin-bottom: 36px;">
          ${tpl.features.map(f => `<li>${f}</li>`).join('')}
        </ul>

        ${tpl.blocks && tpl.blocks.length > 0 ? `
          <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 14px;">Included Workspace Blocks</h2>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 20px; margin-bottom: 36px;">
            ${tpl.blocks.map(b => `
              <div style="margin-bottom: 12px; font-size: 14px; color: #cbd5e1;">
                <span style="display: inline-block; padding: 2px 6px; background: rgba(255,255,255,0.08); border-radius: 4px; font-size: 11px; margin-right: 8px; text-transform: uppercase;">${b.type}</span>
                ${b.content}
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${tpl.usageGuide && tpl.usageGuide.length > 0 ? `
          <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 14px;">Step-by-Step Implementation Guide</h2>
          <ol style="line-height: 1.8; color: #cbd5e1; font-size: 15px; margin-bottom: 36px;">
            ${tpl.usageGuide.map(step => `<li>${step}</li>`).join('')}
          </ol>
        ` : ''}

        ${tpl.faqs && tpl.faqs.length > 0 ? `
          <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 14px;">Frequently Asked Questions</h2>
          <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 36px;">
            ${tpl.faqs.map(f => `
              <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px;">
                <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 6px; color: #fff;">${f.q}</h3>
                <p style="color: #94a3b8; font-size: 13.5px; line-height: 1.6; margin: 0;">${f.a}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </main>
      ${commonCrawlerFooter}
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

  // 3. Ensure Robots Meta has rich preview parameters
  html = html.replace(/<meta\s+name="robots"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />`);

  // 4. Replace Canonical
  const canonicalUrl = `${SITE_URL}${route.path === '/' ? '/' : route.path}`;
  html = html.replace(/<link\s+rel="canonical"\s+href="[\s\S]*?"\s*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`);

  // 5. Replace Open Graph
  html = html.replace(/<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/i, `<meta property="og:title" content="${route.title}" />`);
  html = html.replace(/<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/i, `<meta property="og:description" content="${route.description}" />`);
  html = html.replace(/<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);

  // 6. Replace Twitter
  html = html.replace(/<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:title" content="${route.title}" />`);
  html = html.replace(/<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:description" content="${route.description}" />`);

  // Ensure twitter:site and creator
  if (!html.includes('twitter:site')) {
    html = html.replace(/<meta\s+name="twitter:card"[^>]*>/i, `$&
    <meta name="twitter:site" content="@maniacc_app" />
    <meta name="twitter:creator" content="@maniacc_app" />`);
  }

  // Ensure llms.txt discovery link
  if (!html.includes('llms.txt')) {
    html = html.replace(/<\/head>/i, `  <link rel="alternate" type="text/plain" href="/llms.txt" title="LLMs.txt" />
    <link rel="alternate" type="text/plain" href="/llms-full.txt" title="LLMs-Full.txt" />
  </head>`);
  }

  // 7. Replace JSON-LD
  const jsonLdString = JSON.stringify(route.structuredData, null, 2);
  html = html.replace(
    /<script\s+type="application\/ld\+json"\s+id="maniac-json-ld">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json" id="maniac-json-ld">\n${jsonLdString}\n    </script>`
  );

  // 8. Inject Semantic Pre-Render Fallback into #root
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

// Generate static 404.html to eliminate Soft 404s
const html404 = baseIndexHtml
  .replace(/<title>[\s\S]*?<\/title>/i, `<title>404 — Page Not Found | MANIAC</title>`)
  .replace(/<meta\s+name="robots"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="robots" content="noindex, nofollow" />`)
  .replace(/<link\s+rel="canonical"\s+href="[\s\S]*?"\s*\/?>/i, '')
  .replace(
    /<div id="root">[\s\S]*?<\/div>\s*<noscript>/i,
    `<div id="root">
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 80px auto; padding: 40px 20px; text-align: center; color: #f1f5f9;">
        <h1 style="font-size: 32px; font-weight: 800; margin-bottom: 12px;">404 — Page Not Found</h1>
        <p style="color: #94a3b8; font-size: 16px; margin-bottom: 32px; line-height: 1.6;">The document or node you requested does not exist in this workspace vault.</p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="/" style="background: rgba(255,255,255,0.08); color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">Return Home</a>
          <a href="/app" style="background: linear-gradient(135deg, #f97316, #ef4444); color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Open Workspace</a>
          <a href="/templates" style="background: rgba(255,255,255,0.08); color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">Browse Templates</a>
        </div>
      </div>
    </div>\n    <noscript>`
  );

fs.writeFileSync(path.join(DIST_DIR, '404.html'), html404, 'utf8');
fs.writeFileSync(path.join(PUBLIC_DIR, '404.html'), html404, 'utf8');
console.log('  ✓ Generated static 404.html');

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

// Generate Hardened Robots.txt
const robotsTxt = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /
Disallow: /app
Disallow: /page
Disallow: /share

# Explicit AI Search Crawlers & Web Scrapers
User-agent: GPTBot
Allow: /
Disallow: /app
Disallow: /page
Disallow: /share

User-agent: ClaudeBot
Allow: /
Disallow: /app
Disallow: /page
Disallow: /share

User-agent: PerplexityBot
Allow: /
Disallow: /app
Disallow: /page
Disallow: /share

# Host and Sitemap
Sitemap: ${SITE_URL}/sitemap.xml
`;

fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf8');
fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robotsTxt, 'utf8');
console.log(`  ✓ Generated hardened robots.txt`);

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
