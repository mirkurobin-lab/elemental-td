// Elemental TD — offline-capable PWA service worker.
// Strategy: precache the app shell, then cache-first with network fallback for everything else
// (so the game launches instantly and keeps working with no connection after the first load).
const CACHE = "eltd-v27";
const SHELL = [
  "./index.html",
  "./game.js",
  "./strings.js",
  "./logic.js",
  "./manifest.json",
  "./assets/kingdom.png",
  "./assets/bg.png",
  "./assets/favicon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // cache same-origin successful responses for next time (assets, etc.)
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match("./index.html")); // offline fallback
    })
  );
});
