import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { AYLAR, type Anlik, sayi } from '../cekirdek/zaman'
import { $, $$, azHareket, gsap, titret } from '../bolumler/yardimci'
import { hitap } from '../bolumler/ruzgar'

const { sen, ben, kapi, arkadas } = ICERIK

/** Kapı: ilk gelişte "her şeyin başladığı gün" sorulur; sonra ışığı tutarak girilir. */
export function kapiAc(z: Anlik, ilkZiyaret: boolean, flasta?: () => void, dogumGunu = false): Promise<void> {
  const el = $('#kapi')
  const tarihSor = kapi.aktif && !oku('kapi', false)
  el.innerHTML = /* html */ `
    <canvas class="kapi-yildiz" aria-hidden="true"></canvas>
    <div class="kapi-ic">
      <div class="kapi-sahne kapi-tarih" ${tarihSor ? '' : 'hidden'}>
        <p class="etiket">Bir mektup var · sana</p>
        <h1 class="kapi-baslik">${sen.ad}</h1>
        <p class="kapi-metin">Bu kapı yalnızca bir tarihle açılır. Her şeyin başladığı günü çevir.</p>
        <div class="kadran">
          <div class="tekerlek gun" tabindex="0" aria-label="Gün"><ol>${Array.from({ length: 31 }, (_, i) => `<li>${i + 1}</li>`).join('')}</ol></div>
          <div class="tekerlek ay" tabindex="0" aria-label="Ay"><ol>${AYLAR.map((a) => `<li>${a}</li>`).join('')}</ol></div>
          <div class="kadran-bant"></div>
        </div>
        <div class="kadran-etiket"><span>gün</span><span>ay</span></div>
        <button class="dugme kapi-ac" type="button">Aç</button>
        <p class="kapi-ipucu" aria-live="polite"></p>
      </div>
      <div class="kapi-sahne kapi-isik" ${tarihSor ? 'hidden' : ''}>
        <p class="etiket">${dogumGunu ? '23 Nisan · İyi ki doğdun' : tarihSor ? 'Hatırladın' : ilkZiyaret ? `${sen.ad}’e` : `Tekrar hoş geldin, ${hitap()}`}</p>
        <p class="kapi-metin">${
          dogumGunu
            ? 'Bugün senin günün. Işığı tut; içeride seni bir şey bekliyor.'
            : tarihSor
              ? 'Tabii ki hatırladın.'
              : ilkZiyaret
                ? `${ben.ad}’dan, ${sayi(z.gunNo)}. günümüzde.`
                : `Bugün tanışmamızın <b>${sayi(z.gunNo)}.</b> günü. Rüzgâr sana yeni bir not getirdi.`
        }</p>
        <button class="isik-tut" type="button" aria-label="Işığı basılı tut">
          <svg viewBox="0 0 148 148" aria-hidden="true"><circle class="iz" cx="74" cy="74" r="70"/><circle class="dolu" cx="74" cy="74" r="70"/></svg>
          <span class="isik-cekirdek"></span>
        </button>
        <p class="isik-yazi">Işığı tut</p>
      </div>
    </div>
    <div class="kapi-flas"></div>`

  yildizlariCiz($<HTMLCanvasElement>('.kapi-yildiz', el))

  return new Promise((coz) => {
    const isikSahnesi = () => {
      const tarih = $('.kapi-tarih', el)
      const isik = $('.kapi-isik', el)
      if (!tarih.hidden) {
        gsap.to(tarih, {
          autoAlpha: 0,
          y: -20,
          duration: 0.6,
          onComplete: () => {
            tarih.hidden = true
            isik.hidden = false
            gsap.fromTo(isik, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out' })
          },
        })
      } else gsap.from(isik, { autoAlpha: 0, y: 16, duration: 1.2, ease: 'expo.out', delay: 0.2 })
      isikTut(el, tarihSor ? 2 : 1.3, coz, flasta)
    }
    if (tarihSor) tarihKadrani(el, z, () => {
      yaz('kapi', true)
      ses.baslat()
      ses.cin()
      isikSahnesi()
    })
    else isikSahnesi()
  })
}

function tarihKadrani(el: HTMLElement, z: Anlik, dogru: () => void) {
  const gun = $('.tekerlek.gun', el)
  const ay = $('.tekerlek.ay', el)
  const ipucu = $('.kapi-ipucu', el)
  const H = 60
  const secim = (t: HTMLElement) => Math.round(t.scrollTop / H)
  const isaretle = (t: HTMLElement) => {
    const i = secim(t)
    $$('li', t).forEach((li, k) => li.classList.toggle('secili', k === i))
  }
  // bugünün tarihiyle başlasın; onu doğru güne çevirmek ona kalsın
  requestAnimationFrame(() => {
    gun.scrollTop = (z.bakuT.gun - 1) * H
    ay.scrollTop = (z.bakuT.ay - 1) * H
    isaretle(gun)
    isaretle(ay)
  })
  let tikZaman = 0
  for (const t of [gun, ay]) {
    let son = -1
    t.addEventListener('scroll', () => {
      isaretle(t)
      const i = secim(t)
      if (i !== son) {
        son = i
        const s = performance.now()
        if (s - tikZaman > 40) {
          tikZaman = s
          ses.tik()
          titret(4)
        }
      }
    })
    t.addEventListener('click', (e) => {
      const li = (e.target as HTMLElement).closest('li')
      if (!li) return
      const i = $$('li', t).indexOf(li)
      t.scrollTo({ top: i * H, behavior: 'smooth' })
    })
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        t.scrollBy({ top: e.key === 'ArrowDown' ? H : -H, behavior: 'smooth' })
      }
    })
    // ilk dokunuşta sesi uyandır
    t.addEventListener('pointerdown', () => ses.baslat(), { once: true })
  }
  let deneme = 0
  const IPUCLARI = [
    `Hmm… o gün değil. Kışın ilk haftası; bir grup, bir ${arkadas}…`,
    `Bir ipucu daha: Aralık’ın altısı. Hatırlaman yeter.`,
    `Tamam, çeviriyorum: ${kapi.gun} ${AYLAR[kapi.ay - 1]}. Hep hatırla, olur mu?`,
  ]
  $('.kapi-ac', el).addEventListener('click', () => {
    ses.baslat()
    if (secim(gun) + 1 === kapi.gun && secim(ay) + 1 === kapi.ay) {
      titret([20, 40, 20])
      dogru()
      return
    }
    ipucu.textContent = IPUCLARI[Math.min(deneme, IPUCLARI.length - 1)]
    const kadran = $('.kadran', el)
    kadran.classList.remove('kapi-sallan')
    void kadran.offsetWidth
    kadran.classList.add('kapi-sallan')
    titret([30, 40, 30])
    if (deneme >= 2) {
      gun.scrollTo({ top: (kapi.gun - 1) * H, behavior: 'smooth' })
      ay.scrollTo({ top: (kapi.ay - 1) * H, behavior: 'smooth' })
    }
    deneme++
  })
}

