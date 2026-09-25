import { ICERIK } from '../icerik'
import { karaMi } from '../veri/kara-coz'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { MESAFE, sayi } from '../cekirdek/zaman'
import { $, azHareket, belir, gsap, satirSatir, titret } from './yardimci'

const { ben, sen } = ICERIK

/** Haritanın çerçevesi: Balkanlar'dan Hazar'ın doğusuna */
const CERCEVE = { lon0: 24.5, lon1: 54.5, lat0: 34.5, lat1: 47.5 }
const ORTA_ENLEM = 41

interface Nokta {
  x: number
  y: number
  ev: { x: number; y: number }
}

export function sifirHTML() {
  return /* html */ `
  <section id="sifir" class="bolum" data-bolum="" data-ad="Sıfır Kilometre">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Sıfır kilometre</p>
        <h2 class="baslik">Aramızdaki yol, <em>parmaklarının arasında</em>.</h2>
        <p class="metin">İki ışık: biri ${ben.yerelSehir}, biri ${sen.yerelSehir}. İki parmağınla birbirlerine yaklaştır (ya da birini tutup ötekine götür). Yarı yolda bırakırsan yerlerine dönerler. Sonuna kadar götürürsen…</p>
      </div>
      <div class="sifir-sahne" data-dom>
        <canvas class="sifir-tuval" aria-label="${ben.yerelSehir} ile ${sen.yerelSehir} arasındaki harita; iki ışığı birbirine yaklaştır"></canvas>
        <p class="sifir-km" aria-live="polite"><b>${sayi(Math.round(MESAFE))}</b> km</p>
        <p class="sifir-ipucu">parmaklarınla yaklaştır</p>
      </div>
      <div class="sifir-son" hidden>
        <p class="satir italik">Bir gün, <em>sıfır kilometre</em>.</p>
        <p class="metin">Aynı şehir, aynı saat, aynı an. O gün ne diyeceğimi çok düşündüm; hiçbir şey demeyeceğim. Sadece sarılacağım. Uzun. Havalimanındaki herkes baksın.</p>
        <button class="dugme hayalet sifir-tekrar" type="button"><span>Işıkları yerlerine koy</span></button>
      </div>
    </div>
  </section>`
}

