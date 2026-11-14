// Service worker di Punto e Virgola: app disponibile anche offline.
const VERSIONE = 'pv-v1.7.4';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/main.js', 'js/nav.js', 'js/musica.js', 'js/state.js', 'js/github.js', 'js/data.js', 'js/speech.js', 'js/tts.js',
  'js/match.js', 'js/arasaac.js', 'js/ui.js', 'js/punteggi.js',
  'js/screens/setup.js', 'js/screens/home.js', 'js/screens/gioco.js', 'js/screens/componi.js',
  'js/screens/dillo.js', 'js/screens/racconta.js', 'js/screens/descrivi.js',
  'js/screens/risultato.js', 'js/screens/personaggio.js', 'js/screens/genitori.js',
  'js/screens/editor.js', 'js/screens/suoni.js', 'js/screens/frasi2.js', 'js/screens/riassunto.js', 'js/screens/frasi3.js', 'js/screens/giorni.js', 'js/screens/report.js', 'js/sorprese.js',
  'data/scene-iniziali.json',
  'img/logo-completo.png', 'img/wordmark.png', 'img/punto.png', 'img/virgola.png', 'img/duo.png',
  'img/icon-192.png', 'img/icon-512.png', 'img/favicon.png',
  'vendor/qrcode.js', 'vendor/jsQR.js', 'vendor/vosk.js',
  'vendor/fonts/fredoka-latin-500-normal.woff2', 'vendor/fonts/fredoka-latin-600-normal.woff2',
  'vendor/fonts/fredoka-latin-700-normal.woff2', 'vendor/fonts/andika-latin-400-normal.woff2',
  'vendor/fonts/andika-latin-700-normal.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k.startsWith('pv-v') && k !== VERSIONE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // GitHub: sempre dalla rete, mai in cache (dati privati).
  if (url.hostname === 'api.github.com') return;

  // Pittogrammi ARASAAC: prima la cache.
  if (url.hostname === 'static.arasaac.org') {
    e.respondWith(caches.open('pv-pittogrammi').then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
    return;
  }
  // Ricerche ARASAAC: rete, con ripiego sulla cache.
  if (url.hostname === 'api.arasaac.org') {
    e.respondWith(caches.open('pv-pittogrammi').then(async (c) => {
      try {
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await c.match(req);
        if (hit) return hit;
        throw err;
      }
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // Il modello vocale lo gestisce l'app (cache dedicata).
  if (url.pathname.endsWith('.tar.gz')) return;

  // File dell'app: cache subito, aggiornamento in background.
  e.respondWith(caches.open(VERSIONE).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    const rete = fetch(req).then((res) => {
      if (res.ok) c.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || rete;
  }));
});