function isikTut(el: HTMLElement, sure: number, bitti: () => void, flasta?: () => void) {
  const dugme = $('.isik-tut', el)
  const halka = $<SVGCircleElement>('.dolu', dugme)
  const yazi = $('.isik-yazi', el)
  const cevre = 2 * Math.PI * 70
  halka.style.strokeDasharray = String(cevre)
  halka.style.strokeDashoffset = String(cevre)
  let tut = false
  let p = 0
  let son = performance.now()
  let bitmis = false
  let sonAtis = 0
  const dongu = (t: number) => {
    if (bitmis) return
    const dt = Math.min(0.25, (t - son) / 1000)
    son = t
    p = tut ? Math.min(1, p + dt / sure) : Math.max(0, p - dt / 0.8)
    halka.style.strokeDashoffset = String(cevre * (1 - p))
    dugme.style.transform = `scale(${1 + p * 0.12})`
    yazi.textContent = !tut && p === 0 ? 'Işığı tut' : p < 0.55 ? 'Bırakma…' : p < 1 ? 'Az qaldı…' : '✦'
    if (tut && t - sonAtis > 700 - p * 300) {
      sonAtis = t
      titret(10)
    }
    if (p >= 1) {
      bitmis = true
      gir()
      return
    }
    requestAnimationFrame(dongu)
  }
  requestAnimationFrame(dongu)
  const bas = (e: PointerEvent) => {
    e.preventDefault()
    tut = true
    ses.baslat()
    try {
      dugme.setPointerCapture(e.pointerId)
    } catch {
      /* yok */
    }
  }
  const birak = () => {
    tut = false
    ses.baslat() // iOS: sesi bırakma anında da uyandır
  }
  dugme.addEventListener('pointerdown', bas)
  dugme.addEventListener('pointerup', birak)
  dugme.addEventListener('pointercancel', birak)
  dugme.addEventListener('contextmenu', (e) => e.preventDefault())
  dugme.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      tut = true
    }
  })
  dugme.addEventListener('keyup', birak)

  const gir = () => {
    ses.baslat()
    ses.cin()
    titret([30, 60, 30, 60, 90])
    const flas = $('.kapi-flas', el)
    flasta?.()
    const tl = gsap.timeline({
      onComplete: () => {
        el.remove()
        bitti()
      },
    })
    if (azHareket) {
      tl.to(el, { autoAlpha: 0, duration: 0.4 })
      return
    }
    tl.to(flas, { opacity: 1, scale: 1.2, duration: 0.7, ease: 'power2.in' })
      .to($('.kapi-ic', el), { autoAlpha: 0, duration: 0.3 }, 0.2)
      .set(el, { background: 'transparent' })
      .set($('.kapi-yildiz', el), { autoAlpha: 0 })
      .to(flas, { opacity: 0, duration: 1.6, ease: 'power2.out' })
  }
}

function yildizlariCiz(c: HTMLCanvasElement) {
  const px = Math.min(2, window.devicePixelRatio || 1)
  const olc = () => {
    c.width = innerWidth * px
    c.height = innerHeight * px
  }
  olc()
  window.addEventListener('resize', olc)
  const x = c.getContext('2d')!
  const yildiz = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() ** 3 * 1.6 + 0.3, f: Math.random() * 6 }))
  const ciz = (t: number) => {
    if (!c.isConnected) return
    x.clearRect(0, 0, c.width, c.height)
    for (const s of yildiz) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(t / 1400 + s.f))
      x.fillStyle = `rgba(255,244,228,${a * 0.8})`
      x.beginPath()
      x.arc(s.x * c.width, s.y * c.height, s.r * px, 0, Math.PI * 2)
      x.fill()
    }
    requestAnimationFrame(ciz)
  }
  requestAnimationFrame(ciz)
}
