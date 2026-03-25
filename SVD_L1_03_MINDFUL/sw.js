// SVD MINDFUL Service Worker v4.0
// Purpose: Cache management with automatic updates + Push Notifications

const CACHE_VERSION = 'mindful-v4.0';
const CACHE_FILES = [
    './',
    './index.html',
    './SVD_MINDFUL.html',
    './SVD_MINDFUL_Dashboard.html',
    './SVD_BRANDGUIDE_v.1.1.pdf',
    './logo/SVD_icon_square.png',
    './firebase-messaging-sw.js'
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

    // Bypass POST requests and API calls - don't cache them
    if (event.request.method !== 'GET' || url.hostname.includes('script.google.com') || url.hostname.includes('googleapis.com')) {
        return;
    }

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

// ============ Push Notification Handlers ============

// Handle incoming push notifications
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');
    
    let title = 'MINDFUL';
    let body = 'チェックアウトを忘れていませんか？🔔';
    
    if (event.data) {
        try {
            const data = event.data.json();
            console.log('[SW] Push data:', JSON.stringify(data));
            // FCM HTTP v1 APIのペイロード構造に対応
            title = data.notification?.title || data.title || title;
            body = data.notification?.body || data.body || body;
        } catch (e) {
            console.log('[SW] Push data as text:', event.data.text());
            body = event.data.text() || body;
        }
    }
    
    console.log('[SW] Showing notification:', title, body);
    const options = {
        body: body,
        icon: './logo/SVD_icon_square.png',
        badge: './logo/SVD_icon_square.png',
        tag: 'mindful-notification-' + Date.now(),
        renotify: true,
        requireInteraction: true,
        data: {
            url: './index.html'
        },
        actions: [
            { action: 'open', title: 'MINDFULを開く' },
            { action: 'dismiss', title: '閉じる' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
            .then(() => console.log('[SW] Notification shown successfully'))
            .catch(err => console.error('[SW] Notification show error:', err))
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);
    event.notification.close();
    
    if (event.action === 'dismiss') return;
    
    const urlToOpen = event.notification.data?.url || './index.html';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('MINDFUL') || client.url.includes('index.html')) {
                    return client.focus();
                }
            }
            return clients.openWindow(urlToOpen);
        })
    );
});
