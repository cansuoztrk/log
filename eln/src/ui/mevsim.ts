import { sirBul } from '../cekirdek/sirlar'
import { ses } from '../cekirdek/ses'
import { azHareket } from '../bolumler/yardimci'
import { simdi } from '../cekirdek/zaman'

/**
 * Mevsime göre çok hafif süzülen parçacıklar (kış: kar, ilkbahar: yaprak, yaz: ateş böceği,
 * sonbahar: yaprak) + arada bir kayan yıldız. Kayan yıldızı yakalayan dilek tutar.
 */
type Tur = 'kar' | 'cicek' | 'bocek' | 'yaprak'

interface Parca {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  a: number
  d: number
  f: number
}

interface Kalp {
  x: number
  y: number
  vy: number
  s: number
  a: number
  f: number
  renk: string
}

interface Emoji {
  x: number
  y: number
  vy: number
  s: number
  r: number
  vr: number
}

export function mevsimKur(tuval: HTMLCanvasElement) {
  const ay = simdi().getMonth() + 1
  const tur: Tur = ay === 12 || ay <= 2 ? 'kar' : ay <= 5 ? 'cicek' : ay <= 8 ? 'bocek' : 'yaprak'
  const x = tuval.getContext('2d')!
  let w = 0
  let h = 0
  const px = Math.min(1.5, window.devicePixelRatio || 1)
  const olc = () => {
    w = innerWidth
    h = innerHeight
    tuval.width = w * px
    tuval.height = h * px
    x.setTransform(px, 0, 0, px, 0, 0)
  }
  olc()
  window.addEventListener('resize', olc)

  const N = azHareket ? 0 : tur === 'kar' ? 34 : 14
  const yeni = (ilk = false): Parca => ({
    x: Math.random() * w,
    y: ilk ? Math.random() * h : -20,
    vx: (Math.random() - 0.5) * 12,
    vy: tur === 'bocek' ? (Math.random() - 0.5) * 8 : 10 + Math.random() * 18,
    r: tur === 'kar' ? 0.8 + Math.random() * 1.8 : 3 + Math.random() * 3.5,
    a: Math.random() * Math.PI * 2,
    d: (Math.random() - 0.5) * 1.5,
    f: Math.random() * 10,
  })
  const parcalar = Array.from({ length: N }, () => yeni(true))
  const kalpler: Kalp[] = []
  const emojiler: Emoji[] = []
  const gulucuk = (adet = 60) => {
    for (let i = 0; i < adet; i++)
      emojiler.push({ x: Math.random() * w, y: -40 - Math.random() * h * 0.8, vy: 90 + Math.random() * 140, s: 16 + Math.random() * 20, r: (Math.random() - 0.5) * 0.6, vr: (Math.random() - 0.5) * 1.5 })
  }
  window.addEventListener('gulucuk', () => gulucuk())

  // kayan yıldız
  let yildiz: { x: number; y: number; vx: number; vy: number; t: number } | null = null
  let sonrakiYildiz = performance.now() + 25000 + Math.random() * 40000
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (!yildiz) return
      if (Math.hypot(e.clientX - yildiz.x, e.clientY - yildiz.y) < 90) {
        ses.cin()
        sirBul('yildiz')
        yildiz.t = 99
      }
    },
    { passive: true },
  )

  let carpan = 1
  let son = performance.now()
  const ciz = (t: number) => {
    const dt = Math.min(0.05, (t - son) / 1000)
    son = t
    x.clearRect(0, 0, w, h)
    if (!document.hidden) {
      for (const p of parcalar) {
        p.f += dt
        if (tur === 'bocek') {
          p.x += (p.vx + Math.sin(p.f * 0.7) * 8) * dt
          p.y += (p.vy + Math.cos(p.f * 0.5) * 6) * dt
          if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) Object.assign(p, yeni(true))
          const a = Math.max(0, Math.sin(p.f * 1.3)) ** 2 * 0.8 * carpan
          const g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3)
          g.addColorStop(0, `rgba(255,236,150,${a})`)
          g.addColorStop(1, 'rgba(255,236,150,0)')
          x.fillStyle = g
          x.beginPath()
          x.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2)
          x.fill()
          continue
        }
        p.x += (p.vx + Math.sin(p.f) * 14) * dt
        p.y += p.vy * dt
        p.a += p.d * dt
        if (p.y > h + 20) Object.assign(p, yeni())
        x.save()
        x.translate(p.x, p.y)
        x.rotate(p.a)
        if (tur === 'kar') {
          x.fillStyle = `rgba(255,255,255,${0.5 * carpan})`
          x.beginPath()
          x.arc(0, 0, p.r, 0, Math.PI * 2)
          x.fill()
        } else {
          x.fillStyle = tur === 'cicek' ? `rgba(255,190,205,${0.45 * carpan})` : `rgba(236,143,85,${0.4 * carpan})`
          x.beginPath()
          x.ellipse(0, 0, p.r, p.r * (tur === 'cicek' ? 0.62 : 0.45), 0, 0, Math.PI * 2)
          x.fill()
        }
        x.restore()
      }

      // kutlama kalpleri
      for (let i = kalpler.length - 1; i >= 0; i--) {
        const k = kalpler[i]
        k.f += dt
        k.y += k.vy * dt
        k.x += Math.sin(k.f * 2) * 20 * dt
        k.a = Math.min(1, k.a + dt * 2) * (k.y < h * 0.2 ? k.y / (h * 0.2) : 1)
        if (k.y < -30) {
          kalpler.splice(i, 1)
          continue
        }
        x.save()
        x.translate(k.x, k.y)
        x.scale(k.s, k.s)
        x.fillStyle = k.renk.replace('A', String(k.a))
        x.beginPath()
        x.moveTo(0, 4)
        x.bezierCurveTo(-8, -3, -4, -10, 0, -5)
        x.bezierCurveTo(4, -10, 8, -3, 0, 4)
        x.fill()
        x.restore()
      }

      // ☺️ yağmuru
      for (let i = emojiler.length - 1; i >= 0; i--) {
        const e = emojiler[i]
        e.y += e.vy * dt
        e.r += e.vr * dt
        if (e.y > h + 40) {
          emojiler.splice(i, 1)
          continue
        }
        x.save()
        x.translate(e.x, e.y)
        x.rotate(e.r)
        x.font = `${e.s}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
        x.textAlign = 'center'
        x.textBaseline = 'middle'
        x.fillText('☺️', 0, 0)
        x.restore()
      }

      // kayan yıldız
      if (!yildiz && t > sonrakiYildiz && !azHareket) {
        const soldan = Math.random() < 0.5
        yildiz = { x: soldan ? Math.random() * w * 0.4 : w * (0.6 + Math.random() * 0.4), y: Math.random() * h * 0.35, vx: (soldan ? 1 : -1) * (650 + Math.random() * 300), vy: 220 + Math.random() * 120, t: 0 }
        sonrakiYildiz = t + 45000 + Math.random() * 60000
      }
      if (yildiz) {
        yildiz.t += dt
        yildiz.x += yildiz.vx * dt
        yildiz.y += yildiz.vy * dt
        const a = Math.max(0, 1 - yildiz.t / 1.4)
        const kx = yildiz.x - yildiz.vx * 0.16
        const ky = yildiz.y - yildiz.vy * 0.16
        const g = x.createLinearGradient(kx, ky, yildiz.x, yildiz.y)
        g.addColorStop(0, 'rgba(255,255,255,0)')
        g.addColorStop(1, `rgba(255,244,225,${a})`)
        x.strokeStyle = g
        x.lineWidth = 1.6
        x.beginPath()
        x.moveTo(kx, ky)
        x.lineTo(yildiz.x, yildiz.y)
        x.stroke()
        if (yildiz.t > 1.4) yildiz = null
      }
    }
    requestAnimationFrame(ciz)
  }
  requestAnimationFrame(ciz)

  /** Özel günlerde yükselen kalpler */
  const kutla = (adet = 70) => {
    for (let i = 0; i < adet; i++)
      kalpler.push({
        x: Math.random() * w,
        y: h + Math.random() * h * 0.6,
        vy: -(60 + Math.random() * 90),
        s: 1 + Math.random() * 1.8,
        a: 0,
        f: Math.random() * 6,
        renk: Math.random() < 0.5 ? 'rgba(245,159,180,A)' : 'rgba(243,196,124,A)',
      })
  }
  // herhangi bir bölüm kalp yağdırmak isterse: window.dispatchEvent(new CustomEvent('kutla', { detail: 30 }))
  window.addEventListener('kutla', (e) => kutla((e as CustomEvent<number | undefined>).detail))

  return {
    /** 3D sahnelerde parçacıklar biraz daha silik olsun */
    silik: (v: number) => (carpan = v),
    gulucuk,
    kutla,
  }
}
