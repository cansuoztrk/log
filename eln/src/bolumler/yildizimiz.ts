import * as SunCalc from 'suncalc'
import { ICERIK, type Kisi } from '../icerik'
import { YILDIZLAR } from '../veri/gok'
import { yatay, yildizZamani, yonBulunma } from '../cekirdek/gokbilim'
import { oku, yaz } from '../cekirdek/depo'
import { ortakOku, ortakYaz } from '../cekirdek/ortak'
import { ardayaYaz, kimim } from '../cekirdek/posta'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { ek, MESAFE, saatYazi, sayi, simdi } from '../cekirdek/zaman'
import { baglanti } from '../ui/nabiz'
import { $, belir, gorunurken, gsap, satirSatir, titret } from './yardimci'

/**
 * İKİMİZİN YILDIZI — Eln gökyüzünden bir yıldız seçer. Sonra sayfa her an o yıldızın İstanbul'da
 * ve Bakü'de nerede olduğunu (gerçek hesap), ikimizin onu aynı anda ne zaman görebileceğini söyler.
 * "Şimdi bakıyorum" deyince öbürüne haber gider; ikimiz 10 dakika içinde bakarsak "aynı anda baktık".
 */
const { ben, sen } = ICERIK
const D = 180 / Math.PI

interface Yildiz {
  ad: string
  ra: number
  dec: number
  /** ışık yılı (yaklaşık) */
  uzaklik: number
  renk: string
}
interface Secenek {
  id: string
  ad: string
  alt: string
  yildizlar: Yildiz[]
  not: string
}

const VEGA: Yildiz = { ad: 'Vega', ra: 279.23, dec: 38.78, uzaklik: 25, renk: '205,220,255' }
const ALTAIR: Yildiz = { ad: 'Altair', ra: 297.7, dec: 8.87, uzaklik: 16.7, renk: '240,242,255' }

const SECENEKLER: Secenek[] = [
  {
    id: 'vega-altair',
    ad: 'Vega ve Altair',
    alt: 'iki yıldız, bir hikâye',
    yildizlar: [VEGA, ALTAIR],
    not: 'Çin’de ve Japonya’da anlatılır: Vega dokumacı bir kız, Altair bir çoban. Aralarından Samanyolu akar; yılda yalnızca bir gece saksağanlar kanatlarıyla köprü kurar ve kavuşurlar. Biz saksağan beklemeyeceğiz.',
  },
  {
    id: 'kutup',
    ad: 'Kutup Yıldızı',
    alt: 'hiç batmayan',
    yildizlar: [{ ad: 'Kutup Yıldızı', ra: 37.95, dec: 89.26, uzaklik: 430, renk: '255,246,225' }],
    not: 'Hiç batmaz, hep kuzeyde durur. İstanbul’dan 41°, Bakü’den 40° yükseklikte görünür: aynı çizgideyiz ya, ikimize de neredeyse aynı yerden bakar. Kaybolursan kuzeye bak.',
  },
  {
    id: 'akyildiz',
    ad: 'Akyıldız',
    alt: 'gecenin en parlağı',
    yildizlar: [{ ad: 'Akyıldız', ra: 101.29, dec: -16.72, uzaklik: 8.6, renk: '215,226,255' }],
    not: 'Gökyüzünün en parlak yıldızı (Sirius). Kış gecelerinin yıldızı; güneyden yükselir. Işığı bize en çabuk gelenlerden.',
  },
  {
    id: 'arkturus',
    ad: 'Arktürüs',
    alt: 'turuncu, sıcacık',
    yildizlar: [{ ad: 'Arktürüs', ra: 213.92, dec: 19.18, uzaklik: 37, renk: '255,214,170' }],
    not: 'Kuzey gökyüzünün en parlak yıldızı; turuncu, sıcak bir ışık. Bahar ve yaz akşamları batıya doğru yavaşça iner.',
  },
  {
    id: 'kapella',
    ad: 'Kapella',
    alt: 'sarı, neredeyse hiç kaybolmayan',
    yildizlar: [{ ad: 'Kapella', ra: 79.17, dec: 46, uzaklik: 43, renk: '255,240,200' }],
    not: 'Güneşimiz gibi sarı. Bizim enlemimizde yılın neredeyse her gecesi bir yerlerde görünür; yazın bile sabaha karşı kuzeydoğudan geri gelir.',
  },
]

