import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { ardayaResim, kimim } from '../cekirdek/posta'
import { $, $$, belir, gsap, paylasVeyaIndir, satirSatir, titret } from './yardimci'

/**
 * ÇİZİM TAHTASI — oyuncakçıdaki o sarı manyetik tahta gibi: parmakla çizilir, alttaki sürgüyle silinir.
 * Birlikte çizip tahmin ettiğimiz oyunlardaki gibi Eln bir kelime ister (yalnızca o görür), çizer ve gönderir;
 * çizim Arda'nın telefonuna resim olarak düşer, Arda tahmin etmeye çalışır.
 */
const KELIMELER = [
  'çay bardağı', 'zambak', 'Kız Kulesi', 'nar', 'dolunay', 'uçak', 'simit', 'kedi', 'kalp', 'balkon',
  'kulaklık', 'kuş', 'yıldız', 'fener', 'güneş', 'doğum günü pastası', 'şemsiye', 'telefon', 'bulut', 'köprü',
  'ayçiçeği', 'dondurma', 'ev', 'gemi', 'saat', 'deniz', 'mektup', 'yüzük', 'kardan adam', 'balon',
  'kelebek', 'gözlük', 'bavul', 'havalimanı', 'sarılma', 'el ele', 'uyuyan biri', 'gülümseme', 'çiçek buketi', 'Alev Kuleleri',
]
const ZEMIN = '#dcdad4'
const MUREKKEP = '#4b4f57'

interface Cizim {
  t: string // tarih
  r: string // küçük önizleme (data URL)
}

export function tahtaHTML() {
  return /* html */ `
  <section id="tahta" class="bolum" data-bolum="" data-ad="Çizim Tahtası">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Çizim tahtası</p>
        <h2 class="baslik">Bana bir şey çiz. <em>Ben tahmin edeyim.</em></h2>
        <p class="metin">Hani oyuncakçıda bir tahtaya bile bizi yazmıştın ya; bu da onun gibi. Parmağınla çiz, alttaki sürgüyle sil. İstersen bir kelime iste: yalnızca sen görürsün. Çiz ve bana gönder; telefonuma resim olarak düşer, ne olduğunu ben bulmaya çalışırım.</p>
      </div>
      <div class="tahta" data-dom>
        <div class="tahta-cerceve">
          <span class="tahta-goz sol" aria-hidden="true"></span>
          <span class="tahta-goz sag" aria-hidden="true"></span>
          <span class="tahta-gaga" aria-hidden="true"></span>
          <div class="tahta-yuzey">
            <canvas class="tahta-tuval" aria-label="Çizim tahtası: parmağınla çiz"></canvas>
          </div>
          <label class="tahta-surgu">
            <span class="gorunmez">Tahtayı sil</span>
            <input type="range" min="0" max="100" value="0" />
          </label>
        </div>
        <div class="tahta-arac">
          <button class="tahta-kelime-iste dugme hayalet" type="button"><span aria-hidden="true">🎲</span><span>Kelime iste</span></button>
          <p class="tahta-kelime" hidden></p>
          <div class="tahta-kalem" role="radiogroup" aria-label="Kalem kalınlığı">
            <button type="button" data-k="3" aria-label="İnce kalem" aria-checked="false" role="radio"><i style="--k:3px"></i></button>
            <button type="button" data-k="7" aria-label="Orta kalem" aria-checked="true" role="radio"><i style="--k:7px"></i></button>
            <button type="button" data-k="14" aria-label="Kalın kalem" aria-checked="false" role="radio"><i style="--k:14px"></i></button>
          </div>
          <button class="tahta-gonder dugme" type="button"><span aria-hidden="true">🎨</span><span>${kimim() === 'arda' ? 'Kaydet' : `${ICERIK.ben.ad}’ya gönder`}</span></button>
        </div>
        <p class="tahta-durum" aria-live="polite"></p>
        <div class="tahta-gecmis" hidden><p>Gönderdiklerin</p><div class="tg-liste"></div></div>
      </div>
    </div>
  </section>`
}

