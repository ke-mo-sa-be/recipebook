// Paachakam service worker. It makes the app installable, shows a friendly offline page when a page
// can't load, and (M4) displays push notifications. Nothing else is cached yet (offline recipes and
// cooking mode are M7), so every deploy is picked up on the next visit. Served with no-cache.
const CACHE = 'paachakam-shell-v2';
const OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE, '/favicon.svg']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});

// ── Push notifications (M4) ─────────────────────────────────────────────────
// The `push` function sends { title, body, url, tag, lang, unread }. Tapping opens that page.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // a malformed payload still shows a generic notification
  }
  const shown = self.registration.showNotification(data.title || 'Paachakam', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag,
    lang: data.lang,
    data: { url: data.url || '/notifications' },
  });
  const badge =
    typeof data.unread === 'number' && 'setAppBadge' in self.navigator
      ? self.navigator.setAppBadge(data.unread).catch(() => undefined)
      : undefined;
  event.waitUntil(Promise.all([shown, badge]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/notifications', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        return open.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
