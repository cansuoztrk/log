import { ICERIK } from '../icerik'
import { type Anlik, dolunaySayisi, gunEkle, gunFarki, GUNLER, AYLAR, sayi, tarihYazi } from '../cekirdek/zaman'
import { $, azHareket, belir, gorunurken, gsap, satirSatir, ScrollTrigger, tuvalOlcu } from './yardimci'

const { tanisma, sevgili } = ICERIK
const ALTIN = (137.50776 * Math.PI) / 180

interface Kilometre {
  tarih: string
  ad: string
}

/** Yaklaşan güzel günler */
function yaklasanlar(bugun: string): Kilometre[] {
  const liste: Kilometre[] = []
  const [y, m, d] = bugun.split('-').map(Number)
  // sıradaki ayın 21'i (ay dönümü)
  let ay = d < 21 ? m : m + 1
  let yil = y
  if (ay > 12) {
    ay = 1
    yil++
  }
  const ayDonumu = `${yil}-${String(ay).padStart(2, '0')}-21`
  const kacinci = (yil - +sevgili.slice(0, 4)) * 12 + (ay - +sevgili.slice(5, 7))
  if (kacinci % 12 !== 0) liste.push({ tarih: ayDonumu, ad: `${kacinci}. ayımız` })
  for (const n of [100, 200, 300, 500, 1000]) {
    liste.push({ tarih: gunEkle(sevgili, n - 1), ad: `Birlikte ${sayi(n)}. günümüz` })
    liste.push({ tarih: gunEkle(tanisma, n - 1), ad: `Tanışmamızın ${sayi(n)}. günü` })
  }
  for (let k = 1; k <= 5; k++) {
    liste.push({ tarih: `${+tanisma.slice(0, 4) + k}${tanisma.slice(4)}`, ad: `Tanışmamızın ${k}. yılı` })
    liste.push({ tarih: `${+sevgili.slice(0, 4) + k}${sevgili.slice(4)}`, ad: `${k}. yıl dönümümüz` })
  }
  for (const [kim, g] of [
    ['Senin', ICERIK.dogumGunu.sen],
    ['Benim', ICERIK.dogumGunu.ben],
  ] as const) {
    if (!g) continue
    const buYil = `${y}-${g}`
    liste.push({ tarih: buYil >= bugun ? buYil : `${y + 1}-${g}`, ad: kim === 'Senin' ? 'Senin doğum günün' : 'Benim doğum günüm' })
  }
  if (ICERIK.ilkBulusma) liste.push({ tarih: ICERIK.ilkBulusma.slice(0, 10), ad: 'İlk buluşmamız' })
  return liste
    .filter((k) => k.tarih > bugun)
    .sort((a, b) => a.tarih.localeCompare(b.tarih))
    .slice(0, 4)
}

export function gunlerHTML(z: Anlik) {
  const dolunay = dolunaySayisi(new Date(sevgili + 'T00:00:00+04:00'), z.an)
  const yakin = yaklasanlar(z.bugun)
  return /* html */ `
  <section id="gunler" class="bolum" data-bolum="IV" data-ad="Günlerimiz">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no">IV</span>Günlerimiz</p>
        <h2 class="baslik">Her gün bir <em>tohum</em>.</h2>
        <p class="metin">Tanıştığımız günden beri her gün bu bahçeye bir tohum ekleniyor. Ayçiçeği gibi dizildiler; doğa en güzel düzenini altın açıyla kurar. Ortadaki ilk günümüz, en dıştaki <strong>bugün</strong>. Soluk olanlar henüz gelmedi.</p>
      </div>
      <div class="gunler-izgara">
        <div class="bahce" data-dom>
          <canvas class="bahce-tuval" aria-label="Tanıştığımızdan beri her gün bir tohum"></canvas>
          <div class="bahce-kart" role="status"></div>
          <p class="bahce-ipucu">bir tohuma dokun</p>
        </div>
        <div class="sayaclar">
          <div><b>${sayi(z.tanisalGun)}</b><span>gündür tanışıyoruz</span></div>
          <div><b>${sayi(z.sevgiliGun)}</b><span>gündür “biz”iz</span></div>
          <div><b data-canli="saat">—</b><span>saattir seninim</span></div>
          <div><b data-canli="kalp">—</b><span>kez attı kalbim, o günden beri <small>(dakikada ~72)</small></span></div>
          <div><b>${dolunay}</b><span>dolunayı iki ayrı pencereden izledik</span></div>
          <div><b>${sayi(z.sevgiliGun)}</b><span>kez güneş önce sana doğdu, sonra bana</span></div>
        </div>
      </div>
      <div class="yaklasanlar">
        <p class="etiket">Sıradaki güzel günler</p>
        <ul>
          ${yakin
            .map(
              (k) => `<li><span class="yk-ad">${k.ad}</span><span class="yk-tarih">${tarihYazi(k.tarih)}</span><b>${sayi(
                gunFarki(z.bugun, k.tarih),
              )} <small>gün</small></b></li>`,
            )
            .join('')}
        </ul>
      </div>
      <p class="satir italik gunler-son">Hiç aynı odada olmadık. Ama bu günlerin her birinde, günümün bir odası <em>sendin</em>.</p>
    </div>
  </section>`
}

