// CarbonCue service worker to cache assets for offline access
const CACHE_NAME = 'carbon-cue-dashboard-v1';
const urlsToCache = [
  '/',
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'sample_data.csv',
  'images/icon-192x192.png',
  'images/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      // Clone the request as it is a stream
      const fetchRequest = event.request.clone();
      return fetch(fetchRequest).then(networkResponse => {
        // If invalid response, just pass it through
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        // Clone the response as well
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});