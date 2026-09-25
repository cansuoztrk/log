import type { Album } from '../cekirdek/album'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { albumBolumu } from './album-ortak'
import { $, $$, azHareket, belir, gsap, kacir, satirSatir, titret } from './yardimci'

/**
 * YILDIZLADIKLARIN — Eln'in yıldızladığı, ekran görüntüsünü alıp sakladığı mesajlar.
 * Gökyüzünde kalp biçiminde bir takımyıldız; her yıldıza dokununca bir mesaj okunur,
 * okundukça çizgiler birleşir, hepsi okununca kalp tamamlanır.
 */
export function yildizladiklarinHTML() {
  return /* html */ `
  <section id="yildizladiklarin" class="bolum" data-bolum="" data-ad="Yıldızladıkların">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Yıldızladıkların</p>
        <h2 class="baslik">Sen mesajlarımı <em>yıldızlıyorsun.</em></h2>
        <p class="metin">Bazılarını yıldızladın, bazılarının ekran görüntüsünü alıp sakladın, birini de yıldızlayamadığın için üzüldün. Hepsini buraya, gökyüzüne astım. Yazarken acele etmişim, harfler eksik kalmış; burada hepsini düzgünce, yeniden yazdım. Yıldızlara dokun.</p>
      </div>
      <div class="album-alan" data-album></div>
    </div>
  </section>`
}

export function yildizladiklarinKur() {
  const bolum = $('#yildizladiklarin')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('[data-album]', bolum)])
  albumBolumu(bolum, ciz)
}

/** Kalp eğrisi: x = 16 sin³t, y = 13 cos t − 5 cos 2t − 2 cos 3t − cos 4t */
const kalpNoktasi = (t: number) => ({
  x: 200 + 10.4 * 16 * Math.sin(t) ** 3,
  y: 168 - 10.4 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
})

const ETIKET = {
  yildiz: '★ Yıldızladın',
  ekran: '📸 Ekran görüntüsünü alıp sakladın',
  yok: '☆ Yıldızlayamamıştın. Ben yıldızladım.',
}

