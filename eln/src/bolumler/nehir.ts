import { ICERIK } from '../icerik'
import { tarihYazi } from '../cekirdek/zaman'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { $, azHareket, belir, gorunurken, gsap, satirSatir, ScrollTrigger, tuvalOlcu } from './yardimci'

const { ben, sen, arkadas } = ICERIK

export function nehirHTML() {
  return /* html */ `
  <section id="nehir" class="bolum" data-bolum="III" data-ad="Bir Nehir" data-ruh="nehir">
    <div class="icerik-sutun nehir-izgara">
      <div class="bolum-bas">
        <p class="etiket"><span class="no">III</span>${tarihYazi(ICERIK.tanisma)}</p>
        <h2 class="baslik">Bizi bir <em>${arkadas}</em> buluşturdu.</h2>
        <p class="metin">Hikâyemiz bir bildirimle başladı. Ne bir tesadüf gibi göründü, ne de büyük bir an gibi. Sadece küçük, gri bir satır:</p>
      </div>
      <div class="sohbet cam" data-dom>
        <div class="sohbet-bas">
          <div class="uyeler"><i>${arkadas[0]}</i><i>${sen.ad[0]}</i><i>${ben.ad[0]}</i></div>
          <div><b>Grup</b><small>${arkadas}, ${sen.ad} ve diğerleri</small></div>
        </div>
        <div class="sohbet-govde">
          <span class="tarih-cip">${tarihYazi(ICERIK.tanisma, true)}</span>
          <p class="sistem"><b>${arkadas}</b>, <b>${ben.ad}</b>’yı gruba ekledi.</p>
          <span class="tepki" aria-label="bir kalp">♥</span>
          <div class="yaziyor" aria-hidden="true"><i></i><i></i><i></i></div>
        </div>
      </div>
    </div>

    <div class="nehir-sahne">
      <canvas class="nehir-tuval" aria-label="Hazar'dan Boğaz'a akan ışık nehri"></canvas>
    </div>

    <div class="icerik-sutun nehir-alt">
      <p class="satir">Sen oradaydın zaten; ${arkadas}’in arkadaşıydın. Ben o gruba “öylesine” girmiştim.</p>
      <p class="satir italik">Bazı şeyler öylesine başlar. <em>Sonra bütün hayatın olur.</em></p>
      <p class="metin">Nehirler denizleri birbirine bağlar. Hazar’dan yola çıkan bir kayık Volga’ya, oradan bir kanalla Don’a, Don’dan Azak’a ve Karadeniz’e, sonra da İstanbul Boğazı’na varabilir. Yaklaşık üç bin kilometrelik, tamamen sudan bir yol.</p>
      <p class="satir buyuk">Hazar’ı Boğaz’a nehirler bağlar.<br/><em>Beni sana da bir ${arkadas} bağladı.</em></p>
    </div>
  </section>`
}

// Hazar → Volga → kanal → Don → Azak → Karadeniz → Boğaz (stilize harita, 0..1 koordinat)
const YOL: [number, number, string][] = [
  [0.93, 0.8, `${sen.yerelSehir}`],
  [0.9, 0.42, 'Hazar'],
  [0.79, 0.16, 'Volga'],
  [0.66, 0.2, 'Kanal'],
  [0.56, 0.42, 'Don'],
  [0.45, 0.55, 'Azak'],
  [0.27, 0.66, 'Karadeniz'],
  [0.07, 0.8, `${ben.yerelSehir}`],
]

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}
function yolNokta(t: number, w: number, h: number) {
  const n = YOL.length - 1
  const f = Math.min(n - 1e-6, Math.max(0, t * n))
  const i = Math.floor(f)
  const u = f - i
  const p = (k: number) => YOL[Math.min(n, Math.max(0, k))]
  return {
    x: catmull(p(i - 1)[0], p(i)[0], p(i + 1)[0], p(i + 2)[0], u) * w,
    y: catmull(p(i - 1)[1], p(i)[1], p(i + 1)[1], p(i + 2)[1], u) * h,
  }
}

