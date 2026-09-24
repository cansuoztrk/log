import { ICERIK } from '../icerik'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { type Anlik, sayi } from '../cekirdek/zaman'
import { $, azHareket, belir, gorunurken, satirSatir, titret, tuvalOlcu } from './yardimci'

const { sen } = ICERIK
const tamAd = sen.tamAd ?? sen.ad

export function narHTML(z: Anlik) {
  const n = z.tanisalGun + 1
  return /* html */ `
  <section id="nar" class="bolum" data-bolum="" data-ad="Adında Bir Nar">
    <div class="icerik-sutun nar-izgara">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Adında bir nar</p>
        <h2 class="baslik">${tamAd.replace(/nar/i, (m) => `<em>${m}</em>`)}</h2>
        <p class="metin">Adının içinde bir <strong>nar</strong> saklı. Nar senin ülkenin meyvesi, Azerbaycan’ın simgelerinden biri. Eski Türkçede “nâr” bir de <strong>ateş</strong> demek. Ateşler Ülkesi’nden gelen bir kızın adına bundan daha çok yakışan bir kelime olamazdı.</p>
      </div>
      <div class="nar-sahne" data-dom>
        <canvas class="nar-tuval" aria-label="Kırılmayı bekleyen bir nar"></canvas>
        <button class="dugme hayalet nar-dugme" type="button"><span>Narı kır</span></button>
        <p class="nar-sonuc" aria-live="polite">İçinden tam <b>${sayi(n)}</b> tane çıktı: tanıştığımızdan beri her gün için bir tane. <em>Yarın bir tane daha olacak.</em></p>
      </div>
    </div>
  </section>`
}

interface Tane {
  x: number
  y: number
  vx: number
  vy: number
  hx: number
  hy: number
  kx: number
  ky: number
  a: number
  gecikme: number
  parilti: number
}

/** Tek bir nar tanesi (önceden çizilip her karede kopyalanır) */
function taneDokusu(px: number) {
  const c = document.createElement('canvas')
  const s = Math.ceil(14 * px)
  c.width = c.height = s
  const x = c.getContext('2d')!
  x.scale(px, px)
  const g = x.createRadialGradient(5.5, 5, 0.5, 7, 7.5, 7)
  g.addColorStop(0, '#ffb3bd')
  g.addColorStop(0.25, '#f0304f')
  g.addColorStop(0.7, '#b10f2c')
  g.addColorStop(1, '#5c0616')
  x.fillStyle = g
  x.beginPath()
  x.ellipse(7, 7, 4.6, 5.8, 0, 0, Math.PI * 2)
  x.fill()
  x.fillStyle = 'rgba(255,255,255,0.75)'
  x.beginPath()
  x.ellipse(5.4, 4.6, 1.1, 1.6, -0.4, 0, Math.PI * 2)
  x.fill()
  return c
}

