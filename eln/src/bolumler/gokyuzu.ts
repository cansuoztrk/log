import * as SunCalc from 'suncalc'
import { ICERIK, type Kisi } from '../icerik'
import { CIZGILER, SAMANYOLU, TAKIMYILDIZLAR, YILDIZ_ADLARI, YILDIZLAR } from '../veri/gok'
import { gezegenler, yatay, yildizZamani, yonBulunma } from '../cekirdek/gokbilim'
import { ayCiz } from '../cekirdek/ay-ciz'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { saatYazi, simdi, tarihYazi, isoGun, yerel } from '../cekirdek/zaman'
import { $, $$, azHareket, belir, gsap, paylasVeyaIndir, satirSatir, titret } from './yardimci'

const { ben, sen } = ICERIK
const D = Math.PI / 180

type An = 'tanisma' | 'sevgili' | 'bugece'
type Sehir = 'sen' | 'ben'

/** Bizim dakikamız: 21:05 (Bakü saatiyle) */
const aninZamani = (an: An): Date => {
  if (an === 'tanisma') return new Date(`${ICERIK.tanisma}T21:05:00+04:00`)
  if (an === 'sevgili') return new Date(`${ICERIK.sevgili}T21:05:00+04:00`)
  // bu gece: hava kararmışsa şu an, değilse bu akşam 22:00
  const s = simdi()
  if (SunCalc.getPosition(s, sen.enlem, sen.boylam).altitude < -8) return s
  return new Date(`${isoGun(yerel(s, sen.saatDilimi))}T22:00:00+04:00`)
}

const derece = (n: number, pozitif: string, negatif: string) => `${Math.abs(n).toFixed(2).replace('.', ',')}° ${n >= 0 ? pozitif : negatif}`

/** B−V renk ölçeğinden yıldız rengi */
function bvRenk(bv: number) {
  const duraklar: [number, number[]][] = [
    [-0.3, [160, 185, 255]],
    [0, [215, 226, 255]],
    [0.4, [248, 246, 255]],
    [0.7, [255, 244, 225]],
    [1.1, [255, 218, 175]],
    [1.6, [255, 186, 135]],
  ]
  for (let i = 1; i < duraklar.length; i++) {
    const [b1, r1] = duraklar[i]
    if (bv <= b1) {
      const [b0, r0] = duraklar[i - 1]
      const t = Math.max(0, (bv - b0) / (b1 - b0))
      return r0.map((v, k) => Math.round(v + (r1[k] - v) * t)).join(',')
    }
  }
  return duraklar[duraklar.length - 1][1].join(',')
}

interface Hedef {
  x: number
  y: number
  ad: string
  bilgi: string
  id?: string
}

interface Cizim {
  yz: number // yerel yıldız zamanı
  enlem: number
  an: Date
  kisi: Kisi
  etiketler: boolean
}

