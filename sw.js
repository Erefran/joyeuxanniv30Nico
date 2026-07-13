const CACHE = 'bln30-v5';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './audio/sisyphos-teaser.mp3'];
// Ces fichiers changent souvent pendant le développement — toujours vérifier la dernière
// version en ligne avant de servir le cache (sinon un appareil qui a déjà visité le site
// reste bloqué sur l'ancien app.js/data.js indéfiniment, même après un nouveau déploiement).
const NETWORK_FIRST = new Set(['index.html', 'app.js', 'data.js']);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // laisse passer Google Maps/Places tel quel

  const isNetworkFirst = e.request.mode === 'navigate' || NETWORK_FIRST.has(url.pathname.split('/').pop());
  if (isNetworkFirst) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      // Les réponses 206 (Partial Content, typiques des fichiers audio) ne peuvent
      // pas être mises en cache par l'API Cache — on les sert sans les stocker.
      if (res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
