const CACHE_VERSION = "freela-app-v5";
const RUNTIME_CACHE = "freela-runtime-v4";

const APP_SHELL = [
  "/",
  "/index.html",
  "/calculadora.js",
  "/compliance.js",
  "/benchmarking.js",
  "/advanced-pricing.js",
  "/risk-audit.js",
  "/telemetry.js",
  "/negotiation-v21.js",
  "/hardening-v21.js",
  "/privacidade",
  "/privacidade.html",
  "/privacidade/index.html",
  "/manifest.webmanifest",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      await Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, network.clone());
          return network;
        } catch {
          const cached = await caches.match(req);
          return cached || caches.match("/offline.html");
        }
      })()
    );
    return;
  }

  if (req.method !== "GET") return;

  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        try {
          const network = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, network.clone());
          return network;
        } catch {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const network = await fetch(req);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, network.clone());
        return network;
      } catch {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })()
  );
});
