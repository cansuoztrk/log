import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { type Anlik, gunFarki, sayi } from '../cekirdek/zaman'
import { $, azHareket, belir, satirSatir, titret } from './yardimci'

/**
 * SARILMA KAVANOZU — "biz" olduğumuzdan beri ayrı geçen her gün için bir sarılma borcu.
 * Hepsi bir cam kavanozda küçük kalpler olarak birikir; bugünkü kalp, bölüme ilk gelişte yukarıdan düşer.
 * İlk buluşma günü gelince borç kapanır. (Gerçek fizik: yerçekimi, çarpışma; dokununca sallanır.)
 */
const RENKLER = ['#f59fb4', '#ffc9d5', '#e8577a', '#f3c47c', '#ff8fa3', '#ffdfae']

interface Kalp {
  x: number
  y: number
  ox: number
  oy: number
  r: number
  a: number
  renk: string
}

function borc(z: Anlik) {
  const bulusma = ICERIK.ilkBulusma?.slice(0, 10)
  if (bulusma && z.bugun >= bulusma) return { n: Math.max(0, gunFarki(ICERIK.sevgili, bulusma)), odendi: true }
  return { n: Math.max(1, z.sevgiliGun + 1), odendi: false }
}

export function kavanozHTML(z: Anlik) {
  const { n, odendi } = borc(z)
  return /* html */ `
  <section id="kavanoz" class="bolum" data-bolum="" data-ad="Sarılma Kavanozu">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Sarılma kavanozu</p>
        <h2 class="baslik">Sana borçlu olduğum <em>sarılmalar</em>.</h2>
        <p class="metin">“Biz” olduğumuz günden beri ayrı geçen her gün için sana bir sarılma borçlanıyorum. Hepsi bu kavanozda duruyor; her gün bir tane daha düşüyor. İlk buluştuğumuz gün hepsini ödeyeceğim. Tek tek. Faiziyle.</p>
      </div>
      <div class="kavanoz" data-dom>
        <canvas class="kavanoz-tuval" aria-label="İçinde ${n} kalp olan bir cam kavanoz. Dokununca sallanır."></canvas>
        <p class="kavanoz-sayi"><b>${sayi(n)}</b> sarılma ${odendi ? 'ödendi 🤍' : 'birikti'}</p>
        <p class="kavanoz-alt el">${odendi ? 'Borç kapandı. Ama ben ödemeye devam edeceğim.' : 'Salla istersen. Ben de her gün sallıyorum: “Ne zaman?” diye.'}</p>
      </div>
    </div>
  </section>`
}

