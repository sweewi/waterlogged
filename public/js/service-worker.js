/**
 * WaterLogged Service Worker
 * Enables offline functionality and faster load times through caching
 */

// Cache name with version - update version to force cache refresh
const CACHE_NAME = 'waterlogged-cache-v1';

// Resources to cache on install
const RESOURCES_TO_CACHE = [
  '/',
  '/index.html',
  '/about.html',
  '/photos.html',
  '/explore.html',
  '/css/styles.css',
  '/js/main.js',
  '/js/weather.js',
  '/js/rain-visualization.js',
  '/js/rain-comparison.js',
  '/js/thingspeak-api.js',
  '/js/explore.js',
  '/images/charlie.png',
  '/images/annie.jpg',
  '/images/peyton.jpg',
  '/images/nava.jpg',
  '/images/will.png',
  '/images/map-placeholder.png',
  '/images/fallback.png'
];

// Install event - cache critical assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(RESOURCES_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when possible, fall back to network
self.addEventListener('fetch', event => {
  // For API calls, try network first, then cache
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('api.thingspeak.com') || 
      event.request.url.includes('api.open-meteo.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response
          const responseClone = response.clone();
          
          // Open cache and store the new response
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
          
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request);
        })
    );
  } 
  // For other resources, try cache first, then network
  else {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Return cached response if found
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Otherwise fetch from network
          return fetch(event.request)
            .then(response => {
              // Return the response if it's a bad response (4xx, 5xx)
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clone the response
              const responseClone = response.clone();
              
              // Open cache and store the new response
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseClone);
                });
              
              return response;
            });
        })
    );
  }
});

// Handle offline fallbacks
self.addEventListener('fetch', event => {
  // If the main resource fails, show offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
  }
});