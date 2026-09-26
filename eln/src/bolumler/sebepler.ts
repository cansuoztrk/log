import { ICERIK } from '../icerik'
import type { Album } from '../cekirdek/album'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { ardayaYaz } from '../cekirdek/posta'
import { type Anlik, tarihYazi } from '../cekirdek/zaman'
import { albumBolumu } from './album-ortak'
import { $, azHareket, belir, gsap, kacir, satirSatir, titret } from './yardimci'

/**
 * SENİ SEVMEMİN SEBEPLERİ — her yeni günde bir kart. İlk gün üç kart; sonra her gün bir tane.
 * Metinler şifreli albümde (hepsi gerçek anlarımızdan). Günler, kilit açılmadan önce de birikir.
 */
const BASTA = 3

interface Acilan {
  i: number
  t: string // açıldığı gün
}

export function sebeplerHTML() {
  return /* html */ `
  <section id="sebepler" class="bolum" data-bolum="" data-ad="Seni Sevmemin Sebepleri">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Seni sevmemin sebepleri</p>
        <h2 class="baslik">Her gün bir tane. <em>Bitmeyecek.</em></h2>
        <p class="metin">Bunları tek tek yazdım, hepsi bizden. Her gün bir kart açılıyor; hepsini bir günde okuyamazsın. Ben de seni bir günde sevmedim.</p>
      </div>
      <div class="album-alan" data-album></div>
    </div>
  </section>`
}

/** Bugünü kart hakkı olarak işler; kaç kart açılabilir */
function hak(toplam: number) {
  return Math.min(toplam, oku<string[]>('sebepGunleri', []).length + BASTA - 1)
}

/** Bugün kartına: açılmayı bekleyen sebep var mı (albüm açıkken) */
export function bekleyenSebep(a: Album | null) {
  const n = a?.sebepler?.length ?? 0
  return n > 0 && oku<Acilan[]>('acikSebepler', []).length < hak(n)
}

export function sebeplerKur(z: Anlik) {
  // her yeni ziyaret günü bir kart hakkı (albüm kilitliyken de birikir)
  const gunler = oku<string[]>('sebepGunleri', [])
  if (!gunler.includes(z.bugun)) yaz('sebepGunleri', [...gunler, z.bugun])
  const bolum = $('#sebepler')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('[data-album]', bolum)])
  albumBolumu(bolum, (a, alan) => ciz(a, alan, z))
}

function ciz(a: Album, alan: HTMLElement, z: Anlik) {
  const liste = a.sebepler ?? []
  if (!liste.length) return
  const n = liste.length
  let acilan = oku<Acilan[]>('acikSebepler', []).filter((x) => x.i < n)
  alan.innerHTML = /* html */ `
    <div class="sb">
      <div class="sb-sahne">
        <div class="sb-kart" role="button" tabindex="0" aria-live="polite">
          <div class="sb-yuz sb-on"></div>
          <div class="sb-yuz sb-arka"></div>
        </div>
      </div>
      <p class="sb-durum"></p>
      <div class="sb-alt">
        <button class="dugme sb-sonraki" type="button" hidden><span>Bir tane daha var</span></button>
      </div>
      <details class="sb-gecmis" hidden>
        <summary>Açtığın sebepler <b></b></summary>
        <ol></ol>
      </details>
    </div>`
  const sahne = $('.sb-sahne', alan)
  const kart = $('.sb-kart', alan)
  const on = $('.sb-on', alan)
  const arka = $('.sb-arka', alan)
  const durum = $('.sb-durum', alan)
  const sonraki = $<HTMLButtonElement>('.sb-sonraki', alan)
  const gecmis = $<HTMLDetailsElement>('.sb-gecmis', alan)

  const arkaYaz = (x: Acilan) => {
    arka.innerHTML = `<small>#${x.i + 1}</small><p class="el">${kacir(liste[x.i])}</p><span class="sb-imza">— ${kacir(ICERIK.ben.ad[0])}. · ${tarihYazi(x.t)}</span>`
  }
  const onYaz = (i: number) => {
    on.innerHTML = `<span class="sb-no">#${i + 1}</span><span class="sb-ne">Seni sevmemin<br/>${i + 1}. sebebi</span><span class="sb-dokun">dokun, çevir</span>`
  }
  const gecmisYaz = () => {
    gecmis.hidden = acilan.length < 2
    $('summary b', gecmis).textContent = `(${acilan.length})`
    $('ol', gecmis).innerHTML = acilan
      .slice()
      .reverse()
      .map((x) => `<li value="${x.i + 1}"><p>${kacir(liste[x.i])}</p></li>`)
      .join('')
  }
  const durumYaz = () => {
    const h = hak(n)
    sonraki.hidden = !(acilan.length < h && kart.classList.contains('cevrildi'))
    if (acilan.length >= n) durum.textContent = `${n} sebebin hepsini okudun. Yenilerini yazıyorum; bitmeyecek demiştim.`
    else if (acilan.length >= h) durum.textContent = `Yarın yeni bir kart açılacak. Daha ${n - acilan.length} tane var.`
    else durum.textContent = ''
  }
  // açılış hâli: bekleyen kart varsa kapalı; yoksa son açılan yüzü dönük
  const hazirla = () => {
    const h = hak(n)
    if (acilan.length < h) {
      kart.classList.remove('cevrildi')
      onYaz(acilan.length)
    } else if (acilan.length) {
      kart.classList.add('cevrildi')
      arkaYaz(acilan[acilan.length - 1])
    }
    durumYaz()
    gecmisYaz()
  }
  hazirla()

  const cevir = () => {
    if (kart.classList.contains('cevrildi') || acilan.length >= hak(n)) return
    const x: Acilan = { i: acilan.length, t: z.bugun }
    acilan = [...acilan, x]
    yaz('acikSebepler', acilan)
    arkaYaz(x)
    kart.classList.add('cevrildi')
    if (!azHareket) gsap.fromTo($('p', arka), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 2.2, delay: 0.5, ease: 'power1.inOut' })
    ses.vuus(0.8)
    window.setTimeout(() => ses.nota(81, 0.035), 400)
    titret(15)
    durumYaz()
    gecmisYaz()
    if (acilan.length === 1) {
      window.setTimeout(() => sirBul('sebep'), 2500)
      void ardayaYaz(`${ICERIK.sen.ad} seni sevme sebeplerini okumaya başladı 💌`, 'Her gün bir kart açılacak.', ['love_letter'])
    }
    if (acilan.length === n) window.dispatchEvent(new CustomEvent('kutla', { detail: 80 }))
  }
  kart.addEventListener('click', cevir)
  kart.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      cevir()
    }
  })
  sonraki.addEventListener('click', () => {
    ses.tik()
    // kart dış kapla kayar; içindeki çevirme (CSS) bu sırada anında sıfırlanır
    gsap.to(sahne, {
      x: -40,
      autoAlpha: 0,
      duration: 0.35,
      onComplete: () => {
        kart.classList.add('anlik')
        hazirla()
        void kart.offsetWidth
        kart.classList.remove('anlik')
        gsap.fromTo(sahne, { x: 40, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.45, ease: 'power2.out' })
      },
    })
  })
}
