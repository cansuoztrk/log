import { ICERIK } from '../icerik'
import { ses } from '../cekirdek/ses'
import { AYLAR, type Anlik, sayi } from '../cekirdek/zaman'
import { $, $$, azHareket, belir, gsap, satirSatir, ScrollTrigger, titret } from './yardimci'

const { sevgili } = ICERIK

/** Sevgili olduğumuzdan beri kaç ay dönümü yaşandı (her ayın 21'i) */
function ayDonumleri(z: Anlik) {
  const [y, m, d] = z.bugun.split('-').map(Number)
  const [sy, sm, sd] = sevgili.split('-').map(Number)
  return Math.max(0, (y - sy) * 12 + (m - sm) - (d < sd ? 1 : 0))
}

function ayDonumuTarihi(k: number) {
  const [sy, sm, sd] = sevgili.split('-').map(Number)
  const t = new Date(Date.UTC(sy, sm - 1 + k, sd))
  return `${t.getUTCDate()} ${AYLAR[t.getUTCMonth()]} ${t.getUTCFullYear()}`
}

/* ─── Bir pembe zambak (Stargazer) — SVG ─── */
const TACYAPRAGI = (L: number) => {
  const w = L * 0.3
  return `M0,0 C${w},${-L * 0.22} ${w * 0.95},${-L * 0.72} 0,${-L} C${-w * 0.95},${-L * 0.72} ${-w},${-L * 0.22} 0,0Z`
}

function zambak(x: number, y: number, L: number, don: number, i: number) {
  const yapraklar = Array.from({ length: 6 }, (_, k) => {
    const ic = k % 2 === 1
    const uz = ic ? L * 0.92 : L
    const benek = Array.from({ length: 5 }, (_, b) => `<circle cx="${(b % 2 ? 1 : -1) * uz * 0.07}" cy="${-uz * (0.18 + b * 0.06)}" r="${1.1 + (b % 3) * 0.3}" fill="#a8124c" opacity=".75"/>`).join('')
    return `<g transform="rotate(${k * 60 + (ic ? 0 : 0)})"><path d="${TACYAPRAGI(uz)}" fill="url(#zy)" stroke="#f9c6d6" stroke-width=".6"/><path d="M0,-3 L0,${-uz * 0.82}" stroke="#fff" stroke-opacity=".55" stroke-width=".9"/>${benek}</g>`
  }).join('')
  const ercikler = Array.from({ length: 6 }, (_, k) => {
    const a = ((k * 60 + 30) * Math.PI) / 180
    const r = L * 0.55
    return `<line x1="0" y1="0" x2="${Math.sin(a) * r}" y2="${-Math.cos(a) * r}" stroke="#d9ecc0" stroke-width="1"/><ellipse cx="${Math.sin(a) * r}" cy="${-Math.cos(a) * r}" rx="1.6" ry="3.4" transform="rotate(${k * 60 + 30} ${Math.sin(a) * r} ${-Math.cos(a) * r})" fill="#b3521c"/>`
  }).join('')
  return `<g class="zambak" data-i="${i}" transform="translate(${x} ${y}) rotate(${don})" style="cursor:pointer">
    <g class="z-tac">${yapraklar}</g>
    <g class="z-erkek">${ercikler}<circle r="2.4" fill="#e8f3cf"/></g>
  </g>`
}

function tomurcuk(x: number, y: number, L: number, don: number, i: number) {
  return `<g class="zambak tomurcuk" data-i="${i}" transform="translate(${x} ${y}) rotate(${don})" style="cursor:pointer">
    <path d="M0,0 C${L * 0.22},${-L * 0.3} ${L * 0.16},${-L * 0.8} 0,${-L * 1.05} C${-L * 0.16},${-L * 0.8} ${-L * 0.22},${-L * 0.3} 0,0Z" fill="url(#zt)"/>
    <path d="M0,-4 L0,${-L}" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>
  </g>`
}

