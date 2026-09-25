import { dosyaOlcu, dosyaUrl, type Album, type Kucuk } from '../cekirdek/album'
import { albumBolumu } from './album-ortak'
import { $, $$, belir, kacir, satirSatir } from './yardimci'

/** BAKÜ'DEKİ İZLERİMİZ — Eln'in Bakü'de adımızı yazdığı yerler, en altta küçük şeylerimiz */
export function izlerHTML() {
  return /* html */ `
  <section id="izler" class="bolum" data-bolum="" data-ad="Bakü’deki İzlerimiz">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Bakü’deki izlerimiz</p>
        <h2 class="baslik">Adımızı <em>Bakü’ye</em> yazmışsın.</h2>
        <p class="metin">Ben İstanbul’dayken sen Bakü’de duvarlara, not kâğıtlarına, oyuncak tahtalarına bizi yazmışsın. Hepsini buraya topladım. En alttakiler de küçük şeylerimiz.</p>
      </div>
      <div class="album-alan" data-album></div>
    </div>
  </section>`
}

export function izlerKur() {
  const bolum = $('#izler')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('[data-album]', bolum)])
  albumBolumu(bolum, ciz)
}

const resimHTML = (id: string, alt: string) => {
  const o = dosyaOlcu(id)
  return `<span class="iz-resim" style="aspect-ratio:${o?.en ?? 1}/${o?.boy ?? 1}"><img data-id="${id}" alt="${kacir(alt)}" decoding="async"/></span>`
}

function kucukHTML(k: Kucuk) {
  if (k.tip === 'sarki')
    return /* html */ `
      <figure class="kc kc-sarki">
        <div class="kc-calar">
          <span class="kc-kapak" aria-hidden="true">♪</span>
          <div><b>${kacir(k.sarki)}</b><small>${kacir(k.sanatci)}</small></div>
          <span class="kc-dalga" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span class="kc-cubuk"><i></i></span>
        </div>
        <div class="kc-bildirim"><span class="kc-ig" aria-hidden="true"></span><div><b>aşkişim 💗</b><small>${kacir(k.bildirim)}</small></div><em>şimdi</em></div>
        <figcaption class="el">${kacir(k.not)}</figcaption>
      </figure>`
  if (k.tip === 'not')
    return /* html */ `
      <figure class="kc kc-not">
        <div class="kc-kagit"><p>${kacir(k.metin)}</p><p class="kc-imza">${kacir(k.imza)}</p></div>
        <figcaption class="el">${kacir(k.not)}</figcaption>
      </figure>`
  return /* html */ `
    <figure class="kc kc-foto">
      ${resimHTML(k.id, 'Among Us’ta yan yana iki karakter: arda ve elnos')}
      <figcaption class="el">${kacir(k.not)}</figcaption>
    </figure>`
}

function ciz(a: Album, alan: HTMLElement) {
  alan.innerHTML = /* html */ `
    <ol class="iz-liste">
      ${a.izler
        .map(
          (z, i) => `<li class="iz" style="--r:${[-2.5, 2, -1.5, 2.5][i % 4]}deg">
            <span class="iz-bant" aria-hidden="true"></span>
            ${resimHTML(z.id, z.baslik)}
            <div class="iz-yazi"><b class="el">${kacir(z.baslik)}</b><p>${kacir(z.not)}</p></div>
          </li>`,
        )
        .join('')}
    </ol>
    <p class="iz-soz el">Bir gün İstanbul’da bir duvara ben de yazacağım: E+A. Sonra ikimiz, aynı duvara.</p>
    <h3 class="kc-baslik">Küçük şeylerimiz</h3>
    <div class="kc-liste">${a.kucukler.map(kucukHTML).join('')}</div>`
  const io = new IntersectionObserver(
    (g) => {
      for (const x of g) {
        if (!x.isIntersecting) continue
        io.unobserve(x.target)
        const img = x.target as HTMLImageElement
        void dosyaUrl(img.dataset.id!).then((u) => {
          if (u) img.src = u
        })
      }
    },
    { rootMargin: '700px 0px' },
  )
  $$<HTMLImageElement>('img[data-id]', alan).forEach((i) => io.observe(i))
  belir($$('.iz', alan), { stagger: 0.12 })
  belir($$('.kc', alan), { stagger: 0.1 })
  belir([$('.iz-soz', alan), $('.kc-baslik', alan)])
}
