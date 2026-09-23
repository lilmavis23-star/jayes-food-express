'use strict';
/* Jaye's Food Express — minimal service worker.
   Caches the app shell for fast repeat loads. Data always comes from
   Supabase fresh; nothing dynamic is cached. */

var CACHE = 'jayes-v1';
var SHELL = [
  './',
  './index.html',
  './styles.css',
  './supabase.js',
  './app-core.js',
  './app-customer.js',
  './app-auth.js',
  './vendor-app.js',
  './app-init.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (url) {
        return c.add(url).catch(function () { /* skip individual failures */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = req.url;
  /* Never cache Supabase or WhatsApp — always live */
  if (url.indexOf('supabase.co') !== -1 ||
      url.indexOf('wa.me') !== -1 ||
      url.indexOf('jsdelivr.net') !== -1) return;
  /* Only handle same-origin for caching */
  if (url.indexOf(self.location.origin) !== 0) return;

  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});