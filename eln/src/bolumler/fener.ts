import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { ardayaYaz } from '../cekirdek/posta'
import { isoGun, simdi, tarihYazi, yerel } from '../cekirdek/zaman'
import { $, azHareket, belir, gsap, kacir, satirSatir, titret } from './yardimci'

const { sen } = ICERIK

interface Dilek {
  x: number // 0–1
  y: number // 0–1
  t: string // tarih
  d: string // dilek (yalnızca bu cihazda)
}

interface Ucan {
  x0: number
  y0: number
  x1: number
  y1: number
  bas: number
  sure: number
  tohum: number
}

const dilekler = () => oku<Dilek[]>('fenerler', [])

export function fenerHTML() {
  const n = dilekler().length
  return /* html */ `
  <section id="fener" class="bolum" data-bolum="" data-ad="Dilek Feneri">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Dilek feneri</p>
        <h2 class="baslik">Bir dilek tut, <em>gökyüzüne bırak</em>.</h2>
        <p class="metin">Dileğini yaz ve feneri bırak. Yükselir, bir yıldız olur ve bu gökyüzünde kalır. Dileğini ben bile bilmeyeceğim; bana sadece bir fenerin uçtuğu haberi gelir. Yıldıza dokunursan dileğini sen yeniden okursun.</p>
      </div>
      <div class="fener-gok" data-dom>
        <canvas class="fener-tuval" aria-label="Dilek yıldızlarının olduğu gökyüzü"></canvas>
        <p class="fener-sayi">${n ? `Gökyüzünde <b>${n}</b> dileğin var` : 'Gökyüzü ilk dileğini bekliyor'}</p>
        <p class="fener-ipucu" hidden></p>
      </div>
      <form class="fener-form" autocomplete="off" data-dom>
        <label class="gorunmez" for="fener-dilek">Dileğin</label>
        <textarea id="fener-dilek" rows="2" maxlength="200" placeholder="Dileğim…"></textarea>
        <button class="dugme" type="submit"><span aria-hidden="true">🏮</span><span>Feneri bırak</span></button>
      </form>
    </div>
  </section>`
}

