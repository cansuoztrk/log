import { ICERIK } from '../icerik'
import { ses } from '../cekirdek/ses'
import { $, $$, belir, satirSatir } from './yardimci'

const { fotograflar } = ICERIK

/** Ekran görüntülerimiz — fotoğraf eklenmemişse bölüm hiç görünmez */
export function karelerHTML() {
  if (!fotograflar.length) return ''
  return /* html */ `
  <section id="kareler" class="bolum" data-bolum="" data-ad="Ekran Görüntülerimiz">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Ekran görüntülerimiz</p>
        <h2 class="baslik">Birlikte hiç fotoğrafımız yok. <em>Henüz.</em></h2>
        <p class="metin">Ama ekran görüntülerimiz var. Her biri, iki şehrin aynı karede durduğu bir an. Birine dokun.</p>
      </div>
      <div class="polaroidler">
        ${fotograflar
          .map(
            (f, i) => `<button class="polaroid" type="button" style="--r:${((i * 7) % 9) - 4}deg">
              <img src="${f.dosya}" alt="${f.not ?? 'Ekran görüntümüz'}" loading="lazy" decoding="async"/>
              <span class="el">${f.not ?? ''}</span>
            </button>`,
          )
          .join('')}
      </div>
    </div>
  </section>`
}

export function karelerKur() {
  const bolum = document.querySelector<HTMLElement>('#kareler')
  if (!bolum) return
  satirSatir($('.baslik', bolum))
  belir($('.bolum-bas .metin', bolum))
  const kartlar = $$('.polaroid', bolum)
  belir(kartlar, { stagger: 0.08 })
  // Büyütme: kartın bir kopyası en üst katmanda açılır
  for (const k of kartlar) {
    k.addEventListener('click', () => {
      const kutu = document.createElement('div')
      kutu.className = 'polaroid-kutu'
      const kopya = k.cloneNode(true) as HTMLElement
      kopya.classList.add('buyuk')
      kutu.appendChild(kopya)
      document.body.appendChild(kutu)
      ses.nota(81, 0.03)
      kutu.addEventListener('click', () => kutu.remove())
    })
  }
}
