import { ICERIK } from '../icerik'
import { type Anlik, tarihYazi } from '../cekirdek/zaman'
import { $, azHareket, gsap, ScrollTrigger, SplitText } from './yardimci'

const { ben, mektup } = ICERIK

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
    </div>
  </section>`
}

export function mektupKur() {
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
