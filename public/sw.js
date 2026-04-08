// Weka Soko Service Worker
const CACHE = 'weka-soko-v1';
const PRECACHE = ['/', '/manifest.json', '/icon.svg'];

// ── Install: precache shell ──────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: drop old caches, claim clients ─────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first, fall back to cache for navigation ──────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Skip cross-origin requests (API, Cloudinary, etc.)
  if (!e.request.url.startsWith(self.location.origin)) return;

  const isNavigation = e.request.mode === 'navigate';
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache fresh navigations
        if (isNavigation && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match('/')))
  );
});

// ── Push: show notification ───────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'Weka Soko', body: 'You have a new notification.' };
  try { data = { ...data, ...e.data.json() }; } catch {}

  const options = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'weka-soko-' + (data.type || 'general'),
    renotify: true,
    data: data.data || {},
    actions: data.type === 'listing_match'
      ? [{ action: 'view', title: 'View Request' }]
      : data.type === 'chat_message'
      ? [{ action: 'reply', title: 'Open Chat' }]
      : [],
    vibrate: [150, 50, 150],
  };

  e.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification click: focus or open app ────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const notifData = e.notification.data || {};
  let targetUrl = '/';
  if (notifData.listing_id) targetUrl = `/listings/${notifData.listing_id}`;
  else if (notifData.request_id) targetUrl = `/?tab=requests`;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.startsWith(self.location.origin) && 'focus' in c);
      if (existing) return existing.focus().then(c => c.navigate(targetUrl));
      return clients.openWindow(targetUrl);
    })
  );
});
