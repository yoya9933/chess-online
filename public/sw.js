const CACHE = 'chuhe-shell-v1.10.0';
const CORE = [
  '/', '/index.html', '/style.css', '/favicon.svg', '/app.js',
  '/jieqi-covered.css', '/sandbox-pink-frame.css', '/sandbox-gomoku-architecture.js',
  '/chess-ui-updates.css', '/chess-ui-updates.js', '/connection-status.js',
  '/enhancements-loader.js', '/enhancements-runtime.css', '/enhancements-runtime.js',
  '/diagnostics.css', '/diagnostics-client.js', '/security-client.js',
  '/responsive.css', '/game-ux.css', '/manifest.webmanifest',
  '/pwa.css', '/pwa-client.js', '/record-system.css', '/record-system.js',
  '/history.css', '/history-client.js', '/accessibility.css', '/accessibility.js',
  '/performance-client.js', '/platform-runtime.css', '/platform-runtime.js', '/realtime-client.js'
];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE))));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('message', (event) => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (url.pathname === '/version.json') {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => caches.match(request)));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put('/', copy));
      return response;
    }).catch(() => caches.match('/') || caches.match('/index.html')));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