export function sifirKur() {
  const bolum = $('#sifir')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('.sifir-sahne', bolum)])
  const tuval = $<HTMLCanvasElement>('.sifir-tuval', bolum)
  const kmEl = $('.sifir-km b', bolum)
  const ipucu = $('.sifir-ipucu', bolum)
  const son = $('.sifir-son', bolum)

  let W = 0
  let H = 0
  let px = 1
  let harita: HTMLCanvasElement | null = null
  // eşit alanlı basit izdüşüm: boylam, orta enlemin kosinüsüyle daraltılır
  const kx = Math.cos((ORTA_ENLEM * Math.PI) / 180)
  let olcek = 1
  let ox = 0
  let oy = 0
  const tutulan = new Map<number, Nokta>() // parmak → tuttuğu ışık
  const noktalar: Nokta[] = []
  let ilkUzaklik = 1
  let birlesti = false
  let sonAdim = 0
  let calisiyor = false

  const izd = (enlem: number, boylam: number) => ({ x: ox + (boylam - CERCEVE.lon0) * kx * olcek, y: oy + (CERCEVE.lat1 - enlem) * olcek })

  /** Kıyı çizgileri noktalarla: kara noktalı, deniz boş (Karadeniz ve Hazar görünür) */
  const haritaCiz = () => {
    harita = document.createElement('canvas')
    harita.width = Math.round(W * px)
    harita.height = Math.round(H * px)
    const x = harita.getContext('2d')!
    x.scale(px, px)
    const adim = W < 500 ? 5 : 6
    for (let yy = adim / 2; yy < H; yy += adim) {
      for (let xx = adim / 2; xx < W; xx += adim) {
        // ekrandan coğrafyaya geri dönüş
        const boylam = CERCEVE.lon0 + (xx - ox) / olcek / kx
        const enlem = CERCEVE.lat1 - (yy - oy) / olcek
        if (boylam < CERCEVE.lon0 || boylam > CERCEVE.lon1 || enlem < CERCEVE.lat0 || enlem > CERCEVE.lat1) continue
        if (!karaMi(enlem, boylam)) continue
        const a = 0.18 + 0.1 * Math.random()
        x.fillStyle = `rgba(243,196,124,${a})`
        x.beginPath()
        x.arc(xx, yy, 1.05, 0, Math.PI * 2)
        x.fill()
      }
    }
  }

  const olc = () => {
    px = Math.min(window.devicePixelRatio || 1, 2)
    W = tuval.clientWidth
    H = tuval.clientHeight
    if (!W || !H) return false
    tuval.width = Math.round(W * px)
    tuval.height = Math.round(H * px)
    const genislik = (CERCEVE.lon1 - CERCEVE.lon0) * kx
    const yukseklik = CERCEVE.lat1 - CERCEVE.lat0
    olcek = Math.min(W / genislik, H / yukseklik)
    ox = (W - genislik * olcek) / 2
    oy = (H - yukseklik * olcek) / 2
    haritaCiz()
    const a = izd(ben.enlem, ben.boylam)
    const b = izd(sen.enlem, sen.boylam)
    if (!noktalar.length) noktalar.push({ ...a, ev: a }, { ...b, ev: b })
    else {
      noktalar[0].ev = a
      noktalar[1].ev = b
      if (!birlesti) noktalar.forEach((n) => ((n.x = n.ev.x), (n.y = n.ev.y)))
    }
    ilkUzaklik = Math.hypot(b.x - a.x, b.y - a.y)
    return true
  }

  const km = () => (birlesti ? 0 : Math.round((MESAFE * Math.hypot(noktalar[1].x - noktalar[0].x, noktalar[1].y - noktalar[0].y)) / ilkUzaklik))

  const isik = (x: CanvasRenderingContext2D, n: Nokta, renk: string, ad: string, t: number) => {
    const r = 7 + Math.sin(t * 2.2) * 1.2
    const g = x.createRadialGradient(n.x, n.y, 0, n.x, n.y, 46)
    g.addColorStop(0, `rgba(${renk},0.95)`)
    g.addColorStop(0.18, `rgba(${renk},0.45)`)
    g.addColorStop(1, `rgba(${renk},0)`)
    x.fillStyle = g
    x.beginPath()
    x.arc(n.x, n.y, 46, 0, Math.PI * 2)
    x.fill()
    x.fillStyle = '#fff'
    x.beginPath()
    x.arc(n.x, n.y, r * 0.5, 0, Math.PI * 2)
    x.fill()
    if (!birlesti) {
      x.font = 'italic 500 15px "Cormorant Garamond", serif'
      x.textAlign = 'center'
      x.fillStyle = 'rgba(247,237,224,0.85)'
      x.fillText(ad, n.x, n.y - 16)
    }
  }

  let parilti = 0 // birleşme anının ışığı
  const kare = (ms: number) => {
    if (!calisiyor) return
    const t = ms / 1000
    const x = tuval.getContext('2d')!
    x.setTransform(px, 0, 0, px, 0, 0)
    x.clearRect(0, 0, W, H)
    if (harita) x.drawImage(harita, 0, 0, W, H)
    const [a, b] = noktalar
    if (!birlesti) {
      // aradaki yay: yaklaştıkça kısalır ve parlar
      const d = Math.hypot(b.x - a.x, b.y - a.y)
      const yakinlik = 1 - Math.min(1, d / ilkUzaklik)
      x.strokeStyle = `rgba(245,159,180,${0.35 + 0.5 * yakinlik})`
      x.lineWidth = 1.2 + yakinlik * 1.5
      x.setLineDash([2, 6])
      x.lineDashOffset = -t * 18
      x.beginPath()
      x.moveTo(a.x, a.y)
      x.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - d * 0.28, b.x, b.y)
      x.stroke()
      x.setLineDash([])
      isik(x, a, '255,210,150', ben.ad, t)
      isik(x, b, '255,170,190', sen.ad, t + 1)
    } else {
      // tek ışık, kalp gibi atar
      const k = 1 + 0.12 * Math.max(0, Math.sin(t * 5)) ** 8
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const g = x.createRadialGradient(m.x, m.y, 0, m.x, m.y, 90 * k + parilti * 200)
      g.addColorStop(0, 'rgba(255,245,235,1)')
      g.addColorStop(0.15, `rgba(255,190,200,${0.6 + parilti * 0.3})`)
      g.addColorStop(1, 'rgba(245,159,180,0)')
      x.fillStyle = g
      x.beginPath()
      x.arc(m.x, m.y, 90 * k + parilti * 200, 0, Math.PI * 2)
      x.fill()
      x.fillStyle = '#fff'
      x.beginPath()
      x.arc(m.x, m.y, 5 * k, 0, Math.PI * 2)
      x.fill()
    }
    requestAnimationFrame(kare)
  }

  const kmYaz = () => {
    const k = km()
    kmEl.textContent = sayi(k)
    // her 150 km'de bir nota yükselir, telefon tıklar
    const adim = Math.floor((MESAFE - k) / 150)
    if (adim !== sonAdim) {
      if (adim > sonAdim) {
        ses.nota(62 + Math.min(adim, 12) * 2, 0.025)
        titret(5)
      }
      sonAdim = adim
    }
  }

  const birles = () => {
    birlesti = true
    tutulan.clear()
    const [a, b] = noktalar
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    gsap.to([a, b], { x: m.x, y: m.y, duration: 0.25, ease: 'power2.in' })
    kmEl.textContent = '0'
    ses.cin()
    ses.kalp(1)
    titret([40, 80, 40, 80, 200])
    window.dispatchEvent(new CustomEvent('kutla', { detail: 80 }))
    const p = { v: 1 }
    gsap.to(p, { v: 0, duration: 2.4, ease: 'power2.out', onUpdate: () => (parilti = p.v) })
    gsap.to(ipucu, { autoAlpha: 0, duration: 0.4 })
    son.hidden = false
    gsap.fromTo(son.children, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.25, delay: 0.6, ease: 'expo.out' })
    window.setTimeout(() => sirBul('sifir'), 1600)
  }

  const eveDon = () => {
    if (birlesti) return
    ses.vuus(0.8)
    for (const n of noktalar) gsap.to(n, { x: n.ev.x, y: n.ev.y, duration: azHareket ? 0.2 : 1.1, ease: 'elastic.out(1, 0.55)', onUpdate: kmYaz })
    if (km() < MESAFE * 0.8) {
      ipucu.textContent = 'Henüz değil. Ama her gün biraz daha.'
      gsap.fromTo(ipucu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 })
      window.setTimeout(() => (ipucu.textContent = 'parmaklarınla yaklaştır'), 3500)
    }
  }

  // ─── dokunma: her parmak en yakın ışığı tutar ───
  const yerel = (e: PointerEvent) => {
    const r = tuval.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  tuval.addEventListener('pointerdown', (e) => {
    if (birlesti) return
    const p = yerel(e)
    const bos = noktalar.filter((n) => ![...tutulan.values()].includes(n))
    let en: Nokta | null = null
    let enUzak = W < 500 ? 70 : 90
    for (const n of bos) {
      const d = Math.hypot(n.x - p.x, n.y - p.y)
      if (d < enUzak) {
        en = n
        enUzak = d
      }
    }
    if (!en) return
    e.preventDefault()
    ses.baslat()
    gsap.killTweensOf(en)
    tutulan.set(e.pointerId, en)
    try {
      tuval.setPointerCapture(e.pointerId)
    } catch {
      /* yok */
    }
    titret(8)
  })
  tuval.addEventListener('pointermove', (e) => {
    const n = tutulan.get(e.pointerId)
    if (!n || birlesti) return
    const p = yerel(e)
    n.x = Math.max(8, Math.min(W - 8, p.x))
    n.y = Math.max(8, Math.min(H - 8, p.y))
    kmYaz()
    const [a, b] = noktalar
    if (Math.hypot(b.x - a.x, b.y - a.y) < 22) birles()
  })
  const birak = (e: PointerEvent) => {
    if (!tutulan.delete(e.pointerId)) return
    if (!tutulan.size) eveDon()
  }
  tuval.addEventListener('pointerup', birak)
  tuval.addEventListener('pointercancel', birak)

  $('.sifir-tekrar', bolum).addEventListener('click', () => {
    birlesti = false
    sonAdim = 0
    gsap.to(son, { autoAlpha: 0, duration: 0.4, onComplete: () => (son.hidden = true) })
    gsap.to(ipucu, { autoAlpha: 1, duration: 0.4 })
    eveDon()
  })

  // görünürken çiz
  const io = new IntersectionObserver((k) => {
    const gorunur = k.some((x) => x.isIntersecting)
    if (gorunur && !calisiyor) {
      if (!W && !olc()) return
      calisiyor = true
      requestAnimationFrame(kare)
    } else if (!gorunur) calisiyor = false
  })
  io.observe(tuval)
  let sonGenislik = 0
  window.addEventListener('resize', () => {
    if (tuval.clientWidth === sonGenislik) return
    sonGenislik = tuval.clientWidth
    olc()
  })
}
