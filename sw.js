/* ============================================================
   NEXUS PWA - Service Worker
   Stratégie : cache-first pour l'app shell, network-only pour /api
   ============================================================ */

const CACHE_NAME = 'nexus-v1.0.0';
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js'
];

// Installation : pré-cache l'app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(err => {
        console.warn('Pre-cache partiel :', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation : nettoyer les vieux caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch : stratégies différenciées
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Toujours réseau pour les appels API (chat, HA states/service)
  if (url.pathname.startsWith('/api/') || url.pathname === '/health') {
    return; // Laisse le navigateur faire sa requête normale
  }

  // Stratégie network-first pour les pages HTML (toujours fraîches si possible)
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // Stratégie cache-first pour assets statiques
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (!res || res.status !== 200) return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        return res;
      }).catch(() => cached);
    })
  );
});
