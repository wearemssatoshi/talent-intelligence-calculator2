// Firebase Messaging Service Worker for SVD MINDFUL
// Handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyBpmjdOpSsgDOSf3OD5RnptsBgQkNjYaDM",
  authDomain: "svd-mindful.firebaseapp.com",
  projectId: "svd-mindful",
  storageBucket: "svd-mindful.firebasestorage.app",
  messagingSenderId: "100333818268",
  appId: "1:100333818268:web:6f2720ab1313968a737859"
});

const messaging = firebase.messaging();

// Handle background messages (when the app is not in focus)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'MINDFUL';
  const notificationOptions = {
    body: payload.notification?.body || 'チェックアウトを忘れていませんか？🔔',
    icon: './logo/SVD_icon_square.png',
    badge: './logo/SVD_icon_square.png',
    tag: 'mindful-checkout-reminder',
    renotify: true,
    requireInteraction: true,
    data: {
      url: payload.data?.url || './index.html'
    },
    actions: [
      {
        action: 'open',
        title: 'MINDFULを開く'
      },
      {
        action: 'dismiss',
        title: '閉じる'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') return;

  // Open the MINDFUL app
  const urlToOpen = event.notification.data?.url || './index.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If MINDFUL is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('MINDFUL') || client.url.includes('index.html')) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      return clients.openWindow(urlToOpen);
    })
  );
});