interface Secim {
  id: string
  kim: 'eln' | 'arda'
  tarih: number
}

/** Azimuttan yön (yönelme hâli): "kuzeydoğuya" */
const yonelme = (az: number) => ['kuzeye', 'kuzeydoğuya', 'doğuya', 'güneydoğuya', 'güneye', 'güneybatıya', 'batıya', 'kuzeybatıya'][Math.round(az / 45) % 8]

/** Güneşin yüksekliği (°) */
const gunes = (t: Date, k: Kisi) => SunCalc.getPosition(t, k.enlem, k.boylam).altitude * D
const konum = (y: Yildiz, t: Date, k: Kisi) => yatay(y.ra, y.dec, yildizZamani(t, k.boylam), k.enlem)
/** Gözle görülebilir mi: hava kararmış ve yıldız ufkun 8° üstünde */
const gorunur = (y: Yildiz, t: Date, k: Kisi) => gunes(t, k) < -10 && konum(y, t, k).alt > 8
const hepsiGorunur = (s: Secenek, t: Date, k: Kisi) => s.yildizlar.every((y) => gorunur(y, t, k))

/** Önümüzdeki 24 saatte ikimizin de görebildiği ilk aralık */
function birlikteAralik(s: Secenek, bas: Date) {
  let ilk: Date | null = null
  for (let dk = 0; dk <= 24 * 60; dk += 5) {
    const t = new Date(bas.getTime() + dk * 60_000)
    const ikimiz = hepsiGorunur(s, t, ben) && hepsiGorunur(s, t, sen)
    if (ikimiz && !ilk) ilk = t
    if (!ikimiz && ilk) return { bas: ilk, son: t }
  }
  return ilk ? { bas: ilk, son: new Date(bas.getTime() + 24 * 3_600_000) } : null
}

function durumYazi(y: Yildiz, t: Date, k: Kisi) {
  const p = konum(y, t, k)
  if (p.alt <= 0) return `ufkun altında`
  const yer = `${Math.round(p.alt)}° · ${yonBulunma(p.az)}`
  if (gunes(t, k) > -10) return `${yer} (ama gökyüzü aydınlık)`
  return yer
}

