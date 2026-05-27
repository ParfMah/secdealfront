/**
 * SECUREDEAL — Service Worker PWA
 * Cache offline, notifications push, background sync
 */

const CACHE_NAME    = 'securedeal-v1.2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/loader.css',
  '/css/design-system.css',
  '/css/main.css',
  '/css/dashboard.css',
  '/css/brand.css',
  '/js/loader.js',
  '/js/utils.js',
  '/js/icons.js',
  '/images/logo/securedeal-logo-white.svg',
  '/images/logo/securedeal-logo.svg',
  '/images/logo/favicon.svg',
  '/pages/tracking.html',
  '/pages/auth/login.html',
  '/manifest.json',
];

// ─── Installation ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })))
        .catch(() => {
          // Ignorer les erreurs de cache silencieusement
        });
    }).then(() => self.skipWaiting())
  );
});

// ─── Activation ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Stratégie de cache : Network First, Cache Fallback ───────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas cacher les requêtes API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Hors ligne — impossible de contacter le serveur' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503,
        })
      )
    );
    return;
  }

  // Assets statiques : Cache First
  if (
    request.method === 'GET' &&
    (url.pathname.startsWith('/css/') ||
     url.pathname.startsWith('/js/') ||
     url.pathname.startsWith('/images/') ||
     url.pathname.startsWith('/fonts/'))
  ) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }))
    );
    return;
  }

  // Pages HTML : Network First, Cache Fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || caches.match('/index.html')
          )
        )
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ─── Notifications Push ────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'SecureDeal', body: event.data.text() }; }

  const options = {
    body:    data.body    || 'Nouvelle notification SecureDeal',
    icon:    data.icon    || '/images/logo/favicon.svg',
    badge:   '/images/logo/favicon.svg',
    tag:     data.tag     || 'securedeal-notif',
    data:    data.data    || {},
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SecureDeal', options)
  );
});

// ─── Clic notification ─────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ─── Background Sync ───────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
  if (event.tag === 'sync-tracking') {
    event.waitUntil(syncTrackingData());
  }
});

async function syncPendingMessages() {
  // Synchroniser les messages en attente stockés en IndexedDB
}

async function syncTrackingData() {
  // Mettre à jour les données de tracking en arrière-plan
}
