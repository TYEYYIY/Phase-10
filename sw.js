/* ============================================================
   TYEYYIY Phase 10 — Service Worker (آمن — لا يحذف البيانات)
   ============================================================ */
var CACHE_NAME = 'p10-v21-cache'; // ⚠️ غيّر هذا الرقم كل إصدار!
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js'
];

/* التثبيت — تخزين الملفات الأساسية */
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS.map(function(url) {
        return new Request(url, { cache: 'reload' });
      })).catch(function(err) {
        console.warn('[SW] addAll partial fail:', err);
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

/* التنشيط — حذف الكاشات القديمة فقط (لا يمس localStorage) */
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) {
              console.info('[SW] Deleting old cache:', k);
              return caches.delete(k);
            })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* الجلب — Network First للـ HTML، Cache First للباقي */
self.addEventListener('fetch', function(event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // نفس الأصل فقط
  if (url.origin !== location.origin) return;

  // تجاهل طلبات الـ peerjs أو أي CDN
  if (url.pathname.indexOf('peerjs') >= 0) return;

  // HTML — جلب من الشبكة أولاً
  if (req.headers.get('accept') && req.headers.get('accept').indexOf('text/html') >= 0) {
    event.respondWith(
      fetch(req).then(function(res) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(req, copy); });
        return res;
      }).catch(function() {
        return caches.match(req).then(function(r) { return r || caches.match('./index.html'); });
      })
    );
    return;
  }

  // الملفات الثابتة — Cache First
  event.respondWith(
    caches.match(req).then(function(cached) {
      if (cached) return cached;
      return fetch(req).then(function(res) {
        if (!res || res.status !== 200) return res;
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(req, copy); });
        return res;
      }).catch(function() {
        return caches.match('./index.html');
      });
    })
  );
});

/* رسائل من الصفحة — تخطي الانتظار */
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});