/** Yazıyı noktalara çevirir */
function yaziNoktalari(yazi: string, w: number, h: number, adet: number) {
  const c = document.createElement('canvas')
  c.width = Math.round(w)
  c.height = Math.round(h)
  const x = c.getContext('2d')!
  let boy = h * 0.95
  x.font = `${boy}px "Great Vibes", cursive`
  while (x.measureText(yazi).width > w * 0.94 && boy > 10) {
    boy -= 2
    x.font = `${boy}px "Great Vibes", cursive`
  }
  x.fillStyle = '#fff'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillText(yazi, w / 2, h / 2)
  const d = x.getImageData(0, 0, c.width, c.height).data
  const tum: [number, number][] = []
  for (let y = 0; y < c.height; y += 2) for (let xx = 0; xx < c.width; xx += 2) if (d[(y * c.width + xx) * 4 + 3] > 140) tum.push([xx, y])
  // eşit dağılım: karıştır, ilk "adet" kadarını al ama birbirine çok yakın olanları ele
  for (let i = tum.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[tum[i], tum[j]] = [tum[j], tum[i]]
  }
  const secilen: [number, number][] = []
  const minD = Math.sqrt((tum.length * 4) / adet) * 0.72
  for (const p of tum) {
    if (secilen.length >= adet) break
    if (secilen.every((q) => (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 > minD * minD)) secilen.push(p)
  }
  while (secilen.length < adet && tum.length) secilen.push(tum[secilen.length % tum.length])
  return secilen
}

function kalpNoktalari(cx: number, cy: number, s: number, adet: number) {
  const n: [number, number][] = []
  while (n.length < adet) {
    const x = (Math.random() - 0.5) * 2.6
    const y = (Math.random() - 0.5) * 2.6 + 0.2
    if ((x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0) n.push([cx + x * s, cy - (y - 0.15) * s])
  }
  return n
}

export function narKur(z: Anlik) {
  const bolum = $('#nar')
  satirSatir($('.baslik', bolum))
  belir($('.bolum-bas .metin', bolum))
  const tuval = $<HTMLCanvasElement>('.nar-tuval', bolum)
  const dugme = $<HTMLButtonElement>('.nar-dugme', bolum)
  const sonuc = $('.nar-sonuc', bolum)
  const N = Math.max(60, Math.min(900, z.tanisalGun + 1))
  void document.fonts.load('80px "Great Vibes"')

  let olcu = tuvalOlcu(tuval)
  let doku = taneDokusu(olcu.px)
  let durum: 'butun' | 'kiriliyor' | 'dokuluyor' | 'isim' = 'butun'
  let durumZaman = 0
  let sekil: 'isim' | 'kalp' = 'isim'
  let taneler: Tane[] = []

  const hedefler = () => {
    const { w, h } = olcu
    const isim = yaziNoktalari(tamAd, w * 0.94, h * 0.3, N).map(([x, y]) => [x + w * 0.03, y + h * 0.17] as [number, number])
    const kalp = kalpNoktalari(w / 2, h * 0.33, Math.min(w, h) * 0.17, N)
    return { isim, kalp }
  }

  const kir = () => {
    if (durum !== 'butun') return
    durum = 'kiriliyor'
    durumZaman = performance.now()
    ses.damla()
    window.setTimeout(() => ses.cin(), 700)
    titret([20, 50, 30])
    dugme.classList.add('gizle')
    const { w, h } = olcu
    const R = Math.min(w, h) * 0.2
    const { isim, kalp } = hedefler()
    taneler = Array.from({ length: N }, (_, i) => {
      const sol = i % 2 === 0
      const a = Math.random() * Math.PI - Math.PI / 2
      const r = Math.sqrt(Math.random()) * R * 0.78
      const x = w / 2 + (sol ? -1 : 1) * (Math.abs(Math.cos(a)) * r * 0.9 + 4)
      const y = h * 0.68 + Math.sin(a) * r
      return {
        x,
        y,
        vx: (sol ? -1 : 1) * (40 + Math.random() * 160),
        vy: -(220 + Math.random() * 320),
        hx: isim[i][0],
        hy: isim[i][1],
        kx: kalp[i][0],
        ky: kalp[i][1],
        a: Math.random() * Math.PI * 2,
        gecikme: 0.55 + Math.random() * 0.9,
        parilti: Math.random() * 10,
      }
    })
  }
  dugme.addEventListener('click', kir)
  tuval.addEventListener('click', () => {
    if (durum === 'butun') return kir()
    if (durum !== 'isim') return
    // tanelere dokununca: isim ↔ kalp
    sekil = sekil === 'isim' ? 'kalp' : 'isim'
    durum = 'dokuluyor'
    durumZaman = performance.now() - 900
    for (const t of taneler) {
      t.vx = (Math.random() - 0.5) * 300
      t.vy = -(Math.random() * 200)
      t.gecikme = 0.2 + Math.random() * 0.5
    }
    ses.nota(sekil === 'kalp' ? 86 : 81, 0.04)
    if (sekil === 'kalp') sirBul('nar')
  })

  const narCiz = (x: CanvasRenderingContext2D, cx: number, cy: number, R: number, t: number, ayrilma: number) => {
    // gölge
    x.fillStyle = 'rgba(0,0,0,0.35)'
    x.beginPath()
    x.ellipse(cx, cy + R * 1.02, R * (0.9 + ayrilma * 0.8), R * 0.14, 0, 0, Math.PI * 2)
    x.fill()
    const nefes = durum === 'butun' && !azHareket ? 1 + Math.sin(t * 2.2) * 0.012 : 1
    for (const yon of ayrilma > 0 ? [-1, 1] : [0]) {
      x.save()
      x.translate(cx + yon * ayrilma * R * 0.9, cy + ayrilma * R * 0.18)
      x.rotate(yon * ayrilma * 0.35)
      x.scale(nefes, nefes)
      if (yon !== 0) {
        x.beginPath()
        x.rect(yon < 0 ? -R * 1.3 : 0, -R * 1.5, R * 1.3, R * 3)
        x.clip()
      }
      // kabuk
      const g = x.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.05)
      g.addColorStop(0, '#ff7084')
      g.addColorStop(0.3, '#d8243f')
      g.addColorStop(0.72, '#951230')
      g.addColorStop(1, '#4f0717')
      x.fillStyle = g
      x.beginPath()
      x.ellipse(0, 0, R, R * 0.94, 0, 0, Math.PI * 2)
      x.fill()
      // taç
      {
        x.fillStyle = '#7d1528'
        x.beginPath()
        const ty = -R * 0.9
        x.moveTo(-R * 0.16, ty + 4)
        for (let k = 0; k <= 6; k++) {
          const px = -R * 0.2 + (k / 6) * R * 0.4
          x.lineTo(px, ty - (k % 2 ? R * 0.26 : R * 0.1))
        }
        x.lineTo(R * 0.16, ty + 4)
        x.closePath()
        x.fill()
      }
      if (yon !== 0) {
        // kesit: beyaz zar + taneler
        x.fillStyle = '#f2d7c6'
        x.beginPath()
        x.ellipse(0, 0, R * 0.86, R * 0.8, 0, 0, Math.PI * 2)
        x.fill()
        // ayçiçeği dizilimiyle sık, doğal görünen taneler
        for (let k = 0; k < 110; k++) {
          const a = k * 2.39996
          const r = Math.sqrt((k + 0.5) / 110) * R * 0.78
          x.drawImage(doku, Math.cos(a) * r - 6, Math.sin(a) * r * 0.93 - 6, 12, 12)
        }
        x.strokeStyle = 'rgba(242,215,198,0.9)'
        x.lineWidth = 1.5
        for (let k = 0; k < 4; k++) {
          x.beginPath()
          x.moveTo(0, 0)
          x.lineTo(Math.cos(k * 1.57 + 0.4) * R * 0.8, Math.sin(k * 1.57 + 0.4) * R * 0.75)
          x.stroke()
        }
      } else {
        // parlaklık ve benekler
        x.fillStyle = 'rgba(255,255,255,0.18)'
        x.beginPath()
        x.ellipse(-R * 0.38, -R * 0.42, R * 0.28, R * 0.16, -0.6, 0, Math.PI * 2)
        x.fill()
        x.fillStyle = 'rgba(255,210,200,0.12)'
        for (let k = 0; k < 40; k++) {
          const a = k * 2.1
          const r = ((k * 53) % 100) / 100
          x.fillRect(Math.cos(a) * r * R * 0.85, Math.sin(a) * r * R * 0.8, 1.4, 1.4)
        }
      }
      x.restore()
    }
  }

  let calis = false
  let son = performance.now()
  const kare = (simdi: number) => {
    if (!calis) return
    const dt = Math.min(0.05, (simdi - son) / 1000)
    son = simdi
    const t = simdi / 1000
    const { x, w, h } = olcu
    x.clearRect(0, 0, w, h)
    const R = Math.min(w, h) * 0.2
    const gecen = (simdi - durumZaman) / 1000
    const ayrilma = durum === 'butun' ? 0 : Math.min(1, gecen / 0.8) ** 0.6

    // arka ışık
    const hale = x.createRadialGradient(w / 2, h * 0.68, 0, w / 2, h * 0.68, R * 2.4)
    hale.addColorStop(0, 'rgba(240,60,90,0.22)')
    hale.addColorStop(1, 'rgba(240,60,90,0)')
    x.fillStyle = hale
    x.fillRect(0, 0, w, h)
    narCiz(x, w / 2, h * 0.68, R, t, ayrilma)

    if (durum === 'kiriliyor' && gecen > 0.15) durum = 'dokuluyor'
    if (durum === 'dokuluyor' || durum === 'isim') {
      let yerinde = 0
      for (const p of taneler) {
        const hx = sekil === 'isim' ? p.hx : p.kx
        const hy = sekil === 'isim' ? p.hy : p.ky
        if (gecen < p.gecikme) {
          p.vy += 520 * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.a += dt * 6
        } else {
          p.x += (hx - p.x) * Math.min(1, dt * 4.2)
          p.y += (hy - p.y) * Math.min(1, dt * 4.2)
          p.a += (0 - p.a) * dt * 2
          if (Math.abs(hx - p.x) + Math.abs(hy - p.y) < 1.5) yerinde++
        }
        const pari = durum === 'isim' ? 0.75 + 0.25 * Math.sin(t * 3 + p.parilti) : 1
        x.globalAlpha = pari
        x.save()
        x.translate(p.x, p.y)
        x.rotate(p.a)
        x.drawImage(doku, -6, -6, 12, 12)
        x.restore()
      }
      x.globalAlpha = 1
      if (durum === 'dokuluyor' && yerinde > taneler.length * 0.95) {
        durum = 'isim'
        sonuc.classList.add('gorundu')
      }
    }
    requestAnimationFrame(kare)
  }
  gorunurken(tuval, (a) => {
    if (a && !calis) {
      calis = true
      son = performance.now()
      requestAnimationFrame(kare)
    } else if (!a) calis = false
  })
  window.addEventListener('resize', () => {
    olcu = tuvalOlcu(tuval)
    doku = taneDokusu(olcu.px)
    if (taneler.length) {
      const { isim, kalp } = hedefler()
      taneler.forEach((p, i) => {
        ;[p.hx, p.hy] = isim[i]
        ;[p.kx, p.ky] = kalp[i]
      })
    }
  })
}