export function fenerKur() {
  const bolum = $('#fener')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('.fener-gok', bolum), $('.fener-form', bolum)])
  const tuval = $<HTMLCanvasElement>('.fener-tuval', bolum)
  const sayiEl = $('.fener-sayi', bolum)
  const ipucu = $('.fener-ipucu', bolum)
  const form = $<HTMLFormElement>('.fener-form', bolum)
  const alan = $<HTMLTextAreaElement>('#fener-dilek', bolum)

  let W = 0
  let H = 0
  let px = 1
  let calisiyor = false
  let liste = dilekler()
  const ucanlar: Ucan[] = []
  // arka plandaki sıradan yıldızlar (her açılışta aynı dizilim)
  const zemin = Array.from({ length: 110 }, (_, i) => {
    const s = Math.sin(i * 12.9898) * 43758.5453
    const r = s - Math.floor(s)
    const s2 = Math.sin(i * 78.233) * 12543.1
    return { x: s2 - Math.floor(s2), y: r * 0.85, b: 0.25 + ((i * 37) % 10) / 20, f: r * 6 }
  })

  const olc = () => {
    px = Math.min(window.devicePixelRatio || 1, 2)
    W = tuval.clientWidth
    H = tuval.clientHeight
    if (!W) return false
    tuval.width = Math.round(W * px)
    tuval.height = Math.round(H * px)
    return true
  }

  /** Kâğıt fener: yukarısı dar gövde, içinde titreyen bir alev */
  const fenerCiz = (x: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number, tohum: number) => {
    const titre = 0.85 + 0.15 * Math.sin(t * 13 + tohum) * Math.sin(t * 7.3 + tohum * 2)
    const hale = x.createRadialGradient(cx, cy, 0, cx, cy, 60 * s)
    hale.addColorStop(0, `rgba(255,190,120,${0.55 * titre})`)
    hale.addColorStop(1, 'rgba(255,150,110,0)')
    x.fillStyle = hale
    x.beginPath()
    x.arc(cx, cy, 60 * s, 0, Math.PI * 2)
    x.fill()
    const w = 22 * s
    const h = 30 * s
    const g = x.createLinearGradient(0, cy - h / 2, 0, cy + h / 2)
    g.addColorStop(0, `rgba(255,170,120,${0.75 * titre})`)
    g.addColorStop(0.7, `rgba(255,220,160,${0.95 * titre})`)
    g.addColorStop(1, `rgba(255,200,140,${0.9 * titre})`)
    x.fillStyle = g
    x.beginPath()
    x.moveTo(cx - w * 0.36, cy - h / 2)
    x.quadraticCurveTo(cx, cy - h * 0.62, cx + w * 0.36, cy - h / 2)
    x.lineTo(cx + w / 2, cy + h / 2)
    x.quadraticCurveTo(cx, cy + h * 0.56, cx - w / 2, cy + h / 2)
    x.closePath()
    x.fill()
    // kâğıdın dikişleri
    x.strokeStyle = `rgba(160,70,40,${0.25 * titre})`
    x.lineWidth = Math.max(0.5, s)
    x.beginPath()
    x.moveTo(cx, cy - h * 0.55)
    x.lineTo(cx, cy + h * 0.53)
    x.stroke()
    // alev
    x.fillStyle = `rgba(255,250,230,${titre})`
    x.beginPath()
    x.ellipse(cx, cy + h * 0.38, 2.6 * s, 4 * s * titre, 0, 0, Math.PI * 2)
    x.fill()
  }

  const kare = (ms: number) => {
    if (!calisiyor) return
    const t = ms / 1000
    const x = tuval.getContext('2d')!
    x.setTransform(px, 0, 0, px, 0, 0)
    const gok = x.createLinearGradient(0, 0, 0, H)
    gok.addColorStop(0, '#070918')
    gok.addColorStop(0.7, '#141236')
    gok.addColorStop(1, '#2a1733')
    x.fillStyle = gok
    x.fillRect(0, 0, W, H)
    for (const z of zemin) {
      x.fillStyle = `rgba(255,244,230,${z.b * (0.6 + 0.4 * Math.sin(t * 1.3 + z.f))})`
      x.fillRect(z.x * W, z.y * H, 1.2, 1.2)
    }
    // dilek yıldızları
    liste.forEach((d, i) => {
      const p = 0.7 + 0.3 * Math.sin(t * 1.7 + i * 1.9)
      const sx = d.x * W
      const sy = d.y * H
      const g = x.createRadialGradient(sx, sy, 0, sx, sy, 16)
      g.addColorStop(0, `rgba(255,214,190,${0.9 * p})`)
      g.addColorStop(1, 'rgba(245,159,180,0)')
      x.fillStyle = g
      x.beginPath()
      x.arc(sx, sy, 16, 0, Math.PI * 2)
      x.fill()
      x.fillStyle = '#fff'
      x.beginPath()
      x.arc(sx, sy, 1.8 + p * 0.6, 0, Math.PI * 2)
      x.fill()
    })
    // uçan fenerler
    for (let k = ucanlar.length - 1; k >= 0; k--) {
      const u = ucanlar[k]
      const o = Math.min(1, (t - u.bas) / u.sure)
      const e = 1 - (1 - o) ** 2
      const salinim = Math.sin(t * 1.6 + u.tohum) * 14 * (1 - o)
      const cx = u.x0 + (u.x1 - u.x0) * e + salinim
      const cy = u.y0 + (u.y1 - u.y0) * e
      if (o < 1) fenerCiz(x, cx, cy, 1.25 - 1.05 * e, t, u.tohum)
      else ucanlar.splice(k, 1)
    }
    requestAnimationFrame(kare)
  }

  const sayiYaz = () => (sayiEl.innerHTML = liste.length ? `Gökyüzünde <b>${liste.length}</b> dileğin var` : 'Gökyüzü ilk dileğini bekliyor')

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const d = alan.value.trim()
    if (!d) {
      alan.focus()
      return
    }
    alan.value = ''
    alan.blur()
    ses.baslat()
    ses.vuus(2.4)
    titret([10, 60, 10])
    // hedef: gökyüzünün üst kısmında, başka dileklere çok yakın olmayan bir yer
    let hedef = { x: 0.5, y: 0.3 }
    for (let deneme = 0; deneme < 20; deneme++) {
      const aday = { x: 0.08 + Math.random() * 0.84, y: 0.08 + Math.random() * 0.5 }
      hedef = aday
      if (liste.every((l) => Math.hypot(l.x - aday.x, l.y - aday.y) > 0.08)) break
    }
    const t = performance.now() / 1000
    const sure = azHareket ? 1.5 : 6
    ucanlar.push({ x0: W / 2, y0: H - 30, x1: hedef.x * W, y1: hedef.y * H, bas: t, sure, tohum: Math.random() * 10 })
    tuval.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    window.setTimeout(() => {
      const yeni: Dilek = { ...hedef, t: isoGun(yerel(simdi(), sen.saatDilimi)), d }
      liste = [...dilekler(), yeni].slice(-200)
      yaz('fenerler', liste)
      sayiYaz()
      ses.cin()
      titret(20)
      window.dispatchEvent(new CustomEvent('kutla', { detail: 12 }))
      void ardayaYaz(`${sen.ad} bir dilek feneri uçurdu 🏮`, 'Dileği kendisinde. Sen de bir dilek tut; belki aynıdır.', ['izakaya_lantern'])
      window.setTimeout(() => sirBul('fener'), 900)
    }, sure * 1000)
  })

  // bir dilek yıldızına dokununca: o gün ne dilediğini (yalnızca bu cihazda) gösterir
  tuval.addEventListener('click', (e) => {
    const r = tuval.getBoundingClientRect()
    const mx = (e.clientX - r.left) / r.width
    const my = (e.clientY - r.top) / r.height
    let en: Dilek | null = null
    let enUzak = 26 / r.width
    for (const d of liste) {
      const u = Math.hypot((d.x - mx) * (r.width / r.height), d.y - my) * (r.height / r.width)
      if (u < enUzak) {
        en = d
        enUzak = u
      }
    }
    if (!en) {
      ipucu.hidden = true
      return
    }
    ipucu.innerHTML = `<small>${tarihYazi(en.t)}</small>${kacir(en.d)}`
    ipucu.hidden = false
    // balon kutunun dışına taşmasın: gerçek genişliğine göre sıkıştır
    const yarim = ipucu.offsetWidth / 2 + 8
    ipucu.style.left = `${Math.min(r.width - yarim, Math.max(yarim, en.x * r.width))}px`
    ipucu.style.top = `${en.y * 100}%`
    gsap.fromTo(ipucu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 })
    ses.nota(88, 0.025)
  })

  const io = new IntersectionObserver((k) => {
    const gorunur = k.some((x) => x.isIntersecting)
    if (gorunur && !calisiyor) {
      if (!W && !olc()) return
      calisiyor = true
      requestAnimationFrame(kare)
    } else if (!gorunur) calisiyor = false
  })
  io.observe(tuval)
  window.addEventListener('resize', () => olc())
}
