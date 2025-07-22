// service-worker.js (Final Version)

const CACHE_NAME = 'n5-dictionary-cache-v7'; 
const urlsToCache = [
  '/',
  '/index.html',
  '/lesson.html',
  '/study.html',
  '/developer.html',
  '/style.css',
  '/config.js',
  '/dictionary.js',
  '/script.js',
  '/study-session.js',
  '/icon.png',
  '/raju.png',
  '/popup-sound.mp3',
];

// Install the service worker and cache files
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching files for offline use.');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event listener
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // --- Strategy 1: Network-First for our data file ---
  if (requestUrl.pathname === '/data/full_data.json') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return fetch(event.request)
          .then(networkResponse => {
            // Network successful: update cache and return fresh response
            console.log(`Service Worker: Fetched ${requestUrl.pathname} from network and updated cache.`);
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          })
          .catch(() => {
            // Network failed (offline): serve from cache as a fallback
            console.log(`Service Worker: Network failed for ${requestUrl.pathname}. Serving from cache.`);
            return cache.match(event.request);
          });
      })
    );
    return; // Stop here for this strategy
  }

  // --- Strategy 2: Cache-First for the app shell (HTML, CSS, JS, etc.) ---
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Special handling for lesson pages with URL parameters
        if (requestUrl.origin === self.location.origin && requestUrl.pathname === '/lesson.html') {
          return caches.match('/lesson.html');
        }

        return fetch(event.request);
      })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
// Clean up old caches and take control
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`Service Worker: Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});