const CACHE_NAME = 'jobbeacon-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/css/style.css',
  '/assets/css/dashboard.css',
  '/assets/js/app.js',
  '/assets/js/jobs.js',
  '/assets/js/auth.js',
  '/assets/js/dashboard.js',
  '/assets/icon.svg',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('SW Install cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Skip cross-origin requests, like Supabase APIs or Google Fonts
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Network first strategy for dynamic content, fallback to cache
      return fetch(event.request).then(response => {
        // Cache the fresh response if it's a valid response
        if(response && response.status === 200 && response.type === 'basic') {
           const responseToCache = response.clone();
           caches.open(CACHE_NAME).then(cache => {
             cache.put(event.request, responseToCache);
           });
        }
        return response;
      }).catch(() => {
        // Fallback to cache if network fails
        return cachedResponse;
      });
    })
  );
});
