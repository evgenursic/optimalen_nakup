const STATIC_CACHE = "optimalen-nakup-static-v1";
const PRECACHE_PATHS = ["/icon.svg", "/manifest.webmanifest"];
const MAX_RUNTIME_ENTRIES = 80;

function isStaticAsset(request) {
  if (request.method !== "GET") {
    return false;
  }
  const url = new URL(request.url);
  return (
    url.origin === self.location.origin &&
    url.search === "" &&
    (url.pathname.startsWith("/_next/static/") || PRECACHE_PATHS.includes(url.pathname))
  );
}

async function trimCache(cache) {
  const keys = await cache.keys();
  await Promise.all(
    keys.slice(0, Math.max(0, keys.length - MAX_RUNTIME_ENTRIES)).map((key) => cache.delete(key)),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_PATHS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("optimalen-nakup-static-") && name !== STATIC_CACHE)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (!isStaticAsset(event.request)) {
    return;
  }
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) {
        return cached;
      }
      const response = await fetch(event.request);
      if (response.ok && response.type === "basic") {
        await cache.put(event.request, response.clone());
        await trimCache(cache);
      }
      return response;
    }),
  );
});
