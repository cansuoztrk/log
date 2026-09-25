import type { Album, Mesaj, Sohbet } from '../cekirdek/album'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { albumBolumu } from './album-ortak'
import { $, $$, azHareket, belir, gsap, kacir, satirSatir, titret } from './yardimci'

/** MESAJLARIMIZDAN — yazıştıklarımız, olduğu gibi (harf hataları dahil), balon balon yeniden */
export function mesajlarHTML() {
  return /* html */ `
  <section id="mesajlar" class="bolum" data-bolum="" data-ad="Mesajlarımızdan">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Mesajlarımızdan</p>
        <h2 class="baslik">Hiç yan yana oturmadık. <em>Ama çok yazıştık.</em></h2>
        <p class="metin">Bazı konuşmalarımızı buraya olduğu gibi koydum: harf hataları, uzayan “mmmm”ler, büyük harfle bağırmalar dahil. Hiçbirini düzeltmedim, çünkü hepsi tam öyle güzel. Bir konuşma seç, yeniden yaşansın.</p>
      </div>
      <div class="album-alan" data-album></div>
    </div>
  </section>`
}

const bekle = (ms: number) => new Promise((r) => window.setTimeout(r, ms))
const sinirla = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))

function balonHTML(m: Mesaj, sonGrup: boolean) {
  return `<div class="mj-m ${m.k === 'a' ? 'o' : 'ben'}${m.buyuk ? ' buyuk' : ''}${sonGrup ? ' son' : ''}">
    ${m.k === 'a' ? `<span class="mj-av" aria-hidden="true">${sonGrup ? 'A' : ''}</span>` : ''}
    <div class="mj-govde">
      ${m.y ? `<span class="mj-yanit">${kacir(m.y)}</span>` : ''}
      <span class="mj-balon">${kacir(m.t)}</span>
      ${m.yildiz ? '<span class="mj-yildiz" title="Yıldızladın">★</span>' : ''}
    </div>
  </div>`
}

export function mesajlarKur() {
  const bolum = $('#mesajlar')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('[data-album]', bolum)])
  albumBolumu(bolum, (a, alan) => ciz(a, alan))
}

