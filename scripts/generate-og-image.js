import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradients -->
    <radialGradient id="bgGlow" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#141829" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="#0a0c16" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#050508" stop-opacity="1"/>
    </radialGradient>

    <radialGradient id="emberGlow" cx="28%" cy="50%" r="35%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.2"/>
      <stop offset="50%" stop-color="#6366f1" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#050508" stop-opacity="0"/>
    </radialGradient>

    <!-- Logo Gradients -->
    <linearGradient id="logoG1" x1="10" y1="110" x2="110" y2="10" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1E3A8A" />
      <stop offset="30%" stop-color="#2E5BFF" />
      <stop offset="65%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#A855F7" />
    </linearGradient>

    <linearGradient id="logoG2" x1="30" y1="100" x2="90" y2="20" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#818CF8" />
    </linearGradient>

    <linearGradient id="logoScar" x1="15" y1="90" x2="105" y2="30" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F97316" />
      <stop offset="40%" stop-color="#EF4444" />
      <stop offset="70%" stop-color="#F43F5E" />
      <stop offset="100%" stop-color="#FB923C" />
    </linearGradient>

    <linearGradient id="logoScarCore" x1="15" y1="90" x2="105" y2="30" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="50%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#FDE68A" />
    </linearGradient>

    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#CBD5E1"/>
    </linearGradient>

    <linearGradient id="taglineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="50%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#60a5fa"/>
    </linearGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="1200" height="630" fill="#050508"/>
  <rect width="1200" height="630" fill="url(#bgGlow)"/>
  <rect width="1200" height="630" fill="url(#emberGlow)"/>

  <!-- Grid overlay -->
  <g opacity="0.06" stroke="#ffffff" stroke-width="1">
    <line x1="0" y1="105" x2="1200" y2="105" />
    <line x1="0" y1="210" x2="1200" y2="210" />
    <line x1="0" y1="315" x2="1200" y2="315" />
    <line x1="0" y1="420" x2="1200" y2="420" />
    <line x1="0" y1="525" x2="1200" y2="525" />
    <line x1="200" y1="0" x2="200" y2="630" />
    <line x1="400" y1="0" x2="400" y2="630" />
    <line x1="600" y1="0" x2="600" y2="630" />
    <line x1="800" y1="0" x2="800" y2="630" />
    <line x1="1000" y1="0" x2="1000" y2="630" />
  </g>

  <!-- Knowledge Graph Nodes in Background -->
  <g opacity="0.25" stroke="#6366f1" stroke-width="1.5">
    <line x1="850" y1="160" x2="980" y2="220" />
    <line x1="980" y1="220" x2="1100" y2="150" />
    <line x1="980" y1="220" x2="1020" y2="340" />
    <line x1="1020" y1="340" x2="890" y2="390" />
    <line x1="890" y1="390" x2="850" y2="160" />
    <line x1="1020" y1="340" x2="1120" y2="440" />
    <line x1="890" y1="390" x2="800" y2="480" />
  </g>
  <g opacity="0.7">
    <circle cx="850" cy="160" r="7" fill="#38bdf8" />
    <circle cx="980" cy="220" r="10" fill="#6366f1" />
    <circle cx="1100" cy="150" r="6" fill="#818cf8" />
    <circle cx="1020" cy="340" r="9" fill="#f97316" />
    <circle cx="890" cy="390" r="8" fill="#ec4899" />
    <circle cx="1120" cy="440" r="6" fill="#a855f7" />
    <circle cx="800" cy="480" r="5" fill="#38bdf8" />
  </g>

  <!-- Left Side: Maniac Monolith Logo (Scaled to ~180x180) -->
  <g transform="translate(100, 150) scale(1.75)">
    <!-- Outer M Structure -->
    <polygon points="12,102 12,22 18,18 28,16 30,98" fill="url(#logoG1)" />
    <polygon points="18,18 28,16 30,98 24,100 18,24" fill="url(#logoG2)" opacity="0.4" />
    <polygon points="28,16 36,10 60,54 50,62" fill="url(#logoG1)" />
    <polygon points="32,14 36,10 60,54 56,56" fill="url(#logoG2)" opacity="0.35" />
    <polygon points="50,62 60,54 70,58 60,68" fill="#0F172A" opacity="0.9" />
    <polygon points="60,54 70,58 84,12 92,10" fill="url(#logoG1)" />
    <polygon points="64,56 70,58 84,12 88,11" fill="url(#logoG2)" opacity="0.35" />
    <polygon points="84,12 92,10 108,18 108,102 90,98" fill="url(#logoG1)" />
    <polygon points="96,16 108,18 108,102 102,100 102,22" fill="url(#logoG2)" opacity="0.3" />
    <rect x="10" y="98" width="100" height="8" rx="2" fill="url(#logoG1)" opacity="0.75" />
    <!-- Scar -->
    <line x1="16" y1="86" x2="104" y2="34" stroke="url(#logoScar)" stroke-width="5" stroke-linecap="round" filter="url(#glow)" />
    <line x1="18" y1="85" x2="103" y2="35" stroke="url(#logoScarCore)" stroke-width="1.8" stroke-linecap="round" />
    <!-- Debris -->
    <polygon points="86,30 94,24 90,36" fill="#F97316" opacity="0.8" />
    <polygon points="76,40 82,36 80,44 74,42" fill="#EF4444" opacity="0.7" />
    <polygon points="62,52 66,48 64,56" fill="#FB923C" opacity="0.6" />
    <polygon points="34,74 38,70 36,78" fill="#A855F7" opacity="0.6" />
  </g>

  <!-- Right/Center Content -->
  <!-- Category Badge -->
  <g transform="translate(340, 135)">
    <rect width="280" height="34" rx="17" fill="#161622" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <circle cx="18" cy="17" r="5" fill="#f97316" />
    <text x="32" y="22" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5">LOCAL-FIRST WORKSPACE</text>
  </g>

  <!-- Brand Title -->
  <text x="340" y="240" fill="url(#textGrad)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="68" font-weight="900" letter-spacing="-1.5">
    MANIAC
  </text>

  <!-- Tagline -->
  <text x="340" y="295" fill="url(#taglineGrad)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800" letter-spacing="-0.02em">
    Turn chaos into a system.
  </text>

  <!-- Subtitle -->
  <text x="340" y="335" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="400">
    The Sovereign Workspace for Knowledge, Structured Data &amp; Productivity
  </text>

  <!-- Feature Highlights -->
  <g transform="translate(340, 380)">
    <!-- Pill 1 -->
    <g transform="translate(0, 0)">
      <rect width="180" height="42" rx="8" fill="#0f111a" stroke="rgba(99,102,241,0.3)" stroke-width="1"/>
      <text x="16" y="26" fill="#cbd5e1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600">🔒 Local-First &amp; Private</text>
    </g>

    <!-- Pill 2 -->
    <g transform="translate(195, 0)">
      <rect width="170" height="42" rx="8" fill="#0f111a" stroke="rgba(249,115,22,0.3)" stroke-width="1"/>
      <text x="16" y="26" fill="#cbd5e1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600">🧠 Active Recall SRS</text>
    </g>

    <!-- Pill 3 -->
    <g transform="translate(380, 0)">
      <rect width="180" height="42" rx="8" fill="#0f111a" stroke="rgba(56,189,248,0.3)" stroke-width="1"/>
      <text x="16" y="26" fill="#cbd5e1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600">📊 Relational Data</text>
    </g>

    <!-- Pill 4 -->
    <g transform="translate(575, 0)">
      <rect width="180" height="42" rx="8" fill="#0f111a" stroke="rgba(168,85,247,0.3)" stroke-width="1"/>
      <text x="16" y="26" fill="#cbd5e1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600">⚡ Zero-Latency Offline</text>
    </g>
  </g>

  <!-- URL Footer -->
  <g transform="translate(340, 490)">
    <text x="0" y="0" fill="#64748b" font-family="'JetBrains Mono', monospace" font-size="15" font-weight="500">
      https://maniacc.vercel.app
    </text>
  </g>
</svg>
`;

async function generate() {
  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const outputPath = path.join(publicDir, 'og-image.png');
  await sharp(Buffer.from(svg))
    .png({ quality: 95, compressionLevel: 8 })
    .toFile(outputPath);

  console.log(`Generated OG Image at ${outputPath}`);
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
