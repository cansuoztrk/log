import { ICERIK } from '../icerik'
import { type Anlik, tarihYazi } from '../cekirdek/zaman'
import { ses } from '../cekirdek/ses'
import { $, azHareket, gsap, ScrollTrigger, SplitText } from './yardimci'

const { ben, mektup, sesMesaji } = ICERIK

export function mektupHTML(z: Anlik) {
  return /* html */ `
  <section id="mektup" class="bolum" data-bolum="XI" data-ad="Mektup">
    <div class="icerik-sutun">
      <p class="etiket mektup-etiket"><span class="no">XI</span>Mektup</p>
      <article class="kagit">
        <p class="mektup-tarih">${ben.sehir}, ${tarihYazi(z.bugun)}</p>
        ${mektup.map((p, i) => `<p class="${i === 0 ? 'hitap' : i === mektup.length - 1 ? 'son-satir' : ''}">${p}</p>`).join('')}
        <p class="imza">${ben.ad}</p>
        <span class="kat k1" aria-hidden="true"></span>
        <span class="kat k2" aria-hidden="true"></span>
      </article>
      ${
        sesMesaji
          ? `<div class="sesli" data-dom>
        <button class="sesli-oynat" type="button" aria-label="Sesli mesajı dinle"><svg viewBox="0 0 24 24"><path class="oyna" d="M8 5.5v13l11-6.5z" fill="currentColor"/><g class="dur" fill="currentColor"><rect x="7" y="5.5" width="3.6" height="13" rx="1"/><rect x="13.4" y="5.5" width="3.6" height="13" rx="1"/></g></svg></button>
        <canvas class="sesli-dalga" aria-hidden="true"></canvas>
        <span class="sesli-sure">0:00</span>
        <p class="sesli-not">Bu mektubun bir de sesli hâli var. Birbirimizi en çok sesimizden tanıyoruz.</p>
      </div>`
          : ''
      }
    </div>
  </section>`
}

/** WhatsApp sesli mesajı gibi: dosyanın gerçek dalga formu, çaldıkça dolar */
function sesliKur() {
  const kutu = document.querySelector<HTMLElement>('#mektup .sesli')
  if (!kutu || !sesMesaji) return
  const tuval = $<HTMLCanvasElement>('.sesli-dalga', kutu)
  const sure = $('.sesli-sure', kutu)
  const dugme = $('.sesli-oynat', kutu)
  const ses_ = ses.dosya(sesMesaji)
  const CUBUK = 46
  let tepeler: number[] = Array.from({ length: CUBUK }, (_, i) => 0.25 + 0.5 * Math.abs(Math.sin(i * 1.7)))
  const yaz = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  const ciz = () => {
    const px = Math.min(2, devicePixelRatio || 1)
    const r = tuval.getBoundingClientRect()
    tuval.width = r.width * px
    tuval.height = r.height * px
    const x = tuval.getContext('2d')!
    x.scale(px, px)
    const oran = ses_.duration ? ses_.currentTime / ses_.duration : 0
    const g = r.width / CUBUK
    tepeler.forEach((t, i) => {
      const h = Math.max(3, t * r.height)
      x.fillStyle = i / CUBUK <= oran ? '#f59fb4' : 'rgba(247,237,224,0.35)'
      x.beginPath()
      x.roundRect(i * g + g * 0.2, (r.height - h) / 2, g * 0.6, h, 2)
      x.fill()
    })
    if (!ses_.paused) requestAnimationFrame(ciz)
  }
  // dalga formunu dosyadan hesapla
  void fetch(sesMesaji)
    .then((r) => r.arrayBuffer())
    .then((b) => new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)().decodeAudioData(b))
    .then((veri) => {
      const k = veri.getChannelData(0)
      const parca = Math.floor(k.length / CUBUK)
      const t = Array.from({ length: CUBUK }, (_, i) => {
        let m = 0
        for (let j = i * parca; j < (i + 1) * parca; j += 32) m = Math.max(m, Math.abs(k[j]))
        return m
      })
      const en = Math.max(...t) || 1
      tepeler = t.map((v) => 0.15 + 0.85 * (v / en))
      sure.textContent = yaz(veri.duration)
      ciz()
    })
    .catch(() => undefined)
  ses_.addEventListener('loadedmetadata', () => (sure.textContent = yaz(ses_.duration)))
  ses_.addEventListener('timeupdate', () => (sure.textContent = yaz(ses_.currentTime)))
  dugme.addEventListener('click', async () => {
    if (!ses_.paused) {
      ses.sarkiDur()
      kutu.classList.remove('caliyor')
      return
    }
    const oldu = await ses.sarkiCal(sesMesaji, () => {
      kutu.classList.remove('caliyor')
      sure.textContent = yaz(ses_.duration)
      ciz()
    })
    if (oldu) {
      kutu.classList.add('caliyor')
      ciz()
    }
  })
  ciz()
}

export function mektupKur() {
  sesliKur()
  const kagit = $('#mektup .kagit')
  if (azHareket) return
  // Kâğıt açılır gibi gelir, sonra satırlar tek tek yazılır
  gsap.from(kagit, {
    rotateX: 38,
    y: 80,
    opacity: 0,
    transformOrigin: '50% 100%',
    duration: 1.6,
    ease: 'expo.out',
    scrollTrigger: { trigger: kagit, start: 'top 85%', once: true },
  })
  for (const p of kagit.querySelectorAll<HTMLElement>('p:not(.imza)')) {
    const b = SplitText.create(p, { type: 'lines', linesClass: 'm-satir' })
    gsap.from(b.lines, {
      opacity: 0,
      y: 12,
      filter: 'blur(4px)',
      duration: 1.1,
      ease: 'power2.out',
      stagger: 0.14,
      scrollTrigger: { trigger: p, start: 'top 88%', once: true },
    })
  }
  const imza = $('.imza', kagit)
  gsap.fromTo(
    imza,
    { clipPath: 'inset(0 100% 0 0)' },
    { clipPath: 'inset(0 0% 0 0)', duration: 2.2, ease: 'power1.inOut', scrollTrigger: { trigger: imza, start: 'top 90%', once: true } },
  )
  ScrollTrigger.refresh()
}