function ciz(a: Album, alan: HTMLElement) {
  const izlenen = new Set(oku<string[]>('izlenenSohbetler', []))
  alan.innerHTML = /* html */ `
    <div class="mj">
      <div class="mj-sekmeler" role="tablist" aria-label="Konuşmalar" data-lenis-prevent>
        ${a.sohbetler
          .map((s, i) => `<button type="button" role="tab" data-i="${i}" class="${izlenen.has(s.id) ? 'izlendi' : ''}">${kacir(s.baslik)}</button>`)
          .join('')}
      </div>
      <div class="mj-telefon">
        <header class="mj-bas">
          <span class="mj-av buyuk-av" aria-hidden="true">A</span>
          <div><b>aşkişim 💗</b><small class="mj-durum">çevrimiçi</small></div>
          <span class="mj-sayac"></span>
        </header>
        <div class="mj-akis" data-lenis-prevent aria-live="polite"></div>
      </div>
      <p class="mj-son el"></p>
      <div class="mj-alt">
        <button class="dugme hayalet mj-tekrar" type="button"><span>Yeniden</span></button>
        <button class="dugme mj-sonraki" type="button"><span>Sonraki konuşma →</span></button>
      </div>
    </div>`
  const akis = $('.mj-akis', alan)
  const sonEl = $('.mj-son', alan)
  const durum = $('.mj-durum', alan)
  const sayac = $('.mj-sayac', alan)
  const sekmeler = $$<HTMLButtonElement>('.mj-sekmeler button', alan)
  let simdiki = 0
  let jeton = 0

  const asagi = () => akis.scrollTo({ top: akis.scrollHeight, behavior: azHareket ? 'auto' : 'smooth' })

  const bitti = (s: Sohbet) => {
    if (s.son) {
      sonEl.textContent = s.son
      gsap.fromTo(sonEl, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power2.out' })
    }
    durum.textContent = 'çevrimiçi'
    if (!izlenen.has(s.id)) {
      izlenen.add(s.id)
      yaz('izlenenSohbetler', [...izlenen])
      sekmeler[simdiki].classList.add('izlendi')
      if (izlenen.size >= a.sohbetler.length) window.setTimeout(() => sirBul('sohbet'), 900)
    }
  }

  const oynat = async (i: number) => {
    const j = ++jeton
    simdiki = i
    const s = a.sohbetler[i]
    sekmeler.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)))
    // yalnızca sekme şeridi yana kayar (scrollIntoView bütün sayfayı da kaydırıyordu)
    const serit = sekmeler[i].parentElement!
    serit.scrollTo({ left: sekmeler[i].offsetLeft - serit.clientWidth / 2 + sekmeler[i].offsetWidth / 2, behavior: azHareket ? 'auto' : 'smooth' })
    sayac.textContent = `${i + 1}/${a.sohbetler.length}`
    akis.innerHTML = `<p class="mj-gun">${kacir(s.baslik)}</p>`
    sonEl.textContent = ''
    gsap.set(sonEl, { autoAlpha: 0 })
    const grupSonu = (k: number) => s.mesajlar[k + 1]?.k !== s.mesajlar[k].k
    if (azHareket) {
      akis.insertAdjacentHTML('beforeend', s.mesajlar.map((m, k) => balonHTML(m, grupSonu(k))).join(''))
      asagi()
      bitti(s)
      return
    }
    await bekle(500)
    for (let k = 0; k < s.mesajlar.length; k++) {
      const m = s.mesajlar[k]
      if (j !== jeton) return
      if (m.k === 'a') {
        // Arda yazıyor…
        durum.textContent = 'yazıyor…'
        akis.insertAdjacentHTML('beforeend', '<div class="mj-m o mj-yaziyor son"><span class="mj-av" aria-hidden="true">A</span><span class="mj-balon"><i></i><i></i><i></i></span></div>')
        asagi()
        await bekle(sinirla(420 + m.t.length * 26, 700, 2300))
        akis.querySelector('.mj-yaziyor')?.remove()
        durum.textContent = 'çevrimiçi'
      } else await bekle(sinirla(260 + m.t.length * 10, 420, 1100))
      if (j !== jeton) return
      // avatar yalnızca bir kişinin art arda mesajlarının sonuncusunda (konuşmanın tamamı baştan belli)
      akis.insertAdjacentHTML('beforeend', balonHTML(m, grupSonu(k)))
      const yeni = akis.lastElementChild as HTMLElement
      gsap.from(yeni, { y: 14, scale: 0.92, autoAlpha: 0, duration: 0.45, ease: 'back.out(1.8)', transformOrigin: m.k === 'a' ? 'left bottom' : 'right bottom' })
      if (m.k === 'a') ses.damla()
      else ses.tik()
      if (m.yildiz) titret(10)
      asagi()
    }
    if (j === jeton) bitti(s)
  }

  alan.querySelector('.mj-sekmeler')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-i]')
    if (b) void oynat(+b.dataset.i!)
  })
  $('.mj-tekrar', alan).addEventListener('click', () => void oynat(simdiki))
  $('.mj-sonraki', alan).addEventListener('click', () => void oynat((simdiki + 1) % a.sohbetler.length))

  // bölüm göründüğünde ilk izlenmemiş konuşma kendiliğinden başlar
  let basladi = false
  const io = new IntersectionObserver(
    (g) => {
      if (basladi || !g.some((x) => x.isIntersecting)) return
      basladi = true
      io.disconnect()
      const ilk = a.sohbetler.findIndex((s) => !izlenen.has(s.id))
      void oynat(ilk < 0 ? 0 : ilk)
    },
    { threshold: 0.35 },
  )
  io.observe($('.mj-telefon', alan))
}