/** Bir gökyüzü haritası çizer: tepe noktası ortada, kuzey yukarıda, doğu solda (gökyüzüne bakar gibi). */
function haritaCiz(x: CanvasRenderingContext2D, cx: number, cy: number, R: number, c: Cizim): Hedef[] {
  const s = R / 260
  const hedefler: Hedef[] = []
  const izd = (alt: number, az: number) => {
    const r = R * Math.tan(((90 - alt) * D) / 2)
    return [cx - r * Math.sin(az * D), cy - r * Math.cos(az * D)] as const
  }

  x.save()
  x.beginPath()
  x.arc(cx, cy, R, 0, Math.PI * 2)
  x.clip()
  const zemin = x.createRadialGradient(cx, cy, 0, cx, cy, R)
  zemin.addColorStop(0, '#161c44')
  zemin.addColorStop(0.75, '#0d1130')
  zemin.addColorStop(1, '#1c1533')
  x.fillStyle = zemin
  x.fillRect(cx - R, cy - R, R * 2, R * 2)

  // Samanyolu: düşük çözünürlüklü bir tuvale nokta nokta çizilip bulanıklaştırılarak büyütülür → yumuşak bir ışık bulutu
  const kucuk = 120
  const mw = document.createElement('canvas')
  mw.width = mw.height = kucuk
  const m = mw.getContext('2d')!
  const mR = kucuk / 2
  const { adim, sutun, veri } = SAMANYOLU
  for (let i = 0; i < veri.length; i++) {
    const v = veri.charCodeAt(i) - 48
    if (!v) continue
    const ra = ((i % sutun) + 0.5) * adim
    const dec = 90 - (Math.floor(i / sutun) + 0.5) * adim
    const h = yatay(ra, dec, c.yz, c.enlem)
    if (h.alt < -4) continue
    const r = mR * Math.tan(((90 - h.alt) * D) / 2)
    const buyut = 2 / (1 + Math.sin(Math.max(0, h.alt) * D))
    m.fillStyle = `rgba(200,208,255,${0.05 + v * 0.05})`
    m.beginPath()
    m.arc(mR - r * Math.sin(h.az * D), mR - r * Math.cos(h.az * D), 1.7 * buyut, 0, Math.PI * 2)
    m.fill()
  }
  x.globalCompositeOperation = 'lighter'
  x.globalAlpha = 0.36
  x.imageSmoothingEnabled = true
  // tarayıcı destekliyorsa ek bir bulanıklık (desteklemeyende düşük çözünürlük zaten yumuşatır)
  if ('filter' in x) x.filter = `blur(${Math.round(5 * s)}px)`
  x.drawImage(mw, cx - R, cy - R, R * 2, R * 2)
  if ('filter' in x) x.filter = 'none'
  x.globalAlpha = 1
  x.globalCompositeOperation = 'source-over'

  // takımyıldız çizgileri
  x.strokeStyle = 'rgba(255,223,174,0.3)'
  x.lineWidth = 0.9 * s
  x.lineCap = 'round'
  for (const cz of CIZGILER) {
    let onceki: { alt: number; p: readonly [number, number] } | null = null
    for (let k = 0; k < cz.length; k += 2) {
      const h = yatay(cz[k], cz[k + 1], c.yz, c.enlem)
      const p = izd(Math.max(h.alt, -40), h.az)
      if (onceki && (onceki.alt > 0 || h.alt > 0)) {
        x.beginPath()
        x.moveTo(onceki.p[0], onceki.p[1])
        x.lineTo(p[0], p[1])
        x.stroke()
      }
      onceki = { alt: h.alt, p }
    }
  }

  // takımyıldız adları
  if (c.etiketler) {
    x.font = `600 ${Math.round(7.5 * s)}px "Plus Jakarta Sans Variable", sans-serif`
    x.textAlign = 'center'
    x.fillStyle = 'rgba(247,237,224,0.3)'
    for (const [ad, ra, dec, onem] of Object.values(TAKIMYILDIZLAR)) {
      if (onem > 1) continue
      const h = yatay(ra, dec, c.yz, c.enlem)
      if (h.alt < 14) continue
      const [px, py] = izd(h.alt, h.az)
      x.fillText(ad.toLocaleUpperCase('tr-TR').split('').join(' '), px, py)
    }
  }

  // yıldızlar (sönükten parlağa, parlaklar üstte kalsın)
  for (let i = YILDIZLAR.length / 4 - 1; i >= 0; i--) {
    const ra = YILDIZLAR[i * 4]
    const dec = YILDIZLAR[i * 4 + 1]
    const kadir = YILDIZLAR[i * 4 + 2]
    const h = yatay(ra, dec, c.yz, c.enlem)
    if (h.alt < 0) continue
    const [px, py] = izd(h.alt, h.az)
    const renk = bvRenk(YILDIZLAR[i * 4 + 3])
    const r = Math.max(0.45, 0.28 + (5.2 - kadir) * 0.44) * s
    let a = Math.min(1, Math.max(0.35, 1.15 - (kadir - 1.5) / 4.5))
    if (h.alt < 10) a *= 0.35 + (0.65 * h.alt) / 10 // ufka yakın sönükleşir
    if (kadir < 1.8) {
      const p = x.createRadialGradient(px, py, 0, px, py, r * 5)
      p.addColorStop(0, `rgba(${renk},${0.42 * a})`)
      p.addColorStop(1, `rgba(${renk},0)`)
      x.fillStyle = p
      x.beginPath()
      x.arc(px, py, r * 5, 0, Math.PI * 2)
      x.fill()
    }
    x.fillStyle = `rgba(${renk},${a})`
    x.beginPath()
    x.arc(px, py, r, 0, Math.PI * 2)
    x.fill()
    const adi = YILDIZ_ADLARI[i]
    if (adi && kadir < 3.2) {
      hedefler.push({ x: px, y: py, ad: adi[0], bilgi: `${TAKIMYILDIZLAR[adi[1]]?.[0] ?? adi[1]} takımyıldızı` })
      if (c.etiketler && kadir < 1.6 && h.alt > 8) {
        x.font = `500 ${Math.round(8 * s)}px "Plus Jakarta Sans Variable", sans-serif`
        x.textAlign = 'left'
        x.fillStyle = 'rgba(247,237,224,0.6)'
        x.fillText(adi[0].replace(/ \(.*\)$/, ''), px + r + 4 * s, py + 3 * s)
      }
    }
  }

  if (c.etiketler) {
    // gezegenler
    for (const g of gezegenler(c.an)) {
      const h = yatay(g.ra, g.dec, c.yz, c.enlem)
      if (h.alt < 0) continue
      const [px, py] = izd(h.alt, h.az)
      const r = g.boy * s
      const p = x.createRadialGradient(px, py, 0, px, py, r * 6)
      p.addColorStop(0, `rgba(${g.renk},0.55)`)
      p.addColorStop(1, `rgba(${g.renk},0)`)
      x.fillStyle = p
      x.beginPath()
      x.arc(px, py, r * 6, 0, Math.PI * 2)
      x.fill()
      x.fillStyle = `rgb(${g.renk})`
      x.beginPath()
      x.arc(px, py, r, 0, Math.PI * 2)
      x.fill()
      x.font = `italic 500 ${Math.round(11 * s)}px "Cormorant Garamond", serif`
      x.textAlign = 'left'
      x.fillStyle = 'rgba(255,223,174,0.92)'
      x.fillText(g.ad, px + r + 5 * s, py - 4 * s)
      hedefler.push({
        x: px,
        y: py,
        ad: g.ad,
        id: g.id,
        bilgi: g.id === 'venus' ? 'Adını aşk tanrıçasından alan gezegen' : 'Gezegen; yıldız değil, ama en az onlar kadar parlak',
      })
    }
    // ay
    const ay = SunCalc.getMoonPosition(c.an, c.kisi.enlem, c.kisi.boylam)
    if (ay.altitude > -1) {
      const [px, py] = izd(ay.altitude, ay.azimuth)
      const isik = SunCalc.getMoonIllumination(c.an)
      const p = x.createRadialGradient(px, py, 0, px, py, 34 * s)
      p.addColorStop(0, `rgba(255,244,225,${0.18 + 0.3 * isik.fraction})`)
      p.addColorStop(1, 'rgba(255,244,225,0)')
      x.fillStyle = p
      x.beginPath()
      x.arc(px, py, 34 * s, 0, Math.PI * 2)
      x.fill()
      ayCiz(x, px, py, 8.5 * s, isik.phase)
      hedefler.push({ x: px, y: py, ad: 'Ay', id: 'ay', bilgi: `%${Math.round(isik.fraction * 100)} dolu` })
    }
  }
  x.restore()

  // ufuk çemberi ve yönler
  x.strokeStyle = 'rgba(243,196,124,0.55)'
  x.lineWidth = 1.2 * s
  x.beginPath()
  x.arc(cx, cy, R, 0, Math.PI * 2)
  x.stroke()
  x.strokeStyle = 'rgba(243,196,124,0.35)'
  for (let a = 0; a < 360; a += 15) {
    const u = a % 90 === 0 ? 9 : 4
    x.beginPath()
    x.moveTo(cx - R * Math.sin(a * D), cy - R * Math.cos(a * D))
    x.lineTo(cx - (R + u * s) * Math.sin(a * D), cy - (R + u * s) * Math.cos(a * D))
    x.stroke()
  }
  x.font = `600 ${Math.round(10 * s)}px "Plus Jakarta Sans Variable", sans-serif`
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillStyle = 'rgba(243,196,124,0.9)'
  for (const [harf, a] of [
    ['K', 0],
    ['D', 90],
    ['G', 180],
    ['B', 270],
  ] as const) {
    x.fillText(harf, cx - (R + 20 * s) * Math.sin(a * D), cy - (R + 20 * s) * Math.cos(a * D))
  }
  x.textBaseline = 'alphabetic'
  return hedefler
}

