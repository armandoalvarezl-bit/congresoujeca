const CACHE_NAME = "ujeca-congreso-v1";

const APP_SHELL = [
  "./",
  "index.html",
  "home.html",
  "app.html",
  "form.html",
  "consulta-deuda.html",
  "pasarelapago.html",
  "Basedatos.html",
  "live.html",
  "contacto.html",
  "api-config.js",
  "style1.css",
  "responsive-fixes.css",
  "pwa.js",
  "manifest.json",
  "img/logo.png",
  "img/banner.jpg",
  "img/afiche-oficial-congreso-2026.jpeg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if(request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("app.html")))
  );
});
