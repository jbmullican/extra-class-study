// Offline-first service worker. Bump VERSION when any asset changes.
const VERSION = 'ecs-v1.1.0';
const ASSETS = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/core.js', 'js/config.js', 'manifest.webmanifest', 'data/pool-extra-2024-2028.json', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'figures/E5-1.svg', 'figures/E6-1.svg', 'figures/E6-2.svg', 'figures/E6-3.svg', 'figures/E7-1.svg', 'figures/E7-2.svg', 'figures/E7-3.svg', 'figures/E9-1.svg', 'figures/E9-2.svg', 'figures/E9-3.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  })));
});