export function gunlerKur(z: Anlik) {
  const bolum = $('#gunler')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum)])
  belir(Array.from(bolum.querySelectorAll('.sayaclar > div')))
  belir(Array.from(bolum.querySelectorAll('.yaklasanlar li')))
  belir($('.gunler-son', bolum))

  // Canlı sayaçlar
  const sevgiliAn = new Date(sevgili + 'T00:00:00+04:00').getTime()
  const saatEl = $('[data-canli="saat"]', bolum)
  const kalpEl = $('[data-canli="kalp"]', bolum)
  const guncelle = () => {
    const dk = (Date.now() - sevgiliAn) / 60000
    saatEl.textContent = sayi(Math.floor(dk / 60))
    kalpEl.textContent = sayi(Math.floor(dk * 72))
  }
  guncelle()
  let sayacAcik = false
  gorunurken(bolum, (a) => (sayacAcik = a))
  window.setInterval(() => sayacAcik && guncelle(), 833)

  // ─── Bahçe ───
  const tuval = $<HTMLCanvasElement>('.bahce-tuval', bolum)
  const kart = $('.bahce-kart', bolum)
  const bugunNo = z.tanisalGun // 0 tabanlı: bugün
  const sevgiliNo = gunFarki(tanisma, sevgili)
  const sonTarih = `${+tanisma.slice(0, 4) + Math.max(1, Math.ceil((bugunNo + 30) / 365))}${tanisma.slice(4)}`
  const toplam = Math.max(bugunNo + 20, gunFarki(tanisma, sonTarih)) + 1
  const anilar = new Map(ICERIK.anilar.map((a) => [gunFarki(tanisma, a.tarih), a.baslik]))

  const ayFarki = (a: string, y: number, m: number) => (y - +a.slice(0, 4)) * 12 + (m - +a.slice(5, 7))
  const etiket = (i: number) => {
    const t = gunEkle(tanisma, i)
    const [y, m, d] = t.split('-').map(Number)
    if (i === 0) return 'Tanıştığımız gün'
    if (i === sevgiliNo) return 'Sevgili olduk ♥'
    if (i === bugunNo) return 'Bugün'
    if (anilar.has(i)) return anilar.get(i)!
    if (i > sevgiliNo && d === +sevgili.slice(8, 10)) return `${ayFarki(sevgili, y, m)}. ayımız`
    if (i > 0 && d === +tanisma.slice(8, 10)) return `Tanışmamızın ${ayFarki(tanisma, y, m)}. ayı`
    if (i === sevgiliNo + 99) return 'Birlikte 100. gün'
    if (m === 1 && d === 1) return 'Yeni yıl'
    if (m === 3 && (d === 20 || d === 21)) return 'Novruz'
    return ''
  }

  let olcu = tuvalOlcu(tuval)
  let ilerleme = azHareket ? 1 : 0
  let secili = -1
  const konum = (i: number) => {
    const { w, h } = olcu
    const R = Math.min(w, h) * 0.46
    const c = R / Math.sqrt(toplam)
    const r = c * Math.sqrt(i + 0.5)
    const a = i * ALTIN + performance.now() / 60000
    return { x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r, c }
  }
  const kalpCiz = (x: CanvasRenderingContext2D, px: number, py: number, s: number) => {
    x.beginPath()
    for (let k = 0; k <= 30; k++) {
      const t = (k / 30) * Math.PI * 2
      const hx = 16 * Math.sin(t) ** 3
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
      k ? x.lineTo(px + (hx * s) / 16, py + (hy * s) / 16) : x.moveTo(px + (hx * s) / 16, py + (hy * s) / 16)
    }
    x.closePath()
    x.fill()
  }

  let calis = false
  const ciz = () => {
    if (!calis) return
    const { x, w, h } = olcu
    x.clearRect(0, 0, w, h)
    const t = performance.now() / 1000
    const gorunen = Math.floor(ilerleme * toplam)
    for (let i = 0; i < Math.min(toplam, gorunen + 1); i++) {
      const { x: px, y: py, c } = konum(i)
      const gelecek = i > bugunNo
      const buyu = Math.min(1, (ilerleme * toplam - i) / 6)
      if (buyu <= 0) continue
      let s = c * 0.36 * buyu
      if (gelecek) {
        x.strokeStyle = 'rgba(247,237,224,0.16)'
        x.lineWidth = 1
        x.beginPath()
        x.arc(px, py, s * 0.8, 0, Math.PI * 2)
        x.stroke()
        continue
      }
      let renk: string
      if (i < sevgiliNo) {
        const k = i / sevgiliNo
        renk = `rgba(${Math.round(134 + 60 * k)},${Math.round(168 + 10 * k)},255,${0.55 + 0.3 * k})`
      } else {
        const k = (i - sevgiliNo) / Math.max(1, bugunNo - sevgiliNo)
        renk = `rgb(${Math.round(245 - 2 * k)},${Math.round(159 + 37 * k)},${Math.round(180 - 56 * k)})`
      }
      const ozel = etiket(i)
      if (i === bugunNo) {
        const n = 1 + 0.25 * Math.sin(t * 3)
        const g = x.createRadialGradient(px, py, 0, px, py, s * 4 * n)
        g.addColorStop(0, 'rgba(255,240,220,0.9)')
        g.addColorStop(1, 'rgba(255,240,220,0)')
        x.fillStyle = g
        x.beginPath()
        x.arc(px, py, s * 4 * n, 0, Math.PI * 2)
        x.fill()
        renk = '#fff4e2'
        s *= 1.3
      }
      if (i === sevgiliNo) {
        const g = x.createRadialGradient(px, py, 0, px, py, s * 6)
        g.addColorStop(0, 'rgba(245,159,180,0.8)')
        g.addColorStop(1, 'rgba(245,159,180,0)')
        x.fillStyle = g
        x.beginPath()
        x.arc(px, py, s * 6, 0, Math.PI * 2)
        x.fill()
        x.fillStyle = '#ffd0da'
        kalpCiz(x, px, py, s * 2.1)
        continue
      }
      x.fillStyle = renk
      x.beginPath()
      x.arc(px, py, s, 0, Math.PI * 2)
      x.fill()
      if (ozel && i !== bugunNo) {
        x.strokeStyle = i === 0 ? 'rgba(134,168,255,0.9)' : 'rgba(255,223,174,0.55)'
        x.lineWidth = 1
        x.beginPath()
        x.arc(px, py, s + 3, 0, Math.PI * 2)
        x.stroke()
      }
      if (i === secili) {
        x.strokeStyle = '#fff'
        x.lineWidth = 1.5
        x.beginPath()
        x.arc(px, py, s + 5, 0, Math.PI * 2)
        x.stroke()
      }
    }
    requestAnimationFrame(ciz)
  }
  gorunurken(tuval, (a) => {
    if (a && !calis) {
      calis = true
      requestAnimationFrame(ciz)
    } else if (!a) calis = false
  })
  window.addEventListener('resize', () => (olcu = tuvalOlcu(tuval)))
  if (!azHareket) {
    ScrollTrigger.create({
      trigger: tuval,
      start: 'top 75%',
      once: true,
      onEnter: () => gsap.to({ v: 0 }, { v: 1, duration: 3.2, ease: 'power2.inOut', onUpdate() { ilerleme = this.targets()[0].v } }),
    })
  }

  const sec = (e: PointerEvent) => {
    const r = tuval.getBoundingClientRect()
    const mx = e.clientX - r.left
    const my = e.clientY - r.top
    let en = -1
    let enD = Infinity
    for (let i = 0; i < toplam; i++) {
      const p = konum(i)
      const d = (p.x - mx) ** 2 + (p.y - my) ** 2
      if (d < enD) {
        enD = d
        en = i
      }
    }
    if (en < 0 || enD > 26 ** 2) return
    secili = en
    const tarih = gunEkle(tanisma, en)
    const [yy, mm, dd] = tarih.split('-').map(Number)
    const hg = GUNLER[new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay()]
    const ozel = etiket(en)
    const fark = en - bugunNo
    kart.innerHTML = `<small>Gün ${sayi(en + 1)}</small><b>${dd} ${AYLAR[mm - 1]} ${yy}</b><span>${hg}${
      fark > 0 ? ` · ${sayi(fark)} gün sonra` : ''
    }</span>${ozel ? `<em>${ozel}</em>` : ''}`
    const p = konum(en)
    kart.style.left = `${Math.min(r.width - 170, Math.max(0, p.x - 85))}px`
    kart.style.top = `${p.y + 16}px`
    kart.classList.add('acik')
  }
  tuval.addEventListener('pointerdown', sec)
  tuval.addEventListener('pointermove', (e) => e.pointerType === 'mouse' && sec(e))
  tuval.addEventListener('pointerleave', () => {
    kart.classList.remove('acik')
    secili = -1
  })
}
