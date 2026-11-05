// MANIAC Sovereign Workspace Service Worker (Offline-First Cache)
const CACHE_NAME = 'maniac-cache-v2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/favicon.ico',
  '/site.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[SW] Pre-caching partial failure:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Workaround for Chrome devtools / range requests
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
    return;
  }

  const url = new URL(request.url);

  // Skip third-party tracking or external non-origin analytics
  if (url.origin !== self.location.origin) {
    return;
  }

  // Bypass Vite dev server internal paths, HMR pings, and dev modules
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('__vite') ||
    url.searchParams.has('import') ||
    url.searchParams.has('t')
  ) {
    return;
  }

  // 1. Navigation requests (SPA page loads) -> Network first, fallback to cached index.html or root
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;

          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;

          return new Response('Offline - MANIAC Workspace unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        }
      })()
    );
    return;
  }

  // 2. Static hashed assets (/assets/...) -> Stale-While-Revalidate
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(request);
        const fetchPromise = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null);

        if (cachedResponse) {
          return cachedResponse;
        }

        const networkResult = await fetchPromise;
        if (networkResult) {
          return networkResult;
        }

        return new Response(null, {
          status: 504,
          statusText: 'Gateway Timeout'
        });
      })()
    );
    return;
  }

  // 3. All other local assets -> Cache with network fallback
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(request);
        if (response && response.status === 200) {
          const clone = response.clone();
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, clone);
        }
        return response;
      } catch (err) {
        // Prevent Uncaught (in promise) TypeError: Failed to fetch
        // Return a graceful 503 Service Unavailable response when offline or network fails
        return new Response(null, {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })()
  );
});