function ciz(a: Album, alan: HTMLElement) {
  const n = a.yildizlar.length
  const noktalar = a.yildizlar.map((_, i) => kalpNoktasi((i / n) * Math.PI * 2))
  // arka plandaki sönük yıldızlar (her açılışta aynı)
  const toz = Array.from({ length: 90 }, (_, i) => {
    const r = (Math.sin(i * 91.7) * 43758.5453) % 1
    const q = (Math.sin(i * 12.3) * 12543.1) % 1
    return { x: Math.abs(r) * 400, y: Math.abs(q) * 380, r: 0.4 + (i % 4) * 0.25, g: 0.2 + (i % 5) * 0.1 }
  })
  const okunan = new Set(oku<number[]>('okunanYildizlar', []).filter((i) => i < n))
  alan.innerHTML = /* html */ `
    <div class="yz">
      <svg class="yz-gok" viewBox="0 0 400 380" role="group" aria-label="Kalp biçiminde bir takımyıldız">
        <defs>
          <radialGradient id="yz-hale"><stop offset="0" stop-color="#fff4e0" stop-opacity=".95"/><stop offset=".35" stop-color="#ffc9d5" stop-opacity=".45"/><stop offset="1" stop-color="#ffc9d5" stop-opacity="0"/></radialGradient>
        </defs>
        <g class="yz-toz">${toz.map((t) => `<circle cx="${t.x.toFixed(1)}" cy="${t.y.toFixed(1)}" r="${t.r}" opacity="${t.g}"/>`).join('')}</g>
        <path class="yz-dolgu" d="${noktalar.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')} Z"/>
        <g class="yz-cizgiler">${noktalar
          .map((p, i) => {
            const q = noktalar[(i + 1) % n]
            return `<line data-i="${i}" x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${q.y.toFixed(1)}"/>`
          })
          .join('')}</g>
        ${noktalar
          .map(
            (p, i) => `<g class="yz-yildiz" data-i="${i}" tabindex="0" role="button" aria-label="${i + 1}. yıldız" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})">
              <circle class="yz-hale" r="16" fill="url(#yz-hale)"/>
              <path class="yz-isik" d="M0 -7 L1.4 -1.4 L7 0 L1.4 1.4 L0 7 L-1.4 1.4 L-7 0 L-1.4 -1.4 Z"/>
              <circle class="yz-vur" r="20"/>
            </g>`,
          )
          .join('')}
      </svg>
      <p class="yz-sayac"><b>${okunan.size}</b> / ${n}</p>
      <article class="yz-kart" aria-live="polite">
        <p class="yz-etiket">Bir yıldıza dokun</p>
        <p class="yz-metin el">Her biri, bir gün sana yazdığım ve senin saklamaya değer bulduğun bir cümle.</p>
      </article>
    </div>`
  const svg = $<SVGSVGElement>('.yz-gok', alan)
  const kart = $('.yz-kart', alan)
  const sayac = $('.yz-sayac b', alan)
  const yildizlar = $$<SVGGElement>('.yz-yildiz', alan)
  const cizgiler = $$<SVGLineElement>('.yz-cizgiler line', alan)

  const cizgileriGuncelle = (canli: boolean) => {
    cizgiler.forEach((c, i) => {
      const acik = okunan.has(i) && okunan.has((i + 1) % n)
      if (acik && !c.classList.contains('acik')) {
        c.classList.add('acik')
        if (canli && !azHareket) {
          const u = c.getTotalLength?.() ?? 60
          gsap.fromTo(c, { strokeDasharray: u, strokeDashoffset: u }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' })
        }
      }
    })
    yildizlar.forEach((y, i) => y.classList.toggle('okundu', okunan.has(i)))
    sayac.textContent = String(okunan.size)
    if (okunan.size === n) svg.classList.add('tamam')
  }
  cizgileriGuncelle(false)

  const sec = (i: number) => {
    const y = a.yildizlar[i]
    yildizlar.forEach((g, k) => g.classList.toggle('secili', k === i))
    kart.querySelector('.yz-etiket')!.textContent = ETIKET[y.kaynak]
    const m = kart.querySelector<HTMLElement>('.yz-metin')!
    m.innerHTML = kacir(y.metin)
    kart.classList.toggle('uzun', y.metin.length > 320)
    gsap.fromTo(kart, { autoAlpha: 0.2, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' })
    if (!azHareket) gsap.fromTo(m, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: Math.min(3, 0.8 + y.metin.length / 220), ease: 'power1.inOut' })
    ses.nota([72, 76, 79, 81, 84, 88][i % 6], 0.035)
    const yeni = !okunan.has(i)
    okunan.add(i)
    yaz('okunanYildizlar', [...okunan])
    cizgileriGuncelle(true)
    if (yeni && okunan.size === n) {
      titret([30, 50, 30, 50, 60])
      ses.cin()
      window.setTimeout(() => {
        kart.querySelector('.yz-etiket')!.textContent = `${n} yıldız, tek bir kalp`
        m.textContent = 'Hepsini okudun. Bu takımyıldızın adı artık Elnos. Gökyüzünde bir kalp var; onu sen yaptın, cümle cümle saklayarak.'
        gsap.fromTo(m, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2 })
        window.dispatchEvent(new CustomEvent('kutla', { detail: 60 }))
        sirBul('takimyildiz')
      }, 2600)
    }
  }
  svg.addEventListener('click', (e) => {
    const g = (e.target as Element).closest<SVGGElement>('.yz-yildiz')
    if (g) sec(+g.dataset.i!)
  })
  svg.addEventListener('keydown', (e) => {
    const g = (e.target as Element).closest<SVGGElement>('.yz-yildiz')
    if (g && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      sec(+g.dataset.i!)
    }
  })
  // yıldızın kendi konumuna (translate) dokunmadan, içindeki ışık büyüyerek belirir
  gsap.from($$('.yz-isik', alan), { scale: 0, transformOrigin: '50% 50%', duration: 0.8, stagger: 0.06, ease: 'back.out(2)', delay: 0.2 })
}
