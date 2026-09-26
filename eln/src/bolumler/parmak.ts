import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { MESAFE, sayi } from '../cekirdek/zaman'
import { baglanti } from '../ui/nabiz'
import { kimim } from '../cekirdek/posta'
import { $, azHareket, belir, satirSatir, titret } from './yardimci'

/**
 * PARMAK UÇLARI — ikimiz de sitedeyken birimiz buraya dokununca, parmağı öbürünün ekranında
 * tam aynı yerde parlar. Aynı yere aynı anda dokunursak iki ekranda birden kalp açılır.
 * (Yalnızca dokunuşlar gider, kaydırma değil: ntfy'nin günlük mesaj sınırını korumak için.)
 */
interface Iz {
  x: number
  y: number
  t: number
  kim: 'ben' | 'o'
}

const ESIK_MS = 1600 // "aynı anda" sayılan en uzun ara
const ESIK_UZ = 0.13 // "aynı yer" (tuval genişliğine oranla)

export function parmakHTML() {
  return /* html */ `
  <section id="parmak" class="bolum" data-bolum="" data-ad="Parmak Uçları">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Parmak uçları</p>
        <h2 class="baslik">Dokun. <em>Ben de hissedeyim.</em></h2>
        <p class="metin">İkimiz de buradayken bu cama dokunduğun an, parmağın benim ekranımda tam aynı yerde parlar; benimki de seninkinde. Aynı yere aynı anda dokunursak iki ekranda birden bir kalp açılır. ${sayi(MESAFE)} kilometre, bir parmak ucu kadar.</p>
      </div>
      <div class="parmak" data-dom>
        <div class="parmak-cam">
          <canvas class="parmak-tuval" aria-label="Dokunma camı"></canvas>
          <p class="parmak-durum" aria-live="polite"></p>
          <p class="parmak-degdi" hidden></p>
        </div>
        <p class="parmak-sayac"></p>
      </div>
    </div>
  </section>`
}

