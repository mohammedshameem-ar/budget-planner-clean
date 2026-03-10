// BudgetWise Service Worker
// Placed in /public so it's served as-is in both dev and prod,
// bypassing the Vite PWA dev-stub that has no push handler.

const CACHE_NAME = 'budgetwise-v1';

self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activated. Claiming clients...');
    event.waitUntil(clients.claim());
});

// ─── Push Notification Handler ───────────────────────────────────────────────
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);

    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { body: event.data.text() };
        }
    }

    const title = data.title || 'BudgetWise';
    const options = {
        body: data.body || 'You have a new notification.',
        icon: data.icon || '/logo.svg',
        badge: '/logo.svg',
        tag: data.tag || 'budgetwise-notification',
        data: { url: data.url || '/' },
        requireInteraction: true,
        renotify: true,
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ─── Notification Click Handler ───────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.notification.tag);
    event.notification.close();

    const targetUrl = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// ─── Fetch Handler ────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Do NOT intercept cross-origin requests (e.g. calls to localhost:5000 backend)
    // Let them fail naturally so the app can show its own error message
    if (url.origin !== location.origin) {
        return;
    }

    // For same-origin navigation requests, just fetch normally
    event.respondWith(fetch(event.request));
});
