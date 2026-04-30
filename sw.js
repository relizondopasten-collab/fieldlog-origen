/* ═══════════════════════════════════════════════════
   FieldLog · Service Worker
   Versión cacheada — sube el número cuando publiques
   cambios para forzar la actualización en los celulares.
═══════════════════════════════════════════════════ */
const CACHE_VERSION = 'fieldlog-v1';

// Archivos del "shell" de la app que siempre cacheamos
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

// ── Instalación: precachea el shell ──────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── Activación: borra caches viejos ──────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: estrategia network-first, fallback a cache
//    Para Firebase / gstatic dejamos que pase a la red
//    (no se cachean para que los datos sean siempre frescos).
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // No interceptar requests no-GET ni de Firebase
  if (req.method !== 'GET') return;
  if (url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebaseapp.com') ||
      url.hostname.includes('firebasestorage')) return;

  // Network-first para todo lo demás (HTML, iconos, fuentes)
  event.respondWith(
    fetch(req)
      .then(res => {
        // Cachear copia de la respuesta si es del mismo origen
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
