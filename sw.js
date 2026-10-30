self.addEventListener('install', (e) => {
  console.log('Service Worker instalado con éxito');
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
