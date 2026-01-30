// SVD MINDFUL Service Worker v3.5
// Purpose: Cache management with automatic updates

const CACHE_VERSION = 'mindful-v3.5';
const CACHE_FILES = [
    './',
    './index.html',
    './SVD_MINDFUL.html',
    './SVD_MINDFUL_Dashboard.html',
    './SVD_BRANDGUIDE_v.1.1.pdf',
    './logo/SVD_icon_square.png'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing version:', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => {
                console.log('[SW] Caching files');
                return cache.addAll(CACHE_FILES);
            })
            .then(() => {
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating version:', CACHE_VERSION);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_VERSION) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all clients immediately
            return self.clients.claim();
        }).then(() => {
            // Notify all clients about the update
            return self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'SW_UPDATED',
                        version: CACHE_VERSION
                    });
                });
            });
        })
    );
});

// Fetch event - Network First strategy for HTML, Cache First for assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // For HTML files, always try network first
    if (event.request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone and cache the fresh response
                    const responseClone = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if network fails
                    return caches.match(event.request);
                })
        );
    } else {
        // For other assets, use cache first
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    return response || fetch(event.request).then((fetchResponse) => {
                        const responseClone = fetchResponse.clone();
                        caches.open(CACHE_VERSION).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                        return fetchResponse;
                    });
                })
        );
    }
});

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