export function zambakHTML(z: Anlik) {
  const n = ayDonumleri(z)
  const gorunen = Math.min(n, 24)
  const toplam = gorunen + 1 // + bir sonraki ayın tomurcuğu
  const W = 400
  const ciceklerSVG: string[] = []
  const saplar: string[] = []
  const bas = { x: 200, y: 318 }
  const konumlar = Array.from({ length: toplam }, (_, i) => {
    const t = toplam === 1 ? 0.5 : i / (toplam - 1)
    const aci = ((-50 + 100 * t) * Math.PI) / 180
    const sira = i % 2
    const r = (toplam > 9 ? 190 : 158) - sira * (toplam > 5 ? 48 : 26) + Math.sin(i * 2.3) * 6
    return { x: 200 + Math.sin(aci) * r * 0.98, y: bas.y - Math.cos(aci) * r, sira, aci }
  })
  // önce arka sıra (daha uzaktakiler), sonra öndekiler
  const sirali = konumlar.map((k, i) => ({ ...k, i })).sort((a, b) => b.sira - a.sira)
  for (const k of sirali) {
    const kx = bas.x + (k.x - bas.x) * 0.12
    saplar.push(`<path d="M${kx},${bas.y + 110} Q${kx},${bas.y - 10} ${k.x},${k.y + 6}" stroke="url(#sap)" stroke-width="${k.sira ? 2.2 : 2.8}" fill="none"/>`)
    const L = (k.sira ? 44 : 52) * (toplam > 9 ? 0.82 : 1)
    const don = (k.aci * 180) / Math.PI * 0.35
    ciceklerSVG.push(k.i === toplam - 1 ? tomurcuk(k.x, k.y, L * 0.9, don, k.i) : zambak(k.x, k.y, L, don, k.i))
  }
  const yaprak = (x: number, y: number, a: number, s: number) =>
    `<path transform="translate(${x} ${y}) rotate(${a}) scale(${s})" d="M0,0 C10,-20 12,-55 0,-80 C-8,-55 -8,-20 0,0Z" fill="url(#yp)"/>`
  return /* html */ `
  <section id="zambak" class="bolum" data-bolum="" data-ad="Her Ay Bir Zambak">
    <div class="icerik-sutun zambak-izgara">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Her ay bir zambak</p>
        <h2 class="baslik">Pembe <em>zambaklar</em>.</h2>
        <p class="metin">Zambağı seviyorsun, pembeyi de. Sevgili olduğumuz her ay bu vazoya bir zambak ekleniyor. Şu an <strong>${sayi(n)}</strong> tane var; ${
          n + 1
        }. zambak <strong>${ayDonumuTarihi(n + 1).replace(/ \d{4}$/, '')}</strong>’de açacak.</p>
        <p class="satir italik">Bir gün bu vazoyu gerçek zambaklarla dolduracağım. Kokusu merdivenlere kadar gelecek; <em>söz</em>.</p>
      </div>
      <div class="vazo-sahne" data-dom>
        <svg class="vazo" viewBox="0 0 ${W} 460" role="img" aria-label="${sayi(n)} pembe zambaklı bir vazo">
          <defs>
            <linearGradient id="zy" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stop-color="#fff6f8"/><stop offset=".22" stop-color="#f7a9c3"/><stop offset=".6" stop-color="#e5487f"/><stop offset="1" stop-color="#f8bdd1"/>
            </linearGradient>
            <linearGradient id="zt" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#7fae5a"/><stop offset=".55" stop-color="#c7d99a"/><stop offset="1" stop-color="#f4a6c0"/></linearGradient>
            <linearGradient id="sap" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5d8a47" stop-opacity=".7"/><stop offset="1" stop-color="#7fae5a"/></linearGradient>
            <linearGradient id="yp" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3f6b35"/><stop offset="1" stop-color="#8dbb62"/></linearGradient>
            <linearGradient id="cam" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".3" stop-color="#fff" stop-opacity=".05"/><stop offset=".8" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#fff" stop-opacity=".18"/></linearGradient>
            <radialGradient id="vazoIsik" cx=".5" cy=".6" r=".5"><stop offset="0" stop-color="#f59fb4" stop-opacity=".25"/><stop offset="1" stop-color="#f59fb4" stop-opacity="0"/></radialGradient>
          </defs>
          <ellipse cx="200" cy="230" rx="200" ry="230" fill="url(#vazoIsik)"/>
          <g class="saplar">${saplar.join('')}</g>
          ${yaprak(192, 322, -32, 1)}${yaprak(208, 326, 28, 0.9)}${yaprak(200, 330, -8, 0.75)}
          <g class="cicekler">${ciceklerSVG.join('')}</g>
          <path d="M160,318 C150,360 146,410 156,440 Q200,452 244,440 C254,410 250,360 240,318 Q200,326 160,318Z" fill="url(#cam)" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>
          <path d="M155,360 C152,400 150,425 157,440 Q200,451 243,440 C250,425 248,400 245,360 Q200,368 155,360Z" fill="#9fc5ff" fill-opacity=".1"/>
          <ellipse cx="200" cy="318" rx="40" ry="5" fill="none" stroke="#fff" stroke-opacity=".45"/>
          <ellipse cx="200" cy="446" rx="70" ry="6" fill="#000" opacity=".35"/>
        </svg>
        <div class="zambak-kart" role="status"></div>
      </div>
    </div>
  </section>`
}

