// service-worker.js (Final Version)

const CACHE_NAME = 'n5-dictionary-cache-v2'; // Cache version updated to trigger refresh
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
  '/html.png',
  '/css.png',
  '/js.png',
  '/netlify.png',
  '/mongodb.png'
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

  // --- Strategy: Cache-First for the app shell (HTML, CSS, JS, etc.) ---
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Special handling for lesson pages with URL parameters
        if (requestUrl.origin === self.location.origin && requestUrl.pathname === '/lesson') {
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