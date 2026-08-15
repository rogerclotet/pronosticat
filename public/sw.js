/**
 * Bump on every change to this file that should invalidate what is cached.
 * The activate handler deletes every cache that is not in this version.
 */
const VERSION = "v1";
const SHELL_CACHE = `pronosticat-shell-${VERSION}`;
const ASSET_CACHE = `pronosticat-assets-${VERSION}`;

const OFFLINE_URL = "/offline";

const SHELL_ASSETS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      // A missing shell asset must not wedge the whole worker install.
      .catch((error) => console.warn("[sw] shell precache failed", error)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== SHELL_CACHE && name !== ASSET_CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/**
 * The page asks for this once the user accepts an update; until then a new
 * worker waits, so a running session is never swapped out mid-interaction.
 */
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/")
  );
}

/** Hashed and immutable, so a hit can be served without revalidating. */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Navigations are never served from cache on success: the HTML is
 * per-user, and a shared device must not replay another session's page.
 * Offline falls back to a static page that carries no account data.
 */
async function navigateOrOffline(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Auth and data endpoints must always hit the network.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(navigateOrOffline(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "Pronosticat",
    body: "Tens un avís nou.",
    url: "/",
    tag: "pronosticat",
  };

  let payload = fallback;
  try {
    const data = event.data?.json();
    if (data && typeof data === "object") {
      payload = {
        title: typeof data.title === "string" ? data.title : fallback.title,
        body: typeof data.body === "string" ? data.body : fallback.body,
        url: typeof data.url === "string" ? data.url : fallback.url,
        tag: typeof data.tag === "string" ? data.tag : fallback.tag,
      };
    }
  } catch {
    payload = fallback;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag,
      renotify: true,
      lang: "ca",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(targetUrl);
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
