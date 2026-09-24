import { ICERIK, type Kisi } from '../icerik'
import { ayCiz } from '../cekirdek/ay-ciz'
import { sirBul } from '../cekirdek/sirlar'
import { ses } from '../cekirdek/ses'
import { AYLAR, ayEvresi, gokyuzu, gunesZamanlari, iki, sayi, saatYazi, simdi, yerel } from '../cekirdek/zaman'
import { $, belir, gorunurken, satirSatir, tuvalOlcu } from './yardimci'

const { ben, sen } = ICERIK

export function simdiHTML() {
  const pencere = (k: Kisi, kim: 'ben' | 'sen') => /* html */ `
    <figure class="pencere ${kim}" data-dom>
      <div class="cerceve"><canvas class="gok" aria-label="${k.yerelSehir} gökyüzü, şu an"></canvas></div>
      <figcaption>
        <span class="p-kisi">${k.ad} · ${k.yerelSehir}</span>
        <b class="p-saat">--:--</b>
        <span class="p-tarih"></span>
        <span class="p-gunes"></span>
      </figcaption>
    </figure>`
  return /* html */ `
  <section id="simdi" class="bolum" data-bolum="VIII" data-ad="Şu An">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no">VIII</span>Şu an · canlı</p>
        <h2 class="baslik">İki pencere, <em>tek gökyüzü</em>.</h2>
        <p class="metin">Bu iki pencere şu anı gösteriyor: güneş ve ay, iki şehirde tam şu an nerede duruyorsa orada. Her açtığında başka bir gökyüzü göreceksin.</p>
      </div>
      <div class="pencereler">
        ${pencere(ben, 'ben')}
        ${pencere(sen, 'sen')}
      </div>
      <p class="satir simdi-durum" aria-live="polite"></p>
      <p class="ay-bilgi"></p>
    </div>
  </section>`
}

/* ─── Gökyüzü çizimi ─── */

type Renk = [number, number, number]
const DURAKLAR: [number, Renk, Renk][] = [
  // güneş yüksekliği, tepe rengi, ufuk rengi
  [-18, [4, 6, 20], [14, 16, 42]],
  [-10, [8, 11, 38], [42, 30, 72]],
  [-4, [26, 30, 84], [236, 118, 110]],
  [2, [58, 78, 150], [255, 170, 120]],
  [12, [70, 118, 196], [236, 196, 160]],
  [40, [64, 130, 214], [178, 214, 245]],
]
function gokRengi(alt: number): [string, string] {
  let i = 0
  while (i < DURAKLAR.length - 2 && alt > DURAKLAR[i + 1][0]) i++
  const [a0, t0, u0] = DURAKLAR[i]
  const [a1, t1, u1] = DURAKLAR[i + 1]
  const k = Math.min(1, Math.max(0, (alt - a0) / (a1 - a0)))
  const karis = (x: Renk, y: Renk) => `rgb(${x.map((v, j) => Math.round(v + (y[j] - v) * k)).join(',')})`
  return [karis(t0, t1), karis(u0, u1)]
}

// Sabit rastgele yıldızlar
const YILDIZLAR = Array.from({ length: 90 }, (_, i) => {
  const s = Math.sin(i * 12.9898) * 43758.5453
  const r = s - Math.floor(s)
  const s2 = Math.sin(i * 78.233) * 12543.1
  return { x: r, y: (s2 - Math.floor(s2)) * 0.7, b: 0.3 + ((i * 7) % 10) / 14 }
})