export function zambakKur(z: Anlik) {
  const bolum = document.querySelector<HTMLElement>('#zambak')
  if (!bolum) return
  satirSatir($('.baslik', bolum))
  belir(Array.from(bolum.querySelectorAll('.bolum-bas > p:not(.etiket)')))
  const n = ayDonumleri(z)
  const cicekler = $$<SVGGElement>('.zambak', bolum)
  const kart = $('.zambak-kart', bolum)

  // açılış: tomurcuktan çiçeğe
  if (!azHareket) {
    const taclar = cicekler.map((c) => c.querySelector('.z-tac, path')).filter(Boolean) as SVGElement[]
    gsap.set(taclar, { transformOrigin: '0px 0px', scale: 0.15, rotate: -40, opacity: 0 })
    gsap.set($$('.z-erkek', bolum), { transformOrigin: '0px 0px', scale: 0, opacity: 0 })
    ScrollTrigger.create({
      trigger: $('.vazo', bolum),
      start: 'top 75%',
      once: true,
      onEnter: () => {
        gsap.to(taclar, { scale: 1, rotate: 0, opacity: 1, duration: 1.8, ease: 'expo.out', stagger: 0.18 })
        gsap.to($$('.z-erkek', bolum), { scale: 1, opacity: 1, duration: 1.2, ease: 'back.out(2)', stagger: 0.18, delay: 0.6 })
      },
    })
  }

  for (const c of cicekler) {
    c.addEventListener('click', () => {
      const i = +(c.dataset.i ?? 0)
      const tomurcuk = c.classList.contains('tomurcuk')
      kart.innerHTML = tomurcuk
        ? `<small>${sayi(n + 1)}. ay</small><b>${ayDonumuTarihi(n + 1)}</b><span>Bu tomurcuk o gün açacak.</span>`
        : `<small>${sayi(i + 1)}. ay</small><b>${ayDonumuTarihi(i + 1)}</b><span>${i === n - 1 ? 'En yeni zambağımız.' : 'Bu zambak o gün açtı.'}</span>`
      const r = c.getBoundingClientRect()
      const s = bolum.querySelector('.vazo-sahne')!.getBoundingClientRect()
      kart.style.left = `${Math.min(s.width - 180, Math.max(0, r.left - s.left + r.width / 2 - 90))}px`
      kart.style.top = `${r.bottom - s.top + 6}px`
      kart.classList.add('acik')
      ses.nota(tomurcuk ? 76 : 83, 0.035)
      titret(8)
      gsap.fromTo(c.querySelector('.z-tac, path'), { scale: 1.12 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)', transformOrigin: '0px 0px' })
    })
  }
  bolum.addEventListener('pointerdown', (e) => {
    if (!(e.target as Element).closest('.zambak')) kart.classList.remove('acik')
  })
}
