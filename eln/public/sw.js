/* Önce Sana Doğar — çevrimdışı çalışsın, ana ekrandan bir uygulama gibi açılsın diye.
   · Sayfanın kendisi: önce ağ (Arda bir şey değiştirirse hemen görünsün), ağ yoksa önbellek.
   · assets/ altındaki dosyalar (adları içerikle değişir): önce önbellek.
   · Diğer her şey (ikonlar, ses, fotoğraf): önce ağ, yoksa önbellek.
   · Başka sitelere giden istekler (hava durumu, ntfy) hiç önbelleğe alınmaz. */
const SURUM = 'osd-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((adlar) => Promise.all(adlar.filter((a) => a !== SURUM).map((a) => caches.delete(a))))
      .then(() => self.clients.claim()),
  )
})

const sakla = (istek, yanit) => {
  // yalnızca tam (200) yanıtlar: ses dosyalarının parçalı (206) yanıtları önbelleğe giremez
  if (yanit && yanit.status === 200 && yanit.type === 'basic') {
    const kopya = yanit.clone()
    caches.open(SURUM).then((c) => c.put(istek, kopya))
  }
  return yanit
}

self.addEventListener('fetch', (e) => {
  const istek = e.request
  if (istek.method !== 'GET') return
  const adres = new URL(istek.url)
  if (adres.origin !== self.location.origin) return

  if (istek.mode === 'navigate') {
    // ?ben=, ?tarih= gibi eklerden bağımsız tek bir sayfa kopyası tutulur
    const sayfa = new URL('./', self.registration.scope).href
    e.respondWith(
      fetch(istek)
        .then((y) => sakla(sayfa, y))
        .catch(() => caches.match(sayfa, { ignoreSearch: true })),
    )
    return
  }

  if (adres.pathname.includes('/assets/')) {
    e.respondWith(caches.match(istek).then((m) => m || fetch(istek).then((y) => sakla(istek, y))))
    return
  }

  e.respondWith(
    fetch(istek)
      .then((y) => sakla(istek, y))
      .catch(() => caches.match(istek)),
  )
})
