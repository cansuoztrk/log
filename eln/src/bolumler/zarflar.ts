import { ICERIK } from '../icerik'
import { MEKTUPLAR, type ZarfMektup } from '../mektuplar'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { type Anlik, gunEkle, gunFarki, sayi, tarihYazi } from '../cekirdek/zaman'
import { $, $$, belir, gsap, ikon, satirSatir, titret } from './yardimci'

const { ben } = ICERIK

/** İlk buluşma tarihi girildiyse "önceki gece" mektubu o güne kilitlenir */
function mektuplar(): ZarfMektup[] {
  return MEKTUPLAR.map((m) => (m.id === 'bulusma' && ICERIK.ilkBulusma ? { ...m, tarih: gunEkle(ICERIK.ilkBulusma.slice(0, 10), -1) } : m))
}

export function zarflarHTML(z: Anlik) {
  const acilanlar = new Set(oku<string[]>('zarflar', []))
  return /* html */ `
  <section id="zarflar" class="bolum" data-bolum="" data-ad="Olduğunda Aç">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>… olduğunda aç</p>
        <h2 class="baslik">Sana, <em>ihtiyacın olduğunda</em>.</h2>
        <p class="metin">Bazı günler bir mektup lazım olur. Onları önceden yazdım. Zarfın üstünde ne zaman açacağın yazıyor. Birkaçı da kendi gününü bekliyor; o gün gelmeden açılmıyor.</p>
      </div>
      <div class="zarflar">
        ${mektuplar()
          .map((m) => {
            const kalan = m.tarih ? gunFarki(z.bugun, m.tarih) : 0
            const kilitli = kalan > 0
            const acik = acilanlar.has(m.id)
            return `<button class="kucuk-zarf${kilitli ? ' kilitli' : ''}${acik ? ' acildi' : ''}" type="button" data-id="${m.id}" data-kalan="${kalan}" style="--muhur:${m.muhur}">
              <span class="kz-kapak"></span>
              <span class="kz-baslik el">${m.baslik}</span>
              <span class="kz-muhur">${kilitli ? '🔒' : acik ? '✓' : `${ICERIK.sen.ad[0]}·${ben.ad[0]}`}</span>
              <small class="kz-alt">${kilitli ? `${sayi(kalan)} gün sonra açılır` : m.tarih ? tarihYazi(m.tarih) : acik ? 'açıldı' : 'dokun'}</small>
            </button>`
          })
          .join('')}
      </div>
    </div>
  </section>
  <div class="zarf-modal" role="dialog" aria-modal="true" aria-label="Mektup" data-lenis-prevent hidden>
    <article class="kagit modal-kagit">
      <button class="ikon-dugme modal-kapat" type="button" aria-label="Kapat">${ikon('kapat')}</button>
      <p class="hitap modal-baslik"></p>
      <div class="modal-metin"></div>
      <p class="imza">${ben.ad}</p>
    </article>
  </div>`
}

export function zarflarKur() {
  const bolum = $('#zarflar')
  satirSatir($('.baslik', bolum))
  belir($('.bolum-bas .metin', bolum))
  const zarflar = $$('.kucuk-zarf', bolum)
  belir(zarflar, { stagger: 0.06 })
  const modal = $('.zarf-modal')
  document.body.appendChild(modal) // en üst katmanda dursun (içerik katmanının dışında)
  const kagit = $('.modal-kagit', modal)
  const acilanlar = new Set(oku<string[]>('zarflar', []))

  const kapat = () => {
    gsap.to(modal, {
      autoAlpha: 0,
      duration: 0.4,
      onComplete: () => {
        modal.hidden = true
        document.body.classList.remove('modal-acik')
      },
    })
  }
  $('.modal-kapat', modal).addEventListener('click', kapat)
  modal.addEventListener('click', (e) => e.target === modal && kapat())
  window.addEventListener('keydown', (e) => e.key === 'Escape' && !modal.hidden && kapat())

  for (const z of zarflar) {
    z.addEventListener('click', () => {
      const m = mektuplar().find((x) => x.id === z.dataset.id)!
      const kalan = +(z.dataset.kalan ?? 0)
      if (kalan > 0) {
        gsap.fromTo(z, { x: 0 }, { x: 6, duration: 0.06, repeat: 5, yoyo: true, clearProps: 'x' })
        $('.kz-alt', z).textContent = kalan === 1 ? 'Yarın. Sabret ☺️' : `Henüz değil. ${sayi(kalan)} gün kaldı.`
        titret([20, 30, 20])
        ses.tik()
        return
      }
      $('.modal-baslik', kagit).textContent = m.baslik.replace(/ aç$/, '…')
      $('.modal-metin', kagit).innerHTML = m.metin.map((p) => `<p>${p}</p>`).join('')
      modal.hidden = false
      document.body.classList.add('modal-acik')
      kagit.scrollTop = 0
      ses.vuus(0.9)
      window.setTimeout(() => ses.nota(81, 0.035), 350)
      titret(15)
      gsap.fromTo(modal, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 })
      gsap.fromTo(kagit, { y: 60, rotateX: 25, opacity: 0 }, { y: 0, rotateX: 0, opacity: 1, duration: 1, ease: 'expo.out' })
      gsap.from($$('p', $('.modal-metin', kagit)), { opacity: 0, y: 10, stagger: 0.18, duration: 0.8, delay: 0.3 })
      if (!acilanlar.has(m.id)) {
        acilanlar.add(m.id)
        yaz('zarflar', [...acilanlar])
        z.classList.add('acildi')
        $('.kz-muhur', z).textContent = '✓'
        if (!m.tarih) $('.kz-alt', z).textContent = 'açıldı'
        if (MEKTUPLAR.filter((x) => !x.tarih).every((x) => acilanlar.has(x.id))) window.setTimeout(() => sirBul('zarflar'), 1500)
      }
    })
  }
}
