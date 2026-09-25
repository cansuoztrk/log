import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { type Anlik, MESAFE, sayi } from '../cekirdek/zaman'
import type { Kuleler } from '../gl/kuleler'
import { $, $$, adimZamani, ikon, ScrollTrigger, titret } from './yardimci'

const { sen } = ICERIK

export function kulelerHTML(z: Anlik) {
  return /* html */ `
  <section id="kuleler" class="bolum uzun" data-gl="kule" data-ruh="kule" data-bolum="V" data-ad="İki Kule">
    <div class="sabit">
      <div class="kule-adimlar">
        <div class="adim">
          <p class="etiket"><span class="no">V</span>İki kule</p>
          <p class="satir">Benim şehrimde bir <em>Kız Kulesi</em> var. Seninkinde bir <em>Qız Qalası</em>.</p>
        </div>
        <div class="adim">
          <p class="satir">Haritada aramızda ${sayi(MESAFE)} kilometre var. Bu gece, burada, sadece bir su.</p>
        </div>
        <div class="adim">
          <p class="metin buyuk">Avrupalılar Kız Kulesi’ne <strong>“Leandros’un Kulesi”</strong> der. Efsaneye göre Leandros, sevdiği Hero’ya kavuşmak için her gece karşı kıyıya yüzermiş. Hero da yolunu bulsun diye kulede bir lamba yakarmış.</p>
        </div>
        <div class="adim">
          <p class="satir">Aramızda bir boğaz yok; ${sayi(MESAFE)} kilometre var. Ama ben her gece yüzüyorum, ${sen.ad}.</p>
          <button class="dugme lamba-dugme" type="button">${ikon('yildiz')}<span>Lambayı yak</span></button>
        </div>
        <div class="adim">
          <p class="satir italik">Onların lambası bir fırtınada söndü. Bizimkini hiçbir rüzgâr söndüremez; <em>rüzgârlar şehrinin</em> rüzgârları bile.</p>
          <p class="lamba-sayac"><b>${sayi(z.sevgiliGun)}</b> gecedir yanıyor.</p>
          <p class="dipnot kule-dipnot">Solda, iki minarenin arasında bir <em>mahya</em> asılı. Ramazan’da minarelerin arasına ışıktan yazılar gerilir; en sevilenlerden biri “Hoş geldin”dir. Bu, senin için yazıldı. Sağdaki Alev Kulelerini de biraz izle; arada bir sana bir şey söylüyorlar.</p>
        </div>
      </div>
    </div>
  </section>`
}

export function kulelerKur(kule: () => Kuleler | null) {
  const bolum = $('#kuleler')
  adimZamani(bolum, $$('.kule-adimlar .adim', bolum))
  ScrollTrigger.create({
    trigger: bolum,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (s) => {
      const k = kule()
      if (k) k.ilerleme = s.progress
    },
  })

  const dugme = $<HTMLButtonElement>('.lamba-dugme', bolum)
  const yak = (sessiz = false) => {
    const k = kule()
    k?.yak()
    dugme.classList.add('yandi')
    dugme.querySelector('span')!.textContent = 'Lamba yanıyor'
    if (!sessiz) {
      ses.vuus(2.2)
      window.setTimeout(() => ses.cin(), 1800)
      titret([20, 60, 20])
      yaz('lamba', true)
      window.setTimeout(() => sirBul('lamba'), 2400)
    }
  }
  dugme.addEventListener('click', () => yak())
  // daha önce yakıldıysa yanık kalsın
  if (oku('lamba', false)) {
    const bekle = () => (kule() ? yak(true) : window.setTimeout(bekle, 400))
    ScrollTrigger.create({ trigger: bolum, start: 'top 150%', once: true, onEnter: bekle })
  }

  // Sır: Kız Kulesi'ne beş kez dokun
  let sayac = 0
  let sifirla = 0
  const bagla = () => {
    const k = kule()
    if (!k) return window.setTimeout(bagla, 500)
    k.onKuleDokun = () => {
      sayac++
      ses.nota(74 + sayac * 2, 0.03)
      clearTimeout(sifirla)
      sifirla = window.setTimeout(() => (sayac = 0), 2500)
      if (sayac >= 5) {
        sayac = 0
        sirBul('kule')
      }
    }
  }
  ScrollTrigger.create({ trigger: bolum, start: 'top 150%', once: true, onEnter: () => bagla() })
}