/* ─── Anlatı: o gece gökyüzünde neler vardı ─── */
function anlati(an: An, sehir: Sehir, t: Date, yz: number, kisi: Kisi) {
  const gecmis = an !== 'bugece'
  const cumleler: string[] = []
  const ay = SunCalc.getMoonPosition(t, kisi.enlem, kisi.boylam)
  const yuzde = Math.round(SunCalc.getMoonIllumination(t).fraction * 100)
  if (ay.altitude > 0)
    cumleler.push(
      gecmis
        ? `Ay %${yuzde} doluydu; ${yonBulunma(ay.azimuth)}, ufkun ${Math.round(ay.altitude)}° üstündeydi.`
        : `Ay %${yuzde} dolu; ${yonBulunma(ay.azimuth)}, ufkun ${Math.round(ay.altitude)}° üstünde.`,
    )
  else cumleler.push(gecmis ? 'Ay o saatte ufkun altındaydı; gökyüzü yıldızlara kalmıştı.' : 'Ay şu an ufkun altında; gökyüzü yıldızlara kalmış.')

  const gorunen = gezegenler(t)
    .map((g) => ({ g, h: yatay(g.ra, g.dec, yz, kisi.enlem) }))
    .filter((x) => x.h.alt > 3)
  const venus = gorunen.find((x) => x.g.id === 'venus')
  const digerleri = gorunen.filter((x) => x.g.id !== 'venus')
  if (venus)
    cumleler.push(
      `Adını aşk tanrıçasından alan Venüs ${yonBulunma(venus.h.az)} ${gecmis ? 'parlıyordu' : 'parlıyor'}${digerleri.length ? `; yanında ${digerleri.map((x) => x.g.ad).join(' ve ')} ${gecmis ? 'vardı' : 'var'}` : ''}.`,
    )
  else if (digerleri.length)
    cumleler.push(`${digerleri.map((x) => `${x.g.ad} ${yonBulunma(x.h.az)}`).join(', ')} ${gecmis ? 'parlıyordu' : 'parlıyor'}.`)

  // başının üstündeki en parlak yıldız
  let tepe: { ad: string; alt: number } | null = null
  for (const [i, [ad]] of Object.entries(YILDIZ_ADLARI)) {
    const k = +i
    if (YILDIZLAR[k * 4 + 2] > 1.6) continue
    const h = yatay(YILDIZLAR[k * 4], YILDIZLAR[k * 4 + 1], yz, kisi.enlem)
    if (h.alt > 64 && (!tepe || h.alt > tepe.alt)) tepe = { ad: ad.replace(/ \(.*\)$/, ''), alt: h.alt }
  }
  if (tepe) {
    const kimin = sehir === 'sen' ? 'Senin' : 'Benim'
    cumleler.push(`${kimin} başı${sehir === 'sen' ? 'nın' : 'mın'} hemen üstünde ${tepe.ad} ${gecmis ? 'vardı' : 'var'}.`)
  }
  return cumleler.join(' ')
}

