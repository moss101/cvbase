/*
 * CVBase service worker (web only — the Capacitor apps never register it).
 *
 * Strategy:
 *   - navigations: network first, falling back to the cached app shell (`/`)
 *     so the SPA still boots offline;
 *   - `/assets/*` and font files: stale-while-revalidate (hashed filenames make
 *     a stale hit harmless);
 *   - `/functions/v1/*` and anything on supabase.co: never touched.
 *
 * Bump CACHE_VERSION whenever the caching rules change; old caches are dropped
 * on activate.
 */
const CACHE_VERSION = 'v1';
const CACHE_NAME = `cvbase-${CACHE_VERSION}`;
const APP_SHELL = '/';
const FONT_RE = /\.(?:woff2?|ttf|otf|eot)(?:\?.*)?$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(new Request(APP_SHELL, { cache: 'reload' })))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('cvbase-') && k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

const isBypassed = (url) =>
  url.hostname.endsWith('supabase.co') || url.pathname.startsWith('/functions/v1/');

const isStaticAsset = (url) =>
  url.origin === self.location.origin && (url.pathname.startsWith('/assets/') || FONT_RE.test(url.pathname));

const networkFirstNavigation = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(APP_SHELL, response.clone()).catch(() => undefined);
    return response;
  } catch (err) {
    const shell = await cache.match(APP_SHELL);
    if (shell) return shell;
    throw err;
  }
};

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone()).catch(() => undefined);
      return response;
    })
    .catch(() => undefined);
  return cached || (await refresh) || Response.error();
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (isBypassed(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
