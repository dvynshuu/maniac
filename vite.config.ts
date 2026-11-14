import { defineConfig, type Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

function versionedServiceWorkerPlugin(): Plugin {
  return {
    name: 'versioned-service-worker',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const swDistPath = path.join(distDir, 'sw.js');
      if (fs.existsSync(swDistPath)) {
        let swContent = fs.readFileSync(swDistPath, 'utf-8');
        const buildHash = Date.now().toString(36);
        const cacheVersion = `maniac-cache-${buildHash}`;

        // Discover generated hashed assets in dist/assets
        const assetsDir = path.join(distDir, 'assets');
        let assetFiles: string[] = [];
        if (fs.existsSync(assetsDir)) {
          assetFiles = fs.readdirSync(assetsDir).map(file => `/assets/${file}`);
        }

        // Replace cache name
        swContent = swContent.replace(
          /const CACHE_NAME = ['"][^'"]+['"];/,
          `const CACHE_NAME = '${cacheVersion}';`
        );

        // Inject dynamic precache list: strictly shell files and hashed code bundles.
        // Explicitly excludes high-resolution icon variants (icon-1024x1024.png, mstile-*, apple-touch-icon-*,
        // android-chrome-*) to eliminate multi-megabyte payloads on first visit.
        const filteredCodeAssets = assetFiles.filter(f => {
          const isCode = f.endsWith('.js') || f.endsWith('.css');
          const isIcon = /(icon-|android-chrome|apple-touch|mstile|og-image)/i.test(f);
          return isCode && !isIcon;
        });

        const precacheAssets = [
          '/',
          '/index.html',
          '/favicon.svg',
          '/favicon.ico',
          '/site.webmanifest',
          ...filteredCodeAssets
        ];

        swContent = swContent.replace(
          /const PRECACHE_ASSETS = \[[\s\S]*?\];/,
          `const PRECACHE_ASSETS = ${JSON.stringify(precacheAssets, null, 2)};`
        );

        fs.writeFileSync(swDistPath, swContent, 'utf-8');
        console.log(`[SW Plugin] Injected ${assetFiles.length} hashed assets into versioned service worker (${cacheVersion})`);
      }
    }
  };
}

export default defineConfig({
  plugins: [versionedServiceWorkerPlugin()],
  build: {
    chunkSizeWarningLimit: 1000
  }
});