const SOZ: Record<An, string> = {
  tanisma: 'Seni tanıdığım gece gökyüzü böyleydi.',
  sevgili: '“Biz” olduğumuz gece gökyüzü böyleydi.',
  bugece: 'Bu gece, aynı gökyüzünün altındayız.',
}

export function gokyuzuHTML() {
  return /* html */ `
  <section id="gokyuzu" class="bolum" data-bolum="" data-ad="O Gecenin Gökyüzü">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>O gecenin gökyüzü</p>
        <h2 class="baslik">Yıldızlar <em>o gece de</em> oradaydı.</h2>
        <p class="metin">Tanıştığımız gece ve “biz” olduğumuz gece gökyüzü tam olarak böyleydi: aynı yıldızlar, aynı ay, gezegenler gerçek yerlerinde. Geceyi ve şehri değiştir; gökyüzü o ana döner.</p>
      </div>
      <div class="gok-harita" data-dom>
        <div class="gok-secim" role="group" aria-label="Hangi gece">
          <button type="button" data-an="tanisma" aria-pressed="false">${tarihYazi(ICERIK.tanisma)}<small>tanıştık</small></button>
          <button type="button" data-an="sevgili" aria-pressed="true" class="secili">${tarihYazi(ICERIK.sevgili)}<small>biz olduk</small></button>
          <button type="button" data-an="bugece" aria-pressed="false">Bu gece<small>şimdi</small></button>
        </div>
        <div class="gok-cember">
          <canvas class="gok-tuval" role="img" aria-label="Gökyüzü haritası"></canvas>
          <p class="gok-ipucu" hidden></p>
        </div>
        <div class="gok-sehir" role="group" aria-label="Hangi şehrin gökyüzü">
          <button type="button" data-sehir="sen" aria-pressed="true" class="secili">${sen.yerelSehir}</button>
          <button type="button" data-sehir="ben" aria-pressed="false">${ben.yerelSehir}</button>
        </div>
        <p class="gok-soz"></p>
        <p class="gok-baslik"></p>
        <p class="gok-anlati"></p>
        <button class="dugme hayalet gok-poster" type="button"><span>Bu gökyüzünü poster olarak kaydet</span></button>
        <p class="dipnot gok-not">Harita yukarı bakar gibi çizildi: kuzey yukarıda, doğu solda. Bir yıldıza ya da gezegene dokun.</p>
      </div>
    </div>
  </section>`
}