function siluet(x: CanvasRenderingContext2D, w: number, h: number, kim: 'ben' | 'sen', gece: number) {
  const zemin = h * 0.86
  x.fillStyle = `rgb(${Math.round(10 + 20 * (1 - gece))},${Math.round(11 + 20 * (1 - gece))},${Math.round(28 + 26 * (1 - gece))})`
  x.beginPath()
  x.moveTo(0, h)
  x.lineTo(0, zemin)
  if (kim === 'ben') {
    // İstanbul: kubbeler ve minareler
    const kubbe = (cx: number, r: number) => {
      x.lineTo(cx - r, zemin)
      x.arc(cx, zemin, r, Math.PI, 0)
    }
    const minare = (cx: number, yuk: number) => {
      x.lineTo(cx - 2, zemin)
      x.lineTo(cx - 2, zemin - yuk)
      x.lineTo(cx, zemin - yuk - 12)
      x.lineTo(cx + 2, zemin - yuk)
      x.lineTo(cx + 2, zemin)
    }
    minare(w * 0.18, h * 0.16)
    kubbe(w * 0.28, h * 0.07)
    kubbe(w * 0.38, h * 0.045)
    minare(w * 0.46, h * 0.18)
    kubbe(w * 0.58, h * 0.1)
    minare(w * 0.7, h * 0.15)
    // Galata
    x.lineTo(w * 0.82, zemin)
    x.lineTo(w * 0.82, zemin - h * 0.13)
    x.lineTo(w * 0.835, zemin - h * 0.19)
    x.lineTo(w * 0.85, zemin - h * 0.13)
    x.lineTo(w * 0.85, zemin)
  } else {
    // Bakı: Qız Qalası + Alev Kuleleri
    x.lineTo(w * 0.14, zemin)
    x.lineTo(w * 0.14, zemin - h * 0.12)
    x.lineTo(w * 0.24, zemin - h * 0.12)
    x.lineTo(w * 0.24, zemin)
    const alev = (cx: number, yuk: number, gen: number) => {
      x.lineTo(cx - gen / 2, zemin)
      x.bezierCurveTo(cx - gen * 0.6, zemin - yuk * 0.45, cx - gen * 0.2, zemin - yuk * 0.8, cx + gen * 0.05, zemin - yuk)
      x.bezierCurveTo(cx + gen * 0.35, zemin - yuk * 0.7, cx + gen * 0.6, zemin - yuk * 0.4, cx + gen / 2, zemin)
    }
    alev(w * 0.6, h * 0.26, w * 0.09)
    alev(w * 0.7, h * 0.33, w * 0.1)
    alev(w * 0.8, h * 0.24, w * 0.085)
  }
  x.lineTo(w, zemin)
  x.lineTo(w, h)
  x.closePath()
  x.fill()
  // pencere ışıkları
  if (gece > 0.3) {
    x.fillStyle = kim === 'sen' ? `rgba(255,150,80,${0.5 * gece})` : `rgba(255,210,150,${0.5 * gece})`
    for (let i = 0; i < 40; i++) {
      const px = ((i * 37) % 100) / 100
      const py = ((i * 53) % 100) / 100
      x.fillRect(px * w, zemin + 4 + py * (h - zemin - 8), 1.5, 1.5)
    }
  }
}

function gokCiz(tuval: HTMLCanvasElement, k: Kisi, kim: 'ben' | 'sen', an: Date, konum: { ay?: { x: number; y: number; r: number } }) {
  const { x, w, h } = tuvalOlcu(tuval)
  const g = gokyuzu(an, k)
  const [tepe, ufuk] = gokRengi(g.gunesYukseklik)
  const grad = x.createLinearGradient(0, 0, 0, h * 0.86)
  grad.addColorStop(0, tepe)
  grad.addColorStop(1, ufuk)
  x.fillStyle = grad
  x.fillRect(0, 0, w, h)

  const gece = Math.min(1, Math.max(0, (-g.gunesYukseklik - 2) / 12))
  // yıldızlar
  if (gece > 0) {
    for (const y of YILDIZLAR) {
      x.fillStyle = `rgba(255,255,255,${y.b * gece})`
      x.fillRect(y.x * w, y.y * h, 1.2, 1.2)
    }
  }
  // gökyüzündeki konum: doğu (90°) solda... pencere güneye bakıyor: doğu solda, batı sağda
  const yer = (azimut: number, yukseklik: number) => ({
    x: ((azimut - 60) / 240) * w,
    y: h * 0.86 - (yukseklik / 70) * h * 0.8,
  })
  // güneş
  if (g.gunesYukseklik > -6) {
    const p = yer(g.gunesAzimut, g.gunesYukseklik)
    const r = Math.min(w, h) * 0.05
    const hale = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 7)
    hale.addColorStop(0, 'rgba(255,236,200,0.9)')
    hale.addColorStop(0.2, 'rgba(255,200,140,0.35)')
    hale.addColorStop(1, 'rgba(255,180,120,0)')
    x.fillStyle = hale
    x.beginPath()
    x.arc(p.x, p.y, r * 7, 0, Math.PI * 2)
    x.fill()
    x.fillStyle = '#fff6e6'
    x.beginPath()
    x.arc(p.x, p.y, r, 0, Math.PI * 2)
    x.fill()
  }
  // ay
  konum.ay = undefined
  if (g.ayYukseklik > -3) {
    const p = yer(g.ayAzimut, g.ayYukseklik)
    const r = Math.min(w, h) * 0.045
    const e = ayEvresi(an)
    const hale = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5)
    hale.addColorStop(0, `rgba(200,215,255,${0.3 * e.oran * (0.3 + 0.7 * gece)})`)
    hale.addColorStop(1, 'rgba(200,215,255,0)')
    x.fillStyle = hale
    x.beginPath()
    x.arc(p.x, p.y, r * 5, 0, Math.PI * 2)
    x.fill()
    ayCiz(x, p.x, p.y, r, e.evre, 0.45 + 0.55 * gece)
    konum.ay = { x: p.x, y: p.y, r }
  }
  siluet(x, w, h, kim, gece)
  return g
}

