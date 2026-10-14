const CACHE = 'dental-master-v1';
const ASSETS = [
  './', 'index.html', 'game.js', 'manifest.webmanifest',
  'assets/bg_clinic.jpg', 'assets/patient1.jpg', 'assets/patient2.jpg',
  'assets/patient3.jpg', 'assets/logo.jpg',
  'icons/icon-192.png', 'icons/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