export function gokyuzuKur() {
  const bolum = $('#gokyuzu')
  satirSatir($('.baslik', bolum))
  belir($('.bolum-bas .metin', bolum))
  belir($('.gok-harita', bolum))

  const tuval = $<HTMLCanvasElement>('.gok-tuval', bolum)
  const ipucu = $('.gok-ipucu', bolum)
  let an: An = 'sevgili'
  let sehir: Sehir = 'sen'
  let hedefler: Hedef[] = []
  let gorunur = { yz: 0, enlem: 0 }
  let kur = false

  const durum = () => {
    const kisi = sehir === 'sen' ? sen : ben
    const t = aninZamani(an)
    return { kisi, t, yz: yildizZamani(t, kisi.boylam) }
  }

  const ciz = (yz: number, enlem: number, etiketler: boolean) => {
    const px = Math.min(window.devicePixelRatio || 1, 2)
    const W = tuval.clientWidth
    if (!W) return
    if (tuval.width !== Math.round(W * px)) {
      tuval.width = Math.round(W * px)
      tuval.height = Math.round(W * px)
    }
    const x = tuval.getContext('2d')!
    x.setTransform(px, 0, 0, px, 0, 0)
    x.clearRect(0, 0, W, W)
    const { kisi, t } = durum()
    const R = W / 2 - 30 * (W / 560)
    hedefler = haritaCiz(x, W / 2, W / 2, R, { yz, enlem, an: t, kisi, etiketler })
    gorunur = { yz, enlem }
  }

  const yaziGuncelle = () => {
    const { kisi, t, yz } = durum()
    $('.gok-soz', bolum).textContent = an === 'bugece' && sehir === 'ben' ? 'Bu gece, benim gökyüzüm. Senin üstündekiyle neredeyse aynı.' : SOZ[an]
    const tarih = isoGun(yerel(t, kisi.saatDilimi))
    $('.gok-baslik', bolum).innerHTML =
      `${tarihYazi(tarih)} · ${saatYazi(t, kisi.saatDilimi)} · ${kisi.yerelSehir}` +
      `<small>${derece(kisi.enlem, 'K', 'G')} · ${derece(kisi.boylam, 'D', 'B')}${sehir === 'ben' && an !== 'bugece' ? ' · aynı an, bir saat geriden' : ''}</small>`
    $('.gok-anlati', bolum).textContent = anlati(an, sehir, t, yz, kisi)
  }

  // Geçiş: başka bir geceye giderken gökyüzü zamanda ileri/geri bir tur döner;
  // şehir değişince (aynı an) sadece aradaki boylam farkı kadar kayar.
  let gecis: gsap.core.Tween | null = null
  const git = (yon: 'ileri' | 'geri' | 'yakin') => {
    ipucu.hidden = true
    const { kisi, yz } = durum()
    yaziGuncelle()
    if (azHareket || !kur) {
      ciz(yz, kisi.enlem, true)
      return
    }
    const bas = { ...gorunur }
    let fark = (((yz - bas.yz) % 360) + 360) % 360
    if (yon === 'yakin') fark = fark > 180 ? fark - 360 : fark
    else if (yon === 'geri') fark -= 720
    else fark += 360
    const o = { t: 0 }
    gecis?.kill()
    ses.vuus(yon === 'yakin' ? 0.8 : 1.6)
    gecis = gsap.to(o, {
      t: 1,
      duration: yon === 'yakin' ? 1 : 2,
      ease: 'power3.inOut',
      onUpdate: () => ciz(bas.yz + fark * o.t, bas.enlem + (kisi.enlem - bas.enlem) * o.t, false),
      onComplete: () => {
        ciz(yz, kisi.enlem, true)
        ses.nota(83, 0.03)
      },
    })
  }

  const sira: An[] = ['tanisma', 'sevgili', 'bugece']
  for (const d of $$<HTMLButtonElement>('[data-an]', bolum)) {
    d.addEventListener('click', () => {
      const yeni = d.dataset.an as An
      if (yeni === an) return
      const geri = sira.indexOf(yeni) < sira.indexOf(an)
      an = yeni
      for (const x of $$<HTMLButtonElement>('[data-an]', bolum)) {
        x.classList.toggle('secili', x === d)
        x.setAttribute('aria-pressed', String(x === d))
      }
      titret(8)
      git(geri ? 'geri' : 'ileri')
    })
  }
  for (const d of $$<HTMLButtonElement>('[data-sehir]', bolum)) {
    d.addEventListener('click', () => {
      const yeni = d.dataset.sehir as Sehir
      if (yeni === sehir) return
      sehir = yeni
      for (const x of $$<HTMLButtonElement>('[data-sehir]', bolum)) {
        x.classList.toggle('secili', x === d)
        x.setAttribute('aria-pressed', String(x === d))
      }
      titret(8)
      git('yakin')
    })
  }

  // dokunulan gök cismi
  tuval.addEventListener('click', (e) => {
    const r = tuval.getBoundingClientRect()
    const px = e.clientX - r.left
    const py = e.clientY - r.top
    let en: Hedef | null = null
    let enUzak = 24
    for (const h of hedefler) {
      const u = Math.hypot(h.x - px, h.y - py)
      if (u < enUzak) {
        en = h
        enUzak = u
      }
    }
    if (!en) {
      ipucu.hidden = true
      return
    }
    ipucu.innerHTML = `<b>${en.ad}</b><span>${en.bilgi}</span>`
    ipucu.hidden = false
    // kutu kenardan taşmasın; yıldız üst kısımdaysa kutu altına açılır
    ipucu.style.left = `${Math.min(80, Math.max(20, (en.x / r.width) * 100))}%`
    ipucu.style.top = `${(en.y / r.height) * 100}%`
    ipucu.classList.toggle('alt', en.y < r.height * 0.22)
    gsap.fromTo(ipucu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 })
    ses.nota(88, 0.03)
    titret(6)
    if (en.id === 'venus') window.setTimeout(() => sirBul('venus'), 900)
  })

  // Poster
  const posterD = $<HTMLButtonElement>('.gok-poster', bolum)
  posterD.addEventListener('click', async () => {
    posterD.disabled = true
    const yazi = posterD.querySelector('span')!
    yazi.textContent = 'Hazırlanıyor…'
    await posterYap(an, sehir, durum())
    yazi.textContent = 'Bu gökyüzünü poster olarak kaydet'
    posterD.disabled = false
  })

  // İlk çizim: fontlar yüklenip bölüm görünür olmaya yaklaşınca
  yaziGuncelle()
  const ilk = () => {
    if (kur) return
    kur = true
    const { kisi, yz } = durum()
    ciz(yz, kisi.enlem, true)
  }
  const io = new IntersectionObserver(
    (k) => {
      if (k.some((x) => x.isIntersecting)) {
        io.disconnect()
        void document.fonts.ready.then(ilk)
      }
    },
    { rootMargin: '600px' },
  )
  io.observe(bolum)
  let genislik = 0
  window.addEventListener('resize', () => {
    if (!kur || tuval.clientWidth === genislik) return
    genislik = tuval.clientWidth
    const { kisi, yz } = durum()
    ciz(yz, kisi.enlem, true)
  })
}