/** Şu anın durumuna göre iki şehir arasında bir cümle */
function durumCumlesi(an: Date) {
  const gb = gokyuzu(an, sen)
  const gi = gokyuzu(an, ben)
  const tb = yerel(an, sen.saatDilimi)
  const ti = yerel(an, ben.saatDilimi)
  const zi = gunesZamanlari(an, ben)
  const dk = (d: Date) => Math.max(1, Math.round((d.getTime() - an.getTime()) / 60000))
  if (tb.gun !== ti.gun) return `Sen çoktan <em>yarındasın</em>; ben hâlâ bugündeyim. Yarına vardığımda yine seni bulacağım.`
  if (tb.saat >= 1 && tb.saat < 5) return `Senin orada saat ${iki(tb.saat)}:${iki(tb.dakika)}. <em>Uyu artık, gözəlim.</em> Ben nöbetteyim.`
  if (gb.ayYukseklik > 0 && gi.ayYukseklik > 0 && gb.gunesYukseklik < -4 && gi.gunesYukseklik < -4)
    return `Şu an ay <em>ikimizin de</em> gökyüzünde. Pencereden bak: aynı aya bakıyoruz.`
  if (gb.gunesYukseklik < -0.8 && gi.gunesYukseklik > -0.8 && tb.saat > 12)
    return `Senin güneşin battı; benimki ${dk(zi.sunset)} dakika daha burada. O ışığı <em>sana saklıyorum</em>.`
  if (gb.gunesYukseklik > -0.8 && gi.gunesYukseklik < -0.8 && tb.saat < 12)
    return `Sende gün doğdu, bende hâlâ gece. Işık yolda; ${dk(zi.sunrise)} dakika sonra, <em>seni öptükten sonra</em> bana gelecek.`
  if (gb.gunesYukseklik > 0 && gi.gunesYukseklik > 0) return `İkimizde de gündüz. Aynı güneşin altındayız; sen sadece <em>biraz daha doğudasın</em>.`
  if (gb.gunesYukseklik < -6 && gi.gunesYukseklik < -6) return `İkimizde de gece. Yıldızlar <em>ortak</em>; birini seç, ben de ona bakayım.`
  return `Aynı gökyüzü, iki pencere. <em>Biri sende, biri bende.</em>`
}

export function simdiKur() {
  const bolum = $('#simdi')
  satirSatir($('.baslik', bolum))
  belir($('.bolum-bas .metin', bolum))
  belir(Array.from(bolum.querySelectorAll('.pencere')))
  const durum = $('.simdi-durum', bolum)
  const ayBilgi = $('.ay-bilgi', bolum)
  const pencereler = (['ben', 'sen'] as const).map((kim) => {
    const el = $(`.pencere.${kim}`, bolum)
    return { kim, k: kim === 'ben' ? ben : sen, el, tuval: $<HTMLCanvasElement>('canvas', el), konum: {} as { ay?: { x: number; y: number; r: number } } }
  })

  const ciz = () => {
    const an = simdi()
    for (const p of pencereler) {
      gokCiz(p.tuval, p.k, p.kim, an, p.konum)
      const t = yerel(an, p.k.saatDilimi)
      const z = gunesZamanlari(an, p.k)
      $('.p-saat', p.el).textContent = saatYazi(an, p.k.saatDilimi)
      $('.p-tarih', p.el).textContent = `${t.gun} ${AYLAR[t.ay - 1]}`
      $('.p-gunes', p.el).textContent = `☀ ${saatYazi(z.sunrise, p.k.saatDilimi)} · ☾ ${saatYazi(z.sunset, p.k.saatDilimi)}`
    }
    durum.innerHTML = durumCumlesi(an)
    const e = ayEvresi(an)
    ayBilgi.innerHTML = `Bu gece ay <b>%${sayi(e.oran * 100)}</b> dolu · ${e.ad}${
      e.ad === 'Dolunay' ? '' : ` · dolunaya <b>${sayi(Math.max(1, Math.round(e.dolunayaGun)))}</b> gün`
    } · ikimiz de aynı ayı görüyoruz`
  }
  let zamanlayici = 0
  gorunurken(bolum, (acik) => {
    window.clearInterval(zamanlayici)
    if (acik) {
      ciz()
      zamanlayici = window.setInterval(ciz, 15000)
    }
  })
  window.addEventListener('resize', () => ciz())

  // Sır: aya üç kez dokun
  let sayac = 0
  let sifirla = 0
  for (const p of pencereler) {
    p.tuval.addEventListener('pointerdown', (e) => {
      const ay = p.konum.ay
      if (!ay) return
      const r = p.tuval.getBoundingClientRect()
      const d = Math.hypot(e.clientX - r.left - ay.x, e.clientY - r.top - ay.y)
      if (d > ay.r * 2.5) return
      sayac++
      ses.nota(81 + sayac * 2, 0.035)
      clearTimeout(sifirla)
      sifirla = window.setTimeout(() => (sayac = 0), 2000)
      if (sayac >= 3) {
        sayac = 0
        sirBul('ay')
      }
    })
  }
}
