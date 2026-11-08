/**
 * Lotto Bet Service Worker (Task 3)
 *
 * Strict security & caching rules:
 * 1. NEVER cache authenticated API responses (`/api/*`), Supabase requests, or user-specific pages.
 * 2. Cache ONLY static assets (`/_next/static/*`, `/icons/*`, `/manifest.json`) and `/offline`.
 * 3. On `CLEAR_USER_CACHE` message (sent during `signOut()`), wipe all caches immediately.
 */

const CACHE_NAME = 'lotto-bet-static-v1';
const PRECACHE_URLS = [
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

const USER_SPECIFIC_PATHS = ['/my-picks', '/saved-slips', '/results', '/community', '/chat'];

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/offline'
  );
}

function isNeverCached(req, url) {
  if (req.method !== 'GET') return true;
  if (url.pathname.startsWith('/api/')) return true;
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) return true;
  if (req.headers.get('authorization')) return true;
  if (USER_SPECIFIC_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'))) {
    return true;
  }
  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_USER_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Never cache API, auth, or user-specific requests
  if (isNeverCached(req, url)) {
    if (req.mode === 'navigate') {
      event.respondWith(
        fetch(req).catch(() => caches.match('/offline').then((r) => r || Response.error())),
      );
    }
    return;
  }

  // Static assets: cache-first, fallback to network
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        });
      }),
    );
    return;
  }

  // Navigation requests: network-only (never cache HTML that may reflect session state), offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/offline').then((r) => r || Response.error())),
    );
  }
});