/** Tek şehrin gökyüzü kubbesi: tepe ortada, kuzey yukarıda, doğu solda (gökyüzüne bakar gibi) */
function kubbeCiz(c: HTMLCanvasElement, s: Secenek, t: Date, k: Kisi) {
  const px = Math.min(window.devicePixelRatio || 1, 2)
  const w = c.clientWidth || 160
  c.width = Math.round(w * px)
  c.height = Math.round(w * px)
  const x = c.getContext('2d')!
  x.setTransform(px, 0, 0, px, 0, 0)
  const R = w / 2 - 14
  const cx = w / 2
  const cy = w / 2
  const g = gunes(t, k)
  const gece = Math.min(1, Math.max(0, (-g - 2) / 14))
  const gok = x.createRadialGradient(cx, cy, 0, cx, cy, R)
  gok.addColorStop(0, gece > 0.5 ? '#0d1233' : g > 0 ? '#5d8fc9' : '#3a3470')
  gok.addColorStop(1, gece > 0.5 ? '#1a1640' : g > 0 ? '#a9c7e6' : '#8a5a7a')
  x.fillStyle = gok
  x.beginPath()
  x.arc(cx, cy, R, 0, Math.PI * 2)
  x.fill()
  const izd = (alt: number, az: number) => {
    const r = R * Math.tan(((90 - alt) / D) / 2)
    return [cx - r * Math.sin(az / D), cy - r * Math.cos(az / D)] as const
  }
  const yz = yildizZamani(t, k.boylam)
  // arka plandaki parlak yıldızlar (yalnızca karanlıkta)
  if (gece > 0.2) {
    for (let i = 0; i < YILDIZLAR.length; i += 4) {
      const kadir = YILDIZLAR[i + 2]
      if (kadir > 3.6) break
      const p = yatay(YILDIZLAR[i], YILDIZLAR[i + 1], yz, k.enlem)
      if (p.alt < 0) continue
      const [sx, sy] = izd(p.alt, p.az)
      x.fillStyle = `rgba(255,248,235,${(0.75 - kadir * 0.15) * gece})`
      x.beginPath()
      x.arc(sx, sy, Math.max(0.5, 1.6 - kadir * 0.3), 0, Math.PI * 2)
      x.fill()
    }
  }
  // seçilen yıldız(lar)
  const noktalar: [number, number][] = []
  for (const y of s.yildizlar) {
    const p = konum(y, t, k)
    if (p.alt < 0) continue
    const [sx, sy] = izd(p.alt, p.az)
    noktalar.push([sx, sy])
    const par = x.createRadialGradient(sx, sy, 0, sx, sy, 16)
    par.addColorStop(0, `rgba(${y.renk},${0.35 + 0.6 * gece})`)
    par.addColorStop(1, `rgba(${y.renk},0)`)
    x.fillStyle = par
    x.beginPath()
    x.arc(sx, sy, 16, 0, Math.PI * 2)
    x.fill()
    x.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * gece})`
    x.beginPath()
    x.arc(sx, sy, 2.6, 0, Math.PI * 2)
    x.fill()
    x.fillStyle = 'rgba(255,236,210,.9)'
    x.font = '600 10px "Plus Jakarta Sans Variable", sans-serif'
    x.textAlign = 'center'
    x.fillText(y.ad, sx, sy - 12)
  }
  if (noktalar.length === 2) {
    x.strokeStyle = 'rgba(245,159,180,.45)'
    x.setLineDash([2, 4])
    x.beginPath()
    x.moveTo(...noktalar[0])
    x.lineTo(...noktalar[1])
    x.stroke()
    x.setLineDash([])
  }
  // ufuk ve yönler
  x.strokeStyle = 'rgba(247,237,224,.35)'
  x.lineWidth = 1
  x.beginPath()
  x.arc(cx, cy, R, 0, Math.PI * 2)
  x.stroke()
  x.fillStyle = 'rgba(247,237,224,.6)'
  x.font = '600 9px "Plus Jakarta Sans Variable", sans-serif'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  for (const [h, az] of [['K', 0], ['D', 90], ['G', 180], ['B', 270]] as const) {
    const [hx, hy] = izd(-7, az)
    x.fillText(h, hx, hy)
  }
  x.textBaseline = 'alphabetic'
}

/** "Bugün seni bekleyenler" için: yıldız seçilmediyse ya da bu gece ikimizin gökyüzündeyse */
export function yildizBugun(): { baslik: string; alt: string; onem: number } | null {
  const sc = ortakOku<Secim | null>('yildiz', null)
  const s = SECENEKLER.find((x) => x.id === sc?.id)
  if (!s) return { baslik: 'Gökyüzünden bir yıldız seç', alt: 'İkimizin olsun; her gece nerede olduğunu söyleyeyim.', onem: 4.5 }
  const t = simdi()
  if (hepsiGorunur(s, t, ben) && hepsiGorunur(s, t, sen)) return { baslik: `${s.ad} şu an ikimizin de gökyüzünde`, alt: 'Pencereden bak; ben de bakıyorum.', onem: 7.2 }
  const a = birlikteAralik(s, t)
  if (a && a.bas.getTime() - t.getTime() < 14 * 3_600_000)
    return { baslik: `${s.ad} bu gece ikimizin gökyüzünde`, alt: `Saat ${saatYazi(a.bas, (kimim() === 'arda' ? ben : sen).saatDilimi)} itibarıyla. Aynı anda bakalım mı?`, onem: 3.5 }
  return null
}

export function yildizimizHTML() {
  return /* html */ `
  <section id="yildizimiz" class="bolum" data-bolum="" data-ad="İkimizin Yıldızı">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>İkimizin yıldızı</p>
        <h2 class="baslik">Gökyüzünden bir yıldız seç. <em>Artık bizim olsun.</em></h2>
        <p class="metin">İstanbul ile Bakü neredeyse aynı enlemde; gökyüzümüz neredeyse aynı. Bir yıldız seç. Bundan sonra bu sayfa her an onun İstanbul’da ve Bakü’de nerede durduğunu, ikimizin onu aynı anda ne zaman görebileceğini söyleyecek.</p>
      </div>
      <div class="iy" data-dom>
        <div class="iy-sec" role="list"></div>
        <div class="iy-panel" hidden>
          <p class="iy-kim"></p>
          <h3 class="iy-ad"></h3>
          <div class="iy-kubbeler">
            <figure><canvas class="iy-kubbe" data-k="ben" aria-hidden="true"></canvas><figcaption><b>${ben.yerelSehir}</b><span data-y="ben"></span></figcaption></figure>
            <figure><canvas class="iy-kubbe" data-k="sen" aria-hidden="true"></canvas><figcaption><b>${sen.yerelSehir}</b><span data-y="sen"></span></figcaption></figure>
          </div>
          <p class="iy-durum" aria-live="polite"></p>
          <p class="iy-isik el"></p>
          <p class="iy-not"></p>
          <div class="iy-dugmeler">
            <button class="dugme iy-bak" type="button">Şimdi bakıyorum ✨</button>
            <button class="dugme hayalet iy-degistir" type="button">Başka bir yıldız</button>
          </div>
          <p class="iy-sayac"></p>
        </div>
      </div>
    </div>
  </section>`
}

export function yildizimizKur() {
  const bolum = $('#yildizimiz')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('.iy', bolum)])
  const secEl = $('.iy-sec', bolum)
  const panel = $('.iy-panel', bolum)
  const kimEl = $('.iy-kim', bolum)
  const adEl = $('.iy-ad', bolum)
  const durumEl = $('.iy-durum', bolum)
  const isikEl = $('.iy-isik', bolum)
  const notEl = $('.iy-not', bolum)
  const sayacEl = $('.iy-sayac', bolum)
  const ben_ = kimim()
  const karsi = () => baglanti.karsiAd || (ben_ === 'arda' ? sen.ad : ben.ad)
  let ekranda = false
  let birlikte = oku<number>('yildizBirlikte', 0)

  const secim = () => ortakOku<Secim | null>('yildiz', null)
  const secenek = () => SECENEKLER.find((s) => s.id === secim()?.id) ?? null

  secEl.innerHTML = SECENEKLER.map(
    (s) => /* html */ `
    <button type="button" class="iy-kart" data-id="${s.id}" role="listitem">
      <span class="iy-parilti" aria-hidden="true">${s.yildizlar.map((y) => `<i style="--r:${y.renk}"></i>`).join('')}</span>
      <b>${s.ad}</b><small>${s.alt}</small>
    </button>`,
  ).join('')

  const ciz = () => {
    const s = secenek()
    if (!s) return
    const t = simdi()
    for (const c of panel.querySelectorAll<HTMLCanvasElement>('.iy-kubbe')) kubbeCiz(c, s, t, c.dataset.k === 'ben' ? ben : sen)
    for (const k of ['ben', 'sen'] as const) {
      const kisi = k === 'ben' ? ben : sen
      $(`[data-y="${k}"]`, panel).innerHTML = s.yildizlar.map((y) => (s.yildizlar.length > 1 ? `${y.ad}: ` : '') + durumYazi(y, t, kisi)).join('<br/>')
    }
    const ikimiz = hepsiGorunur(s, t, ben) && hepsiGorunur(s, t, sen)
    if (ikimiz) {
      const p = konum(s.yildizlar[0], t, ben_ === 'arda' ? ben : sen)
      durumEl.innerHTML = `<b>Şu an ikimiz de görebiliriz.</b> Pencereden ${yonelme(p.az)} bak; kolunu uzat, yaklaşık ${Math.max(1, Math.round(p.alt / 10))} yumruk yukarı.`
    } else {
      const a = birlikteAralik(s, t)
      durumEl.innerHTML = a
        ? `İkimizin de gökyüzünde olacağı ilk an: <b>${saatYazi(a.bas, sen.saatDilimi)}–${saatYazi(a.son, sen.saatDilimi)}</b> Bakü saatiyle (İstanbul’da ${saatYazi(a.bas, ben.saatDilimi)}–${saatYazi(a.son, ben.saatDilimi)}).`
        : 'Önümüzdeki gün ikimizin gökyüzünde aynı anda karanlıkta değil. Gündüz de orada; sadece güneş saklıyor.'
    }
    durumEl.classList.toggle('simdi', ikimiz)
  }

  const isikYazisi = (s: Secenek) => {
    const y = s.yildizlar[0]
    const yil = simdi().getFullYear()
    const cikis = Math.round(yil - y.uzaklik)
    const dy = ICERIK.dogumYili
    let kisi = ''
    if (dy) kisi = cikis < dy ? 'sen daha doğmamıştın' : cikis === dy ? 'sen doğduğun yıl' : `sen ${cikis - dy} yaşındaydın`
    const isik = ((MESAFE / 299_792) * 1000).toFixed(1).replace('.', ',')
    return `Bu gece gözüne düşen ${y.ad} ışığı yaklaşık ${cikis} yılında yola çıktı${kisi ? `; ${kisi}` : ''}. Sana ulaşmak için ${sayi(y.uzaklik)} yıl yol aldı. Bizim aramızdaki ${sayi(MESAFE)} km’yi ışık ${isik} milisaniyede geçer. Uzaklık dediğin buysa, biz uzak sayılmayız.`
  }

  const goster = (canli = false) => {
    const s = secenek()
    const sc = secim()
    secEl.hidden = !!s
    panel.hidden = !s
    if (!s || !sc) return
    adEl.textContent = s.ad
    const kimAd = sc.kim === ben_ ? 'Senin seçtiğin' : `${ek(sc.kim === 'eln' ? sen.ad : ben.ad, 'ilgi')} seçtiği`
    kimEl.textContent = `${kimAd} · ${new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: sen.saatDilimi }).format(new Date(sc.tarih))}`
    isikEl.textContent = isikYazisi(s)
    notEl.textContent = s.not
    sayacEl.textContent = birlikte ? `Yıldızımıza ${sayi(birlikte)} kez aynı anda baktık.` : ''
    ciz()
    if (canli) {
      gsap.fromTo(panel, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out' })
      gsap.fromTo(panel.querySelectorAll('figure'), { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.2, stagger: 0.15, ease: 'expo.out' })
    }
  }

  secEl.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('.iy-kart')
    if (!b) return
    const s = SECENEKLER.find((x) => x.id === b.dataset.id)!
    ortakYaz('yildiz', { id: s.id, kim: ben_, tarih: Date.now() } satisfies Secim)
    ses.cin()
    titret([20, 50, 20])
    window.dispatchEvent(new CustomEvent('kutla', { detail: 24 }))
    const ikili = s.yildizlar.length > 1 ? ' İki yıldız, bir hikâye.' : ''
    void ardayaYaz(`${sen.ad} yıldızımızı seçti ✨`, `${s.ad}.${ikili} Bu geceden sonra ona her baktığında aynı yıldıza bakıyor olacağız.`, ['star'])
    // (panel, ortakYaz'ın yaydığı 'ortak-degisti' ile açılır)
  })
  $('.iy-degistir', bolum).addEventListener('click', () => {
    secEl.hidden = false
    panel.hidden = true
    gsap.from(secEl.children, { autoAlpha: 0, y: 10, stagger: 0.05, duration: 0.5 })
  })

  // ─── aynı anda bakmak ───
  const ayniAnda = () => {
    birlikte++
    yaz('yildizBirlikte', birlikte)
    sayacEl.textContent = `Yıldızımıza ${sayi(birlikte)} kez aynı anda baktık.`
    ses.kalp(1)
    titret([40, 80, 40, 80, 160])
    window.dispatchEvent(new CustomEvent('kutla', { detail: 50 }))
    kartGoster(`Aynı anda baktık`, `${sayi(MESAFE)} km, iki pencere, bir yıldız. Şu an ikimiz de aynı ışığa bakıyoruz.`)
    if (birlikte === 1) window.setTimeout(() => sirBul('yildizimiz'), 1800)
  }
  const kartGoster = (baslik: string, metin: string, dugme?: { yazi: string; f: () => void }) => {
    document.querySelector('.iy-randevu')?.remove()
    const k = document.createElement('div')
    k.className = 'ay-randevu iy-randevu'
    k.innerHTML = /* html */ `
      <p class="iy-randevu-yildiz" aria-hidden="true">✦</p>
      <p class="etiket">${baslik}</p>
      <p class="satir">${metin}</p>
      <button class="dugme${dugme ? '' : ' hayalet'}" type="button">${dugme?.yazi ?? 'Tamam ✦'}</button>`
    document.body.appendChild(k)
    const kapat = () => gsap.to(k, { autoAlpha: 0, duration: 0.6, onComplete: () => k.remove() })
    k.querySelector('button')!.addEventListener('click', () => {
      dugme?.f()
      kapat()
    })
    window.setTimeout(kapat, 90_000)
    gsap.from(k, { autoAlpha: 0, duration: 0.8 })
    gsap.from(k.querySelector('.iy-randevu-yildiz'), { scale: 0.2, rotate: -90, duration: 1.6, ease: 'expo.out' })
  }
  const yon = (s: Secenek) => {
    const t = simdi()
    const p = konum(s.yildizlar[0], t, ben_ === 'arda' ? ben : sen)
    return p.alt > 0 ? `${s.yildizlar[0].ad} şu an senin gökyüzünde ${yonBulunma(p.az)}, ${Math.round(p.alt)}° yukarıda.` : `${s.yildizlar[0].ad} şu an senin ufkunun altında; ama bil ki orada.`
  }
  const bakiyorum = (cevap: boolean) => {
    const s = secenek()
    if (!s) return
    const onceki = oku<number>('yildizKarsiBakti', 0)
    yaz('yildizBakti', Date.now())
    if (baglanti.cevrimici()) void baglanti.gonder({ tip: 'yildiz-bak', cevap })
    else if (ben_ === 'eln') void ardayaYaz(`${sen.ad} yıldızımıza bakıyor ✨`, `${s.yildizlar[0].ad} şu an İstanbul’da ${durumYazi(s.yildizlar[0], simdi(), ben)}. Sen de bak.`, ['star'])
    if (Date.now() - onceki < 10 * 60_000) ayniAnda()
    else if (!cevap) kartGoster('Bakıyorsun', `${yon(s)} ${baglanti.cevrimici() ? `${ek(karsi(), 'yonelme')} haber verdim.` : ben_ === 'eln' ? `${ek(ben.ad, 'yonelme')} haber verdim.` : ''}`)
  }
  $('.iy-bak', bolum).addEventListener('click', () => {
    ses.nota(88, 0.04)
    bakiyorum(false)
  })
  window.addEventListener('yildiz-bak-gelen', () => {
    const s = secenek()
    if (!s) return
    const benim = oku<number>('yildizBakti', 0)
    yaz('yildizKarsiBakti', Date.now())
    ses.cin()
    titret([30, 100, 30])
    if (Date.now() - benim < 10 * 60_000) ayniAnda()
    else kartGoster(`${karsi()} yıldızımıza bakıyor`, `${yon(s)} Sen de bak.`, { yazi: 'Ben de bakıyorum ✨', f: () => bakiyorum(true) })
  })

  window.addEventListener('ortak-degisti', (e) => {
    if ((e as CustomEvent<string[]>).detail.includes('yildiz')) goster(true)
  })
  goster()
  // ekrandayken dakikada bir güncelle (yıldızlar yürüyor)
  gorunurken(bolum, (a) => {
    ekranda = a
    if (a) ciz()
  })
  window.setInterval(() => ekranda && ciz(), 60_000)
  new ResizeObserver(() => ekranda && ciz()).observe(panel)
}
