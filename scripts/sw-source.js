/**
 * The app shell service worker.
 *
 * Scope is "/" (registered from the root — see lib/registerServiceWorker.ts).
 * __SW_VERSION__ is substituted at build time by scripts/generate-sw.mjs
 * with the deploy's commit SHA (or a timestamp locally), so every deploy
 * gets fresh cache names and activate() below sweeps away the previous
 * deploy's caches.
 *
 * Caching rules, deliberately narrow:
 *   - Only same-origin GET requests are ever touched. A cross-origin
 *     request (Supabase's REST/auth API lives on a different origin) or
 *     any non-GET method falls straight through untouched — this is what
 *     keeps auth tokens, profile data, and any POST/PUT/PATCH/DELETE
 *     entirely out of the cache, without needing a URL denylist that could
 *     drift out of date.
 *   - Navigation requests (the HTML shell) are network-first: a fresh
 *     deploy is picked up immediately when online, falling back to the
 *     last cached shell, then to the static offline page, only when the
 *     network is unavailable.
 *   - Static build assets (Metro's content-hashed JS/CSS bundles, fonts,
 *     images, icons, the manifest) are cache-first — a hashed filename's
 *     contents never change, so once cached it's safe to serve forever
 *     without re-checking the network.
 */
const SW_VERSION = "__SW_VERSION__";
const SHELL_CACHE = `shell-${SW_VERSION}`;
const STATIC_CACHE = `static-${SW_VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, STATIC_CACHE];
const OFFLINE_URL = "/offline.html";
const SHELL_URL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([SHELL_URL, OFFLINE_URL, "/manifest.json"]))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstShell(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  // Anything else same-origin (e.g. a future API-shaped route) is left
  // alone — no fetch handler runs for it, so it goes straight to network.
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_expo/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(js|css|woff2?|ttf|otf|png|jpe?g|svg|ico|gif|webp)$/.test(url.pathname)
  );
}

async function networkFirstShell(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put(SHELL_URL, response.clone());
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match(SHELL_URL)) ?? (await cache.match(OFFLINE_URL)) ?? Response.error();
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return cached ?? Response.error();
  }
}