export function nehirKur() {
  const bolum = $('#nehir')
  const sohbet = $('.sohbet', bolum)
  satirSatir($('.baslik', bolum))
  belir($('.bolum-bas .metin', bolum))
  for (const el of bolum.querySelectorAll<HTMLElement>('.nehir-alt > *')) belir(el)

  // Bildirim anı
  const tl = gsap.timeline({ paused: true })
  tl.from(sohbet, { y: 40, opacity: 0, duration: 1, ease: 'expo.out' })
    .from($('.tarih-cip', sohbet), { opacity: 0, y: 8, duration: 0.6 }, '-=0.4')
    .from($('.sistem', sohbet), { opacity: 0, scale: 0.9, duration: 0.7, ease: 'back.out(2)', onStart: () => ses.bildirim() }, '+=0.4')
    .from($('.tepki', sohbet), { opacity: 0, scale: 0, duration: 0.6, ease: 'back.out(3)' }, '+=0.9')
    .from($('.yaziyor', sohbet), { opacity: 0, y: 6, duration: 0.5 }, '+=0.6')
  if (azHareket) tl.progress(1)
  ScrollTrigger.create({ trigger: sohbet, start: 'top 80%', once: true, onEnter: () => tl.play() })

  // Işık nehri
  const tuval = $<HTMLCanvasElement>('.nehir-tuval', bolum)
  let olcu = tuvalOlcu(tuval)
  window.addEventListener('resize', () => (olcu = tuvalOlcu(tuval)))
  const N = matchMedia('(pointer: coarse)').matches ? 260 : 420
  const parcaciklar = Array.from({ length: N }, () => ({
    t: Math.random(),
    hiz: 0.018 + Math.random() * 0.03,
    sap: (Math.random() - 0.5) * 2,
    boy: 0.6 + Math.random() * 1.8,
    faz: Math.random() * 6.28,
  }))
  let calis = false
  let son = performance.now()
  let dokunma = 0
  const ciz = (simdi: number) => {
    if (!calis) return
    const dt = Math.min(0.05, (simdi - son) / 1000)
    son = simdi
    const { x, w, h } = olcu
    x.globalCompositeOperation = 'source-over'
    x.fillStyle = 'rgba(5, 6, 12, 0.22)'
    x.fillRect(0, 0, w, h)

    // yol çizgisi (çok soluk)
    x.beginPath()
    for (let i = 0; i <= 120; i++) {
      const p = yolNokta(i / 120, w, h)
      i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)
    }
    x.strokeStyle = 'rgba(247, 237, 224, 0.05)'
    x.lineWidth = 1
    x.stroke()

    x.globalCompositeOperation = 'lighter'
    const genislik = Math.min(26, w * 0.035)
    for (const p of parcaciklar) {
      p.t += p.hiz * dt * (1 + dokunma * 3)
      if (p.t > 1) p.t -= 1
      const a = yolNokta(p.t, w, h)
      const b = yolNokta(Math.min(1, p.t + 0.004), w, h)
      const nx = -(b.y - a.y)
      const ny = b.x - a.x
      const nl = Math.hypot(nx, ny) || 1
      const sap = p.sap * genislik * (0.6 + 0.4 * Math.sin(simdi / 900 + p.faz))
      const px = a.x + (nx / nl) * sap
      const py = a.y + (ny / nl) * sap
      // Hazar'da turkuaz → Boğaz'da altın
      const r = Math.round(111 + (243 - 111) * p.t)
      const g = Math.round(214 + (196 - 214) * p.t)
      const bl = Math.round(208 + (124 - 208) * p.t)
      const kenar = Math.min(1, p.t * 12, (1 - p.t) * 12)
      x.fillStyle = `rgba(${r},${g},${bl},${0.55 * kenar})`
      x.beginPath()
      x.arc(px, py, p.boy, 0, Math.PI * 2)
      x.fill()
    }
    dokunma *= 0.96

    // uç noktalar ve etiketler
    x.globalCompositeOperation = 'source-over'
    x.font = '500 10px "JetBrains Mono Variable", monospace'
    x.textAlign = 'center'
    YOL.forEach(([ux, uy, ad], i) => {
      const uc = i === 0 || i === YOL.length - 1
      const px = ux * w
      const py = uy * h
      if (uc) {
        const g = x.createRadialGradient(px, py, 0, px, py, 26)
        g.addColorStop(0, i === 0 ? 'rgba(255,201,213,0.9)' : 'rgba(255,223,174,0.9)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        x.fillStyle = g
        x.beginPath()
        x.arc(px, py, 26, 0, Math.PI * 2)
        x.fill()
      }
      x.fillStyle = uc ? 'rgba(247,237,224,0.85)' : 'rgba(247,237,224,0.32)'
      x.fillText(ad.toLocaleUpperCase('tr-TR'), px, py + (uc ? 30 : -14))
    })
    requestAnimationFrame(ciz)
  }
  gorunurken(tuval, (acik) => {
    if (acik && !calis) {
      calis = true
      son = performance.now()
      requestAnimationFrame(ciz)
    } else if (!acik) calis = false
  })

  // Sır: akıntıya üç kez dokun
  let sayac = 0
  let sifirla = 0
  tuval.addEventListener('pointerdown', () => {
    dokunma = 1
    ses.nota(78 + sayac * 3, 0.035)
    sayac++
    clearTimeout(sifirla)
    sifirla = window.setTimeout(() => (sayac = 0), 1500)
    if (sayac >= 3) {
      sayac = 0
      sirBul('nehir')
    }
  })
}
