import { dosyaOlcu, dosyaUrl, type Album } from '../cekirdek/album'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { albumBolumu } from './album-ortak'
import { $, $$, belir, gsap, ikon, kacir, satirSatir } from './yardimci'

/** SENİN GÖZÜNDEN — Eln'in kendi çektiği fotoğraflar; her birinin altında Arda'nın ona söylediği bir söz */
export function gozundenHTML() {
  return /* html */ `
  <section id="gozunden" class="bolum" data-bolum="" data-ad="Senin Gözünden">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Senin gözünden</p>
        <h2 class="baslik">Bu fotoğrafları sen çektin. <em>Ben baktım.</em></h2>
        <p class="metin">Hepsini sen gönderdin; ben de her birine defalarca baktım. Altlarına, sana bir gün söylediğim birer cümleyi yazdım. Birine dokun, büyüsün.</p>
      </div>
      <div class="album-alan" data-album></div>
    </div>
  </section>`
}

export function gozundenKur() {
  const bolum = $('#gozunden')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('[data-album]', bolum)])
  albumBolumu(bolum, ciz)
}

function ciz(a: Album, alan: HTMLElement) {
  alan.innerHTML = /* html */ `
    <div class="gz-duvar">
      ${a.fotolar
        .map((f, i) => {
          const o = dosyaOlcu(f.id)
          return `<button class="gz-kart" type="button" data-i="${i}" style="--r:${[-3, 2.5, -1.5, 3, -2.5, 1.5, -1][i % 7]}deg">
            <span class="gz-resim" style="aspect-ratio:${o?.en ?? 3}/${o?.boy ?? 4}"><img alt="${kacir(f.alt ?? 'Eln')}" decoding="async" /></span>
            <span class="gz-not el">${kacir(f.not ?? '')}</span>
          </button>`
        })
        .join('')}
    </div>`
  const kartlar = $$<HTMLButtonElement>('.gz-kart', alan)
  gsap.from(kartlar, { y: 40, autoAlpha: 0, rotate: 0, duration: 1, stagger: 0.09, ease: 'power3.out' })

  // resimler ekrana yaklaştıkça çözülür
  const io = new IntersectionObserver(
    (g) => {
      for (const x of g) {
        if (!x.isIntersecting) continue
        io.unobserve(x.target)
        const i = +(x.target as HTMLElement).dataset.i!
        const img = x.target.querySelector('img')!
        void dosyaUrl(a.fotolar[i].id).then((u) => {
          if (!u) return
          img.src = u
          img.onload = () => x.target.classList.add('yuklendi')
        })
      }
    },
    { rootMargin: '700px 0px' },
  )
  kartlar.forEach((k) => io.observe(k))

  const gorulen = new Set(oku<string[]>('gorulenFotolar', []))
  alan.addEventListener('click', (e) => {
    const k = (e.target as Element).closest<HTMLElement>('.gz-kart')
    if (k) buyut(a, +k.dataset.i!, gorulen)
  })
}

/** Tam ekran: kaydırarak ya da oklarla gezilir */
function buyut(a: Album, bas: number, gorulen: Set<string>) {
  let i = bas
  const kutu = document.createElement('div')
  kutu.className = 'gz-kutu'
  kutu.setAttribute('role', 'dialog')
  kutu.setAttribute('aria-label', 'Fotoğraf')
  kutu.setAttribute('data-lenis-prevent', '')
  kutu.innerHTML = /* html */ `
    <button class="ikon-dugme gz-kapat" type="button" aria-label="Kapat">${ikon('kapat')}</button>
    <figure class="gz-cerceve">
      <img alt="" />
      <figcaption class="el"></figcaption>
    </figure>
    <button class="gz-ok sol" type="button" aria-label="Önceki">‹</button>
    <button class="gz-ok sag" type="button" aria-label="Sonraki">›</button>
    <p class="gz-sira"></p>`
  document.body.appendChild(kutu)
  document.body.classList.add('modal-acik')
  const img = $<HTMLImageElement>('img', kutu)
  const yazi = $('figcaption', kutu)
  const sira = $('.gz-sira', kutu)

  const goster = async (yon = 0) => {
    const f = a.fotolar[i]
    sira.textContent = `${i + 1} / ${a.fotolar.length}`
    yazi.textContent = f.not ?? ''
    img.alt = f.alt ?? 'Eln'
    gsap.fromTo($('.gz-cerceve', kutu), { x: yon * 40, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.45, ease: 'power2.out' })
    const u = await dosyaUrl(f.id)
    if (u && a.fotolar[i] === f) img.src = u
    gsap.fromTo(yazi, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.4, delay: 0.25, ease: 'power2.out' })
    if (!gorulen.has(f.id)) {
      gorulen.add(f.id)
      yaz('gorulenFotolar', [...gorulen])
      if (a.fotolar.every((x) => gorulen.has(x.id))) window.setTimeout(() => sirBul('gozunden'), 1500)
    }
  }
  const git = (d: number) => {
    i = (i + d + a.fotolar.length) % a.fotolar.length
    ses.nota(d > 0 ? 83 : 79, 0.025)
    void goster(d)
  }
  const kapat = () => {
    window.removeEventListener('keydown', tus)
    document.body.classList.remove('modal-acik')
    gsap.to(kutu, { autoAlpha: 0, duration: 0.3, onComplete: () => kutu.remove() })
  }
  const tus = (e: KeyboardEvent) => {
    if (e.key === 'Escape') kapat()
    else if (e.key === 'ArrowRight') git(1)
    else if (e.key === 'ArrowLeft') git(-1)
  }
  window.addEventListener('keydown', tus)
  $('.gz-kapat', kutu).addEventListener('click', kapat)
  $('.gz-ok.sol', kutu).addEventListener('click', () => git(-1))
  $('.gz-ok.sag', kutu).addEventListener('click', () => git(1))
  kutu.addEventListener('click', (e) => {
    if (e.target === kutu) kapat()
  })
  // parmakla kaydırma
  let x0: number | null = null
  kutu.addEventListener('pointerdown', (e) => (x0 = e.clientX))
  kutu.addEventListener('pointerup', (e) => {
    if (x0 === null) return
    const d = e.clientX - x0
    x0 = null
    if (Math.abs(d) > 50) git(d < 0 ? 1 : -1)
  })
  gsap.from(kutu, { autoAlpha: 0, duration: 0.35 })
  ses.nota(81, 0.03)
  void goster()
}
