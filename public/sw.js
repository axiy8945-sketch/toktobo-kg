// ТОКТОБО KG — жөнөкөй service worker.
// Барактар: адегенде тармак, тармак жок болсо кэш. Статика: кэштен.
// Китеп файлдары (signed URL) жана API эч качан кэштелбейт.
const CACHE = "toktobo-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/books"])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    })));
    return;
  }
  if (req.mode === "navigate") {
    // Жеке барактар (китепкана, заказдар) кэштелбейт — бөлүшүлгөн түзмөктө коопсуз болсун.
    e.respondWith(fetch(req).catch(() => caches.match(url.pathname === "/books" ? "/books" : "/")));
  }
});
