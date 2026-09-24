import { ICERIK } from '../icerik'
import { ADIM_KM, type Ziyaret } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { bulunanlar, SIRLAR, sirBul, sirDinle } from '../cekirdek/sirlar'
import { MESAFE, sayi } from '../cekirdek/zaman'
import type { Yildizlar } from '../gl/yildizlar'
import { $, azHareket, belir, gsap, satirSatir, titret } from './yardimci'

const { ben, sen } = ICERIK

export function finalHTML(ziyaret: Ziyaret) {
  const km = Math.min(MESAFE, ziyaret.gunler.length * ADIM_KM)
  return /* html */ `
  <section id="final" class="bolum" data-gl="final" data-ruh="final" data-bolum="XII" data-ad="Kalbim">
    <div class="final-ic">
      <div class="final-ust">
        <p class="etiket"><span class="no">XII</span>Son bir şey</p>
        <p class="satir final-soru">Parmağını kalbin üstüne koy.<br/><em>Ve bırakma.</em></p>
      </div>
      <div class="final-orta">
        <button class="kalp-tut" type="button" aria-label="Kalbe basılı tut">
          <svg class="halka" viewBox="0 0 160 160" aria-hidden="true"><circle class="iz" cx="80" cy="80" r="74"/><circle class="dolu" cx="80" cy="80" r="74"/></svg>
          <svg class="kalp-ikon" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-kalp"/></svg>
        </button>
        <p class="kalp-bpm"><b>72</b> atış / dakika</p>
      </div>
      <div class="final-alt">
        <p class="satir final-a">Bu benim kalp atışım. Seni düşündükçe hızlanıyor.</p>
        <div class="final-son">
          <p class="satir italik">Seni seviyorum, ${sen.ad}. Bugün, yarın; <em>bir saat ileriden ve bir saat geriden</em>.</p>
        </div>
      </div>
    </div>
  </section>

  <footer id="son">
    <div class="icerik-sutun">
      <p class="dev son-baslik">Yarın yine <em>gel</em>.</p>
      <p class="metin">Bu site her gün biraz değişir: yeni bir not, başka bir gökyüzü, belki yeni bir sır. Bazı sırlar sadece belli günlerde, belli saatlerde açılır.</p>
      <div class="son-istatistik">
        <div><b>${sayi(ziyaret.toplam)}</b><span>ziyaret</span></div>
        <div><b class="sir-sayi">${bulunanlar().length}/${SIRLAR.length}</b><span>sır bulundu</span></div>
        <div><b>${sayi(km)}</b><span>km yol aldım sana</span></div>
      </div>
      <div class="son-imza">
        <span class="kaligrafi">${ben.ad}</span>
        <span>${ben.yerelSehir} → ${sen.yerelSehir}</span>
        <small>Işık bu sayfaya da önce senden uğradı.</small>
      </div>
    </div>
  </footer>`
}

export function finalKur(yildiz: () => Yildizlar | null) {
  const bolum = $('#final')
  const dugme = $<HTMLButtonElement>('.kalp-tut', bolum)
  const halka = $<SVGCircleElement>('.halka .dolu', bolum)
  const bpm = $('.kalp-bpm b', bolum)
  const a = $('.final-a', bolum)
  const son = $('.final-son', bolum)
  const cevre = 2 * Math.PI * 74
  halka.style.strokeDasharray = String(cevre)
  halka.style.strokeDashoffset = String(cevre)

  satirSatir($('.final-soru', bolum))
  belir([$('.son-baslik'), $('#son .metin'), $('.son-istatistik'), $('.son-imza')])
  sirDinle(() => ($('.sir-sayi').textContent = `${bulunanlar().length}/${SIRLAR.length}`))

  let tutuyor = false
  let ilerleme = 0
  let tamam = false
  let tamamSure = 0
  let sonAtis = 0
  let son_ = performance.now()
  const SURE = 7.5

  const bitir = () => {
    tamam = true
    dugme.classList.add('tamam')
    ses.cin()
    titret([40, 80, 40, 80, 120])
    gsap.to(a, { autoAlpha: 0, duration: 0.6 })
    gsap.fromTo(son, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 1.6, delay: 0.8, ease: 'expo.out' })
  }

  const dongu = (t: number) => {
    const dt = Math.min(0.25, (t - son_) / 1000)
    son_ = t
    if (tutuyor) ilerleme = Math.min(1, ilerleme + dt / SURE)
    else if (!tamam) ilerleme = Math.max(0, ilerleme - dt / 3)
    const y = yildiz()
    if (y) {
      y.yazi = ilerleme > 0.15 ? 1 : 0
      y.kalp = ilerleme >= 1 ? 1 : 0
    }
    halka.style.strokeDashoffset = String(cevre * (1 - ilerleme))
    const hiz = 72 + ilerleme * 38
    bpm.textContent = String(Math.round(tutuyor || tamam ? hiz : 72))
    // kalp atışı
    if ((tutuyor || tamam) && t - sonAtis > 60000 / hiz) {
      sonAtis = t
      ses.kalp(tutuyor ? 1 : 0.5)
      if (tutuyor) titret([28, 150, 18])
      if (y) y.nabiz = 1
      dugme.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' })
    }
    if (tutuyor && ilerleme > 0.08 && !a.classList.contains('gorundu')) {
      a.classList.add('gorundu')
      gsap.to(a, { autoAlpha: 1, y: 0, duration: 1 })
    }
    if (ilerleme >= 1 && !tamam) bitir()
    if (tamam && tutuyor) {
      tamamSure += dt
      if (tamamSure > 8) {
        tamamSure = -1e9
        sirBul('kalp')
      }
    }
    requestAnimationFrame(dongu)
  }
  requestAnimationFrame(dongu)

  const bas = (e: PointerEvent) => {
    e.preventDefault()
    tutuyor = true
    dugme.classList.add('basili')
    ses.baslat()
    try {
      dugme.setPointerCapture(e.pointerId)
    } catch {
      /* yok */
    }
  }
  const birak = () => {
    tutuyor = false
    dugme.classList.remove('basili')
    if (!tamam && ilerleme < 1) tamamSure = 0
  }
  dugme.addEventListener('pointerdown', bas)
  dugme.addEventListener('pointerup', birak)
  dugme.addEventListener('pointercancel', birak)
  dugme.addEventListener('lostpointercapture', birak)
  dugme.addEventListener('contextmenu', (e) => e.preventDefault())
  // klavye: boşluk tuşunu basılı tutmak da olur
  dugme.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      tutuyor = true
    }
  })
  dugme.addEventListener('keyup', birak)
  if (azHareket) gsap.set(a, { autoAlpha: 0 })
  else gsap.set(a, { autoAlpha: 0, y: 12 })
  gsap.set(son, { autoAlpha: 0 })
}