export function parmakKur() {
  const bolum = $('#parmak')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('.parmak', bolum)])
  const tuval = $<HTMLCanvasElement>('.parmak-tuval', bolum)
  const durum = $('.parmak-durum', bolum)
  const degdiEl = $('.parmak-degdi', bolum)
  const sayac = $('.parmak-sayac', bolum)
  const izler: Iz[] = []
  let calisiyor = false
  let px = 1
  let sonGonderim = 0
  let gonderilen = 0
  let degmeler = oku<number>('parmakDegme', 0)
  const karsi = () => baglanti.karsiAd || (kimim() === 'arda' ? ICERIK.sen.ad : ICERIK.ben.ad)

  const durumYaz = () => {
    durum.innerHTML = baglanti.cevrimici()
      ? `<i class="parmak-yesil"></i><b>${karsi()}</b> şu an burada. Dokun.`
      : `<b>${karsi()}</b> burada değil. Geldiğinde buraya dokunursan parmağın onun ekranında belirir.`
    bolum.classList.toggle('bagli', baglanti.cevrimici())
  }
  const sayacYaz = () => (sayac.textContent = degmeler ? `Parmak uçlarımız ${sayi(degmeler)} kez değdi.` : '')
  durumYaz()
  sayacYaz()
  window.addEventListener('nabiz-durum', durumYaz)

  const olc = () => {
    px = Math.min(window.devicePixelRatio || 1, 2)
    const r = tuval.getBoundingClientRect()
    tuval.width = Math.round(r.width * px)
    tuval.height = Math.round(r.height * px)
  }
  new ResizeObserver(olc).observe(tuval)

  const ciz = (ms: number) => {
    const c = tuval.getContext('2d')!
    const W = tuval.width / px
    const H = tuval.height / px
    c.setTransform(px, 0, 0, px, 0, 0)
    c.clearRect(0, 0, W, H)
    for (let i = izler.length - 1; i >= 0; i--) {
      const z = izler[i]
      const o = (ms - z.t) / 1800
      if (o >= 1) {
        izler.splice(i, 1)
        continue
      }
      const x = z.x * W
      const y = z.y * H
      const renk = z.kim === 'ben' ? '245,159,180' : '255,210,140'
      // parmak ucu: yumuşak ışık + genişleyen halka
      const g = c.createRadialGradient(x, y, 0, x, y, 46)
      g.addColorStop(0, `rgba(${renk},${0.75 * (1 - o)})`)
      g.addColorStop(1, `rgba(${renk},0)`)
      c.fillStyle = g
      c.beginPath()
      c.arc(x, y, 46, 0, Math.PI * 2)
      c.fill()
      for (const k of [0, 0.25]) {
        const oo = Math.min(1, o + k)
        c.strokeStyle = `rgba(${renk},${0.7 * (1 - oo)})`
        c.lineWidth = 2
        c.beginPath()
        c.arc(x, y, 14 + oo * 70, 0, Math.PI * 2)
        c.stroke()
      }
      if (z.kim === 'o' && o < 0.8) {
        c.fillStyle = `rgba(255,236,210,${1 - o / 0.8})`
        c.font = '600 12px "Plus Jakarta Sans Variable", sans-serif'
        c.textAlign = 'center'
        c.fillText(karsi(), x, y - 26)
      }
    }
    if (izler.length) requestAnimationFrame(ciz)
    else calisiyor = false
  }
  const iz = (z: Iz) => {
    izler.push(z)
    if (!calisiyor) {
      calisiyor = true
      requestAnimationFrame(ciz)
    }
    // aynı anda, aynı yere mi?
    const oteki = izler.find((a) => a.kim !== z.kim && Math.abs(a.t - z.t) < ESIK_MS)
    if (oteki) {
      const r = tuval.getBoundingClientRect()
      const uz = Math.hypot(oteki.x - z.x, ((oteki.y - z.y) * r.height) / r.width)
      if (uz < ESIK_UZ) degdi((oteki.x + z.x) / 2, (oteki.y + z.y) / 2)
    }
  }

  let sonDegme = 0
  const degdi = (x: number, y: number) => {
    if (performance.now() - sonDegme < 2500) return
    sonDegme = performance.now()
    degmeler++
    yaz('parmakDegme', degmeler)
    sayacYaz()
    degdiEl.hidden = false
    degdiEl.style.left = `${x * 100}%`
    degdiEl.style.top = `${y * 100}%`
    degdiEl.innerHTML = `<span aria-hidden="true">♥</span><small>Değdi. ${sayi(MESAFE)} km’den.</small>`
    degdiEl.classList.remove('oyna')
    void degdiEl.offsetWidth
    degdiEl.classList.add('oyna')
    titret([40, 60, 40, 60, 120])
    ses.kalp(1)
    window.dispatchEvent(new CustomEvent('kutla', { detail: 30 }))
    if (degmeler === 1) window.setTimeout(() => sirBul('parmak'), 1500)
  }

  tuval.addEventListener('pointerdown', (e) => {
    const r = tuval.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    iz({ x, y, t: performance.now(), kim: 'ben' })
    ses.nota(84 + Math.round((1 - y) * 7), 0.03)
    if (!baglanti.cevrimici()) return
    // en fazla saniyede ~3 dokunuş ve oturum başına 120: günlük mesaj sınırı için
    const simdi = performance.now()
    if (simdi - sonGonderim < 300 || gonderilen >= 120) return
    sonGonderim = simdi
    gonderilen++
    void baglanti.gonder({ tip: 'dokun', x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 })
  })

  window.addEventListener('dokunus-gelen', (e) => {
    const { x, y } = (e as CustomEvent<{ x: unknown; y: unknown }>).detail
    if (typeof x !== 'number' || typeof y !== 'number' || x < 0 || x > 1 || y < 0 || y > 1) return
    iz({ x, y, t: performance.now(), kim: 'o' })
    if (!azHareket) titret(25)
    ses.nota(79, 0.035)
  })
}