async function posterYap(an: An, sehir: Sehir, d: { kisi: Kisi; t: Date; yz: number }) {
  await document.fonts.load('italic 300 80px "Cormorant Garamond"')
  await document.fonts.load('80px "Great Vibes"')
  const W = 1200
  const H = 1700
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#05060c')
  g.addColorStop(0.6, '#0b0e26')
  g.addColorStop(1, '#1f1330')
  x.fillStyle = g
  x.fillRect(0, 0, W, H)
  haritaCiz(x, W / 2, 610, 470, { yz: d.yz, enlem: d.kisi.enlem, an: d.t, kisi: d.kisi, etiketler: true })

  const tarih = isoGun(yerel(d.t, d.kisi.saatDilimi))
  x.textAlign = 'center'
  x.fillStyle = '#f7ede0'
  x.font = 'italic 300 92px "Cormorant Garamond", serif'
  x.fillText(tarihYazi(tarih), W / 2, 1245)
  x.font = '500 26px "JetBrains Mono Variable", monospace'
  x.fillStyle = 'rgba(243,196,124,0.9)'
  x.fillText(
    `${d.kisi.yerelSehir.toLocaleUpperCase('tr-TR')} · ${saatYazi(d.t, d.kisi.saatDilimi)} · ${derece(d.kisi.enlem, 'K', 'G')} ${derece(d.kisi.boylam, 'D', 'B')}`,
    W / 2,
    1305,
  )
  const soz = an === 'bugece' && sehir === 'ben' ? 'Bu gece, benim gökyüzüm.' : SOZ[an]
  x.font = 'italic 400 44px "Cormorant Garamond", serif'
  x.fillStyle = 'rgba(247,237,224,0.85)'
  x.fillText(soz, W / 2, 1400)
  x.font = '96px "Great Vibes", cursive'
  const isim = x.createLinearGradient(W * 0.3, 0, W * 0.7, 0)
  isim.addColorStop(0, '#ffdfae')
  isim.addColorStop(0.5, '#ec8f55')
  isim.addColorStop(1, '#f59fb4')
  x.fillStyle = isim
  x.fillText(`${sen.ad} & ${ben.ad}`, W / 2, 1540)

  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'))
  if (blob) await paylasVeyaIndir(blob, `gokyuzu-${tarih}-${d.kisi.yerelSehir.toLocaleLowerCase('tr-TR')}.png`, 'O gecenin gökyüzü')
}
