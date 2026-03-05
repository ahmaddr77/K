// MED26 Service Worker - Cache & Offline Capability
const CACHE_NAME = 'med26-pwa-cache-v1';

// الملفات التي يجب تحميلها فور التثبيت لضمان عمل واجهة التطبيق بدون نت
const FILES_TO_CACHE = [
  './index.html',
  './manifest.json',
  // ملاحظة: الأيقونات والسكريبتات الخارجية سيتم تخزينها ديناميكياً عند طلبها لأول مرة
];

// 1. Install Event: Cache Shell
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Cleanup old caches
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Serve from cache first, then network (Cache First Strategy for static assets)
self.addEventListener('fetch', (evt) => {
  
  // ignore Supabase calls logic handled inside app if offline, or network if online
  // BUT caching supabase.js script library itself is essential
  
  const url = new URL(evt.request.url);

  // Strategy for internal files & fonts & scripts (Cache falling back to Network)
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      // If found in cache, return it
      if (response) {
        return response;
      }
      
      // Else fetch from network
      return fetch(evt.request).then((response) => {
        // Check if we received a valid response
        if(!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors' && response.type !== 'opaque') {
          return response;
        }

        // Check if request is for static assets (fonts, images, scripts) we want to keep
        if (evt.request.url.startsWith('http') && 
           (evt.request.url.includes('.js') || 
            evt.request.url.includes('.css') || 
            evt.request.url.includes('fonts') ||
            evt.request.url.includes('imgur') ||
            evt.request.url === self.location.origin)) {
            
            // Clone and Cache it for next time
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(evt.request, responseToCache);
            });
        }

        return response;
      });
    })
  );
});