export function tahtaKur() {
  const bolum = $('#tahta')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('.tahta', bolum)])
  const tuval = $<HTMLCanvasElement>('.tahta-tuval', bolum)
  const surgu = $<HTMLInputElement>('.tahta-surgu input', bolum)
  const kelimeEl = $('.tahta-kelime', bolum)
  const durum = $('.tahta-durum', bolum)
  const gonder = $<HTMLButtonElement>('.tahta-gonder', bolum)
  const gecmis = $('.tahta-gecmis', bolum)
  let kalinlik = 7
  let kelime = ''
  let cizildi = false
  let px = 1

  const x = () => tuval.getContext('2d')!
  const olc = () => {
    const r = tuval.getBoundingClientRect()
    if (!r.width) return
    // döndürünce çizim kaybolmasın
    const eski = document.createElement('canvas')
    eski.width = tuval.width
    eski.height = tuval.height
    if (tuval.width) eski.getContext('2d')!.drawImage(tuval, 0, 0)
    px = Math.min(window.devicePixelRatio || 1, 2)
    tuval.width = Math.round(r.width * px)
    tuval.height = Math.round(r.height * px)
    const c = x()
    c.setTransform(1, 0, 0, 1, 0, 0)
    if (eski.width) c.drawImage(eski, 0, 0, tuval.width, tuval.height)
    c.setTransform(px, 0, 0, px, 0, 0)
  }
  new ResizeObserver(olc).observe(tuval)

  // ─── çizim ───
  let son: { x: number; y: number } | null = null
  const nokta = (e: PointerEvent) => {
    const r = tuval.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const cizgi = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const c = x()
    c.strokeStyle = MUREKKEP
    c.fillStyle = MUREKKEP
    c.lineWidth = kalinlik
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.beginPath()
    c.moveTo(a.x, a.y)
    c.lineTo(b.x, b.y)
    c.stroke()
  }
  tuval.addEventListener('pointerdown', (e) => {
    tuval.setPointerCapture(e.pointerId)
    son = nokta(e)
    cizgi(son, { x: son.x + 0.01, y: son.y })
    if (!cizildi) {
      cizildi = true
      durum.textContent = ''
    }
  })
  tuval.addEventListener('pointermove', (e) => {
    if (!son) return
    const n = nokta(e)
    cizgi(son, n)
    son = n
  })
  const birak = () => (son = null)
  tuval.addEventListener('pointerup', birak)
  tuval.addEventListener('pointercancel', birak)

  // ─── sürgüyle silme: oyuncaktaki gibi soldan sağa ───
  surgu.addEventListener('input', () => {
    const v = +surgu.value / 100
    const r = tuval.getBoundingClientRect()
    x().clearRect(0, 0, r.width * v, r.height)
    if (v > 0.95) {
      cizildi = false
      x().clearRect(0, 0, r.width, r.height)
    }
  })
  const surguGeri = () => {
    if (+surgu.value > 0) {
      ses.kazi()
      titret(12)
    }
    gsap.to(surgu, { value: 0, duration: 0.5, ease: 'power2.out', onUpdate: () => surgu.dispatchEvent(new Event('change')) })
  }
  surgu.addEventListener('pointerup', surguGeri)
  surgu.addEventListener('touchend', surguGeri)
  surgu.addEventListener('keyup', surguGeri)

  // ─── kalem ───
  const kalemler = $$<HTMLButtonElement>('.tahta-kalem button', bolum)
  for (const b of kalemler)
    b.addEventListener('click', () => {
      kalinlik = +b.dataset.k!
      kalemler.forEach((k) => k.setAttribute('aria-checked', String(k === b)))
      ses.tik()
    })

  // ─── gizli kelime ───
  $('.tahta-kelime-iste', bolum).addEventListener('click', () => {
    let yeni = kelime
    while (yeni === kelime) yeni = KELIMELER[Math.floor(Math.random() * KELIMELER.length)]
    kelime = yeni
    kelimeEl.hidden = false
    kelimeEl.innerHTML = `Çiz: <b>${kelime}</b> <small>(${ICERIK.ben.ad} görmüyor 🤫)</small>`
    gsap.fromTo(kelimeEl, { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, duration: 0.4 })
    ses.nota(84, 0.03)
  })

  // ─── gönderilenler (yalnızca bu telefonda) ───
  const gecmisCiz = () => {
    const l = oku<Cizim[]>('cizimler', [])
    gecmis.hidden = !l.length
    $('.tg-liste', gecmis).innerHTML = l
      .slice()
      .reverse()
      .map((c) => `<img src="${c.r}" alt="${c.t} tarihli çizim" loading="lazy" />`)
      .join('')
  }
  gecmisCiz()

  // ─── gönder ───
  const resimAl = async (en: number) => {
    const r = tuval.getBoundingClientRect()
    const c = document.createElement('canvas')
    c.width = en
    c.height = Math.round((en * r.height) / r.width)
    const k = c.getContext('2d')!
    k.fillStyle = ZEMIN
    k.fillRect(0, 0, c.width, c.height)
    k.drawImage(tuval, 0, 0, c.width, c.height)
    return c
  }
  gonder.addEventListener('click', async () => {
    if (!cizildi) {
      durum.textContent = 'Önce bir şey çiz ☺️'
      gsap.fromTo($('.tahta-cerceve', bolum), { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' })
      return
    }
    const buyuk = await resimAl(900)
    const blob = await new Promise<Blob | null>((ok) => buyuk.toBlob(ok, 'image/png'))
    if (!blob) return
    const kucuk = (await resimAl(160)).toDataURL('image/jpeg', 0.7)
    const l = oku<Cizim[]>('cizimler', [])
    l.push({ t: new Date().toISOString().slice(0, 10), r: kucuk })
    yaz('cizimler', l.slice(-12))
    gecmisCiz()
    if (kimim() === 'arda') {
      await paylasVeyaIndir(blob, 'cizim.png', 'Çizim')
      return
    }
    gonder.disabled = true
    durum.textContent = 'Gönderiliyor…'
    const tamam = await ardayaResim(
      blob,
      'cizim.png',
      `${ICERIK.sen.ad} sana bir şey çizdi 🎨`,
      kelime ? 'Ne olduğunu tahmin et ve ona yaz. Cevabı söylemedi 🤫' : 'Bir çizim geldi. Ne olduğunu tahmin et ☺️',
      ['art'],
    )
    gonder.disabled = false
    if (tamam) {
      durum.textContent = `Gitti! ${ICERIK.ben.ad} şimdi kara kara düşünüyor 🤔`
      ses.cin()
      titret([15, 40, 15])
      window.dispatchEvent(new CustomEvent('kutla', { detail: 16 }))
      window.setTimeout(() => sirBul('cizim'), 900)
      // yeni tur: tahta ve kelime sıfırlanır
      kelime = ''
      kelimeEl.hidden = true
      gsap.to(surgu, {
        value: 100,
        duration: 0.9,
        ease: 'power2.inOut',
        onUpdate: () => surgu.dispatchEvent(new Event('input')),
        onComplete: surguGeri,
      })
    } else {
      durum.textContent = 'Gönderilemedi. İstersen paylaş menüsünden yolla:'
      await paylasVeyaIndir(blob, 'cizim.png', 'Sana bir şey çizdim')
    }
  })
}
