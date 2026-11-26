// Service worker: permite usar la app sin conexión.
// Estrategia: con internet descarga siempre la versión más reciente
// (y la guarda); sin internet usa la copia guardada.
const CACHE = 'mi-actividad-v14';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './img/andar.png',
  './img/fondo.png',
  './img/dominadas.png',
  './img/sentadillas.png',
  './img/flexiones.png',
  './img/correr.png',
  './img/abdominales.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(async (res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        }
        // La web falla (404, repositorio privado…): usar la copia guardada si existe
        return (await caches.match(e.request, { ignoreSearch: true })) || res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
