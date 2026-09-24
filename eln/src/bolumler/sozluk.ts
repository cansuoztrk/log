import { ICERIK } from '../icerik'
import { SOZLUK, type Madde } from '../sozluk'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { ardayaYaz } from '../cekirdek/posta'
import { isoGun, simdi, tarihYazi, yerel } from '../cekirdek/zaman'
import { $, $$, belir, gsap, kacir, satirSatir, ScrollTrigger, titret } from './yardimci'

const { ben, sen } = ICERIK

interface EkMadde {
  kelime: string
  anlam: string
  tarih: string
}

/** Sözlük sırası: önce işaretler ve sayılar, sonra Türk alfabesi */
const sirala = (a: string, b: string) => a.localeCompare(b, 'tr', { sensitivity: 'base', numeric: true })

function maddeHTML(m: Madde) {
  return /* html */ `
    <article class="sm${m.onde ? ' sm-onde' : ''}">
      <h3><b>${m.kelime}</b>${m.okunus ? ` <span class="sm-okunus">/${m.okunus}/</span>` : ''} <i class="sm-tur">${m.tur}</i></h3>
      ${m.anlamlar.length > 1 ? `<ol>${m.anlamlar.map((a) => `<li>${a}</li>`).join('')}</ol>` : `<p>${m.anlamlar[0]}</p>`}
      ${m.ornek ? `<p class="sm-ornek">${m.ornek}</p>` : ''}
      ${m.bkz ? `<p class="sm-bkz">bkz. <em>${m.bkz}</em></p>` : ''}
    </article>`
}

function ekHTML(e: EkMadde) {
  return /* html */ `
    <article class="sm sm-ek">
      <h3><b>${kacir(e.kelime)}</b></h3>
      <p>${kacir(e.anlam)}</p>
      <p class="sm-ekleyen">— ${sen.ad} ekledi, ${tarihYazi(e.tarih)}</p>
    </article>`
}

export function sozlukHTML() {
  const maddeler = SOZLUK.slice().sort((a, b) => Number(!!b.onde) - Number(!!a.onde) || sirala(a.kelime, b.kelime))
  const ekler = oku<EkMadde[]>('sozluk', [])
  return /* html */ `
  <section id="sozluk" class="bolum" data-bolum="" data-ad="Sözlüğümüz">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Sözlüğümüz</p>
        <h2 class="baslik">İki kişilik <em>bir dil</em>.</h2>
        <p class="metin">Her çiftin kendi kelimeleri olur; başkası duysa anlamaz. Bizimkiler burada. TDK onaylı değil; ${ben.ad} ve ${sen.ad} onaylı.</p>
      </div>
      <div class="sozluk-sayfa">
        <header class="sozluk-bas"><span>${sen.ad}–${ben.ad} Sözlüğü</span><span>Birinci baskı · ${maddeler.length + ekler.length} madde</span></header>
        <div class="sozluk-maddeler kisa">
          ${maddeler.map(maddeHTML).join('')}
          ${ekler.map(ekHTML).join('')}
        </div>
        <button class="sozluk-devam" type="button">Sözlüğün tamamı ↓</button>
        <form class="sozluk-ekle" autocomplete="off">
          <p class="sozluk-ekle-bas">Eksik bir kelime mi var? <em>Ekle.</em></p>
          <label class="gorunmez" for="sozluk-kelime">Kelime</label>
          <input id="sozluk-kelime" name="kelime" maxlength="40" placeholder="kelime" required />
          <label class="gorunmez" for="sozluk-anlam">Anlamı</label>
          <input id="sozluk-anlam" name="anlam" maxlength="220" placeholder="anlamı (bizde)" required />
          <button class="dugme" type="submit"><span>Sözlüğe ekle</span></button>
          <p class="dipnot sozluk-durum" aria-live="polite"></p>
        </form>
      </div>
    </div>
  </section>`
}

export function sozlukKur() {
  const bolum = $('#sozluk')
  satirSatir($('.baslik', bolum))
  belir($('.bolum-bas .metin', bolum))
  belir($('.sozluk-sayfa', bolum))

  const liste = $('.sozluk-maddeler', bolum)
  const devam = $<HTMLButtonElement>('.sozluk-devam', bolum)
  const ac = () => {
    if (devam.hidden) return
    liste.classList.remove('kisa')
    devam.hidden = true
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }
  devam.addEventListener('click', () => {
    ac()
    ses.vuus(0.6)
  })
  // hepsi zaten sığıyorsa "devamı" düğmesine gerek yok
  void document.fonts.ready.then(() => {
    if (liste.scrollHeight <= liste.clientHeight + 24) ac()
  })

  // bir maddeye dokununca kelime hafifçe parlar
  liste.addEventListener('click', (e) => {
    const m = (e.target as Element).closest<HTMLElement>('.sm')
    if (!m) return
    ses.nota([74, 78, 81, 83, 86][Math.floor(Math.random() * 5)], 0.03)
    gsap.fromTo($('h3 b', m), { color: '#c9415c' }, { color: '#2a1420', duration: 1.4, ease: 'power2.out', clearProps: 'color' })
  })

  const form = $<HTMLFormElement>('.sozluk-ekle', bolum)
  const durum = $('.sozluk-durum', bolum)
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const veri = new FormData(form)
    const kelime = String(veri.get('kelime') ?? '').trim()
    const anlam = String(veri.get('anlam') ?? '').trim()
    if (!kelime || !anlam) return
    const bugun = isoGun(yerel(simdi(), sen.saatDilimi))
    const ek: EkMadde = { kelime, anlam, tarih: bugun }
    const ekler = oku<EkMadde[]>('sozluk', [])
    ekler.push(ek)
    yaz('sozluk', ekler)

    ac()
    liste.insertAdjacentHTML('beforeend', ekHTML(ek))
    const yeni = liste.lastElementChild as HTMLElement
    gsap.from(yeni, { autoAlpha: 0, y: 14, duration: 0.9, ease: 'expo.out' })
    requestAnimationFrame(() => ScrollTrigger.refresh())
    yeni.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    $('.sozluk-bas span:last-child', bolum).textContent = `Birinci baskı · ${$$('.sm', liste).length} madde`

    form.reset()
    ses.cin()
    titret([15, 30, 15])
    void ardayaYaz(`${sen.ad} sözlüğe bir kelime ekledi 📖`, `«${kelime}»: ${anlam}`, ['book']).then((gitti) => {
      durum.textContent = gitti
        ? `Eklendi. ${ben.ad}’nın telefonuna da düştü; ikinci baskıya girer.`
        : 'Eklendi. Sözlüğümüz bir kelime büyüdü.'
    })
    window.setTimeout(() => sirBul('sozluk'), 1200)
  })
}
