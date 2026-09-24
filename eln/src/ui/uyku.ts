import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { ardayaYaz } from '../cekirdek/posta'
import { ayEvresi, saatYazi, simdi } from '../cekirdek/zaman'
import { ayCiz } from '../cekirdek/ay-ciz'
import { azHareket, gsap, ikon, titret } from '../bolumler/yardimci'
import { hitap } from '../bolumler/ruzgar'

const { ben, sen } = ICERIK
const SURE_DK = 8
const AL = 4 // saniye
const VER = 6

/** "Uyuyamadığında aç" mektubundaki sayma, burada nefesle */
const satirlar = () => [
  'Bir: İstanbul.',
  'İki: Karadeniz.',
  'Üç: Kafkaslar.',
  'Dört: Hazar.',
  'Beş: sen.',
  'Omuzlarını bırak. Çeneni gevşet.',
  'Bugün ne olduysa oldu; bitti.',
  'Aynı ay, iki pencere.',
  `${hitap().charAt(0).toLocaleUpperCase('tr-TR') + hitap().slice(1)}, uyku seni bulsun.`,
  'Gecən xeyrə qalsın.',
]

let acik = false

/** Gece lambası: nefes alıp veren gerçek evresindeki ay, sayılan nefesler, deniz sesi. */
export function uykuIsigi() {
  if (acik) return
  acik = true
  ses.baslat()
  ses.ruh('uyku')
  titret(10)

  const el = document.createElement('div')
  el.className = 'uyku'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-label', 'Uyku ışığı')
  el.innerHTML = /* html */ `
    <button class="ikon-dugme uyku-kapat" type="button" aria-label="Kapat">${ikon('kapat')}</button>
    <div class="uyku-orta">
      <div class="uyku-ay"><canvas width="360" height="360" aria-hidden="true"></canvas></div>
      <p class="uyku-nefes" aria-hidden="true">nefes al</p>
      <p class="uyku-satir" aria-live="polite">${satirlar()[0]}</p>
    </div>
    <div class="uyku-alt">
      <p class="uyku-saat"></p>
      <button class="uyku-arda" type="button">☾ ${ben.ad}’ya “iyi geceler” de</button>
      <p class="uyku-bilgi">${SURE_DK} dakika sonra ışık kendiliğinden kararır.</p>
    </div>`
  document.body.appendChild(el)
  document.body.classList.add('modal-acik')

  const tuval = el.querySelector('canvas')!
  ayCiz(tuval.getContext('2d')!, 180, 180, 118, ayEvresi(simdi()).evre)
  const ay = el.querySelector<HTMLElement>('.uyku-ay')!
  const nefes = el.querySelector<HTMLElement>('.uyku-nefes')!
  const satir = el.querySelector<HTMLElement>('.uyku-satir')!
  const saat = el.querySelector<HTMLElement>('.uyku-saat')!
  const saatYaz = () => {
    const an = simdi()
    saat.textContent = `${sen.yerelSehir} ${saatYazi(an, sen.saatDilimi)} · ${ben.yerelSehir} ${saatYazi(an, ben.saatDilimi)}`
  }
  saatYaz()
  const saatZaman = window.setInterval(saatYaz, 20_000)

  // ekran kendiliğinden kapanmasın (süre bitince bırakılır)
  let kilit: { release: () => Promise<void> } | null = null
  const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
  void nav.wakeLock
    ?.request('screen')
    .then((k) => (kilit = k))
    .catch(() => undefined)

  // nefes döngüsü
  const liste = satirlar()
  let tur = 0
  const dongu = gsap.timeline({ repeat: -1 })
  dongu
    .add(() => {
      nefes.textContent = 'nefes al'
      ses.nota(62, 0.012)
    })
    .to(ay, { scale: 1, '--parilti': 1, duration: AL, ease: 'sine.inOut' })
    .add(() => (nefes.textContent = 'ver'))
    .to(ay, { scale: 0.8, '--parilti': 0.35, duration: VER, ease: 'sine.inOut' })
    .add(() => {
      tur++
      if (tur === 5) sirBul('uyku')
      gsap.to(satir, {
        autoAlpha: 0,
        duration: 0.8,
        onComplete: () => {
          satir.textContent = liste[tur % liste.length]
          gsap.to(satir, { autoAlpha: 1, duration: 1.2 })
        },
      })
    })
  gsap.set(ay, { scale: 0.8, '--parilti': 0.35 })
  if (azHareket) dongu.timeScale(0.7)

  // ışık, süre boyunca yavaşça kısılır; sonunda ses de susar
  const isik = { v: 1 }
  const karart = gsap.to(isik, {
    v: 0.18,
    duration: SURE_DK * 60,
    ease: 'none',
    onUpdate: () => el.style.setProperty('--isik', String(isik.v)),
    onComplete: () => {
      dongu.pause()
      satir.textContent = 'İyi uykular. Öptüm.'
      nefes.textContent = ''
      void kilit?.release().catch(() => undefined)
      kilit = null
    },
  })
  const sesZaman = window.setTimeout(() => ses.uyut(40), (SURE_DK * 60 - 40) * 1000)

  // Arda'ya iyi geceler (gece başına bir kez)
  const arda = el.querySelector<HTMLButtonElement>('.uyku-arda')!
  const son = oku<number>('iyiGeceler', 0)
  if (Date.now() - son < 6 * 3600_000) {
    arda.disabled = true
    arda.textContent = `☾ ${ben.ad} haberdar; o da “iyi geceler” diyor`
  }
  arda.addEventListener('click', () => {
    arda.disabled = true
    yaz('iyiGeceler', Date.now())
    void ardayaYaz(`${sen.ad} uyumaya gidiyor 🌙`, 'Ona kısa bir “gecən xeyrə qalsın” yaz. Uzun olmasın; uyumaya çalışıyor.', ['crescent_moon'])
    arda.textContent = `☾ Söyledim. ${ben.ad} da sana “iyi geceler” diyor`
    ses.nota(74, 0.02)
  })

  const kapat = () => {
    acik = false
    dongu.kill()
    karart.kill()
    window.clearInterval(saatZaman)
    window.clearTimeout(sesZaman)
    void kilit?.release().catch(() => undefined)
    ses.uyandir()
    ses.ruh(ses.sonRuh)
    document.body.classList.remove('modal-acik')
    gsap.to(el, { autoAlpha: 0, duration: 0.8, onComplete: () => el.remove() })
  }
  el.querySelector('.uyku-kapat')!.addEventListener('click', kapat)
  const esc = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    window.removeEventListener('keydown', esc)
    kapat()
  }
  window.addEventListener('keydown', esc)
  gsap.from(el, { autoAlpha: 0, duration: 1.4 })
}