export function kavanozKur(z: Anlik) {
  const bolum = $('#kavanoz')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('.kavanoz', bolum)])
  const tuval = $<HTMLCanvasElement>('.kavanoz-tuval', bolum)
  const altYazi = $('.kavanoz-alt', bolum)
  const { n } = borc(z)
  const bugunDussun = oku<string>('kavanozGun', '') !== z.bugun
  let W = 0
  let H = 0
  let px = 1
  let kalpler: Kalp[] = []
  let calisiyor = false
  let gorunur = false
  let sakin = 0
  let sallama = 0
  let dustu = false

  // kavanozun iç sınırları (tuval oranına göre)
  const ic = () => ({ L: W * 0.17, R: W * 0.83, T: H * 0.2, B: H * 0.92, k: W * 0.13 })

  const kur = () => {
    const r = tuval.getBoundingClientRect()
    if (!r.width) return false
    px = Math.min(window.devicePixelRatio || 1, 2)
    W = r.width
    H = r.height
    tuval.width = Math.round(W * px)
    tuval.height = Math.round(H * px)
    const { L, R, T, B } = ic()
    const alan = (R - L) * (B - T)
    const yaricap = Math.max(3.5, Math.min(11, Math.sqrt((alan * 0.62) / (Math.PI * Math.max(n, 1))) * 0.92))
    kalpler = []
    // kalpler alttan yukarı gevşek bir ızgaraya dizilir, sonra fizik oturtur
    const sutun = Math.max(1, Math.floor((R - L) / (yaricap * 2.05)))
    const eksi = bugunDussun && !dustu ? 1 : 0
    for (let i = 0; i < n - eksi; i++) {
      const c = i % sutun
      const s = Math.floor(i / sutun)
      const x = L + yaricap + c * yaricap * 2.05 + (s % 2 ? yaricap : 0) * 0.5 + (Math.sin(i * 12.9) * yaricap) / 3
      const y = B - yaricap - s * yaricap * 1.9
      kalpler.push({ x, y, ox: x, oy: y, r: yaricap, a: Math.sin(i * 7.7) * 0.6, renk: RENKLER[i % RENKLER.length] })
    }
    return true
  }

  const bugunkuDussun = () => {
    if (dustu || !bugunDussun) return
    dustu = true
    const { L, R, T } = ic()
    const r = kalpler[0]?.r ?? 8
    const x = (L + R) / 2
    kalpler.push({ x, y: T - H * 0.12, ox: x, oy: T - H * 0.12, r, a: 0, renk: '#e8577a' })
    yaz('kavanozGun', z.bugun)
    window.setTimeout(() => {
      ses.damla()
      titret(12)
      altYazi.textContent = 'Bugünkü de düştü. Yarın bir tane daha.'
    }, 700)
    uyan()
  }

  // ─── fizik (konum tabanlı: basit, sağlam) ───
  const adim = (dt: number) => {
    const { L, R, T, B, k } = ic()
    const g = 1400 * dt * dt
    let hiz = 0
    for (const p of kalpler) {
      const vx = (p.x - p.ox) * 0.985
      const vy = (p.y - p.oy) * 0.985
      p.ox = p.x
      p.oy = p.y
      p.x += vx
      p.y += vy + g
      hiz = Math.max(hiz, Math.abs(vx) + Math.abs(vy))
    }
    // çarpışmalar: ızgara ile komşu arama
    for (let tur = 0; tur < 3; tur++) {
      const hucre = (kalpler[0]?.r ?? 8) * 2
      const izgara = new Map<number, Kalp[]>()
      for (const p of kalpler) {
        const key = Math.floor(p.x / hucre) * 1000 + Math.floor(p.y / hucre)
        const l = izgara.get(key)
        if (l) l.push(p)
        else izgara.set(key, [p])
      }
      for (const p of kalpler) {
        const cx = Math.floor(p.x / hucre)
        const cy = Math.floor(p.y / hucre)
        for (let dx = -1; dx <= 1; dx++)
          for (let dy = -1; dy <= 1; dy++) {
            const l = izgara.get((cx + dx) * 1000 + cy + dy)
            if (!l) continue
            for (const q of l) {
              if (q === p) continue
              const ax = q.x - p.x
              const ay = q.y - p.y
              const d2 = ax * ax + ay * ay
              const m = p.r + q.r
              if (d2 > 0 && d2 < m * m) {
                const d = Math.sqrt(d2)
                const f = ((m - d) / d) * 0.5
                p.x -= ax * f
                p.y -= ay * f
                q.x += ax * f
                q.y += ay * f
              }
            }
          }
      }
      // cam duvarlar, kapak ve yuvarlak dip (bugünkü kalp kapaktan girene kadar tavan yok)
      for (const p of kalpler) {
        if (p.y < T + p.r && p.oy >= T) p.y = T + p.r
        if (p.x < L + p.r) p.x = L + p.r
        if (p.x > R - p.r) p.x = R - p.r
        if (p.y > B - p.r) p.y = B - p.r
        for (const [kx, yon] of [
          [L + k, -1],
          [R - k, 1],
        ] as const) {
          if ((yon < 0 ? p.x < kx : p.x > kx) && p.y > B - k) {
            const ax = p.x - kx
            const ay = p.y - (B - k)
            const d = Math.hypot(ax, ay)
            if (d > k - p.r) {
              p.x = kx + (ax / d) * (k - p.r)
              p.y = B - k + (ay / d) * (k - p.r)
            }
          }
        }
      }
    }
    return hiz
  }

  const kalpCiz = (c: CanvasRenderingContext2D, p: Kalp) => {
    c.save()
    c.translate(p.x, p.y)
    c.rotate(p.a)
    const s = p.r / 10
    c.scale(s, s)
    c.beginPath()
    c.moveTo(0, 6)
    c.bezierCurveTo(-12, -2, -8, -12, 0, -5)
    c.bezierCurveTo(8, -12, 12, -2, 0, 6)
    c.fillStyle = p.renk
    c.fill()
    c.fillStyle = 'rgba(255,255,255,0.35)'
    c.beginPath()
    c.ellipse(-4, -5, 2.2, 1.4, -0.6, 0, Math.PI * 2)
    c.fill()
    c.restore()
  }

  const ciz = () => {
    const c = tuval.getContext('2d')!
    c.setTransform(px, 0, 0, px, 0, 0)
    c.clearRect(0, 0, W, H)
    const { L, R, T, B, k } = ic()
    // kavanozun arkası (cam)
    c.beginPath()
    c.moveTo(L - 6, T - H * 0.02)
    c.lineTo(L - 6, B - k)
    c.quadraticCurveTo(L - 6, B + 6, L + k, B + 6)
    c.lineTo(R - k, B + 6)
    c.quadraticCurveTo(R + 6, B + 6, R + 6, B - k)
    c.lineTo(R + 6, T - H * 0.02)
    c.fillStyle = 'rgba(200, 220, 255, 0.06)'
    c.fill()
    for (const p of kalpler) kalpCiz(c, p)
    // cam kenarı ve parlaklık
    c.lineWidth = 3
    c.strokeStyle = 'rgba(230, 240, 255, 0.45)'
    c.stroke()
    c.beginPath()
    c.moveTo(L + 8, T + H * 0.04)
    c.lineTo(L + 8, B - k * 1.2)
    c.lineWidth = 6
    c.lineCap = 'round'
    c.strokeStyle = 'rgba(255,255,255,0.12)'
    c.stroke()
    // boyun ve kapak
    c.fillStyle = 'rgba(230, 240, 255, 0.18)'
    c.fillRect(L + 4, T - H * 0.06, R - L - 8, H * 0.04)
    const kg = c.createLinearGradient(0, T - H * 0.13, 0, T - H * 0.06)
    kg.addColorStop(0, '#f7ede0')
    kg.addColorStop(1, '#d9c8b0')
    c.fillStyle = kg
    c.beginPath()
    c.roundRect(L - 2, T - H * 0.13, R - L + 4, H * 0.07, 8)
    c.fill()
    // kurdele ve etiket
    c.fillStyle = '#e8577a'
    c.fillRect(L - 2, T - H * 0.075, R - L + 4, H * 0.014)
    c.fillStyle = 'rgba(251, 246, 234, 0.92)'
    c.beginPath()
    c.roundRect(W * 0.3, H * 0.42, W * 0.4, H * 0.12, 6)
    c.fill()
    c.fillStyle = '#9a4260'
    c.font = `600 ${Math.round(W * 0.042)}px "Caveat Variable", "Caveat", cursive`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText('sarılmalar', W * 0.5, H * 0.465)
    c.font = `${Math.round(W * 0.03)}px "Caveat Variable", "Caveat", cursive`
    c.fillText(`${ICERIK.ben.ad} → ${ICERIK.sen.ad}`, W * 0.5, H * 0.51)
  }

  const kare = () => {
    if (!calisiyor) return
    let hiz = 0
    for (let i = 0; i < 2; i++) hiz = Math.max(hiz, adim(1 / 120))
    ciz()
    sakin = hiz < 0.08 ? sakin + 1 : 0
    // her şey durulunca döngü uyur (pil harcamasın)
    if (sakin > 45 || !gorunur) {
      calisiyor = false
      return
    }
    requestAnimationFrame(kare)
  }
  const uyan = () => {
    sakin = 0
    if (calisiyor || !gorunur) return
    calisiyor = true
    requestAnimationFrame(kare)
  }

  // ilk yerleşim: görünmeden önce sessizce oturt
  const hazirla = () => {
    if (!kur()) return false
    for (let i = 0; i < (azHareket ? 400 : 240); i++) adim(1 / 120)
    ciz()
    return true
  }
  let hazir = false
  new ResizeObserver(() => {
    if (hazirla()) hazir = true
  }).observe(tuval)

  new IntersectionObserver(
    (g) => {
      gorunur = g.some((x) => x.isIntersecting)
      if (!gorunur) return
      if (!hazir && hazirla()) hazir = true
      uyan()
      window.setTimeout(bugunkuDussun, 600)
    },
    { threshold: 0.45 },
  ).observe(tuval)

  tuval.addEventListener('click', () => {
    // hafif bir sarsıntı: kalpler zıplar ama kapağa çarpıp geri düşer
    for (const p of kalpler) {
      p.ox = p.x - (Math.random() - 0.5) * 2.4
      p.oy = p.y + 1 + Math.random() * 2.2
    }
    ses.kalp(0.6)
    titret([20, 30, 20])
    uyan()
    sallama++
    if (sallama === 5) {
      altYazi.textContent = 'Sabırsızsın, biliyorum. Ben de.'
      sirBul('kavanoz')
    }
  })
}
