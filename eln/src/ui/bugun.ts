import { ICERIK } from '../icerik'
import { MEKTUPLAR } from '../mektuplar'
import { ILKLER } from '../ilkler'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { SIRLAR, bulunanlar } from '../cekirdek/sirlar'
import { kimim } from '../cekirdek/posta'
import { albumAcik, albumIcerik } from '../cekirdek/album'
import { type Anlik, gunEkle, gunFarki, isoGun, sayi, tarihYazi, yerel } from '../cekirdek/zaman'
import { bugununKuponu } from '../bolumler/cuzdan'
import { gununSorusu, type GununNotu } from '../bolumler/ruzgar'
import { $, gsap, ikon, kacir } from '../bolumler/yardimci'
import { gelenAc, gelenler } from './gelenkutusu'
import { fisiltiAc } from './fisilti'
import { hangimizBekleyen } from '../bolumler/hangimiz'
import { yildizBugun } from '../bolumler/yildizimiz'
import { bekleyenSebep } from '../bolumler/sebepler'

/**
 * BUGÜN SENİ BEKLEYENLER — site her gün biraz değişiyor; bu kart o gün neyin yeni olduğunu,
 * neyin onu beklediğini söyler ve dokununca oraya götürür. Günde bir kez kendiliğinden açılır,
 * menüden her zaman açılabilir.
 */
interface Satir {
  simge: string
  baslik: string
  alt?: string
  onem: number
  git?: string
  tik?: () => void
}

interface Arayuz {
  git: (hedef: string) => void
  sirlarAc: () => void
}

/**
 * GEÇMİŞTEN — site Eln'in kendi sözlerini hatırlar: bir dileği, bir cevabı, bir fısıltısı.
 * "Bir ay önce bugün" / "tam üç hafta önce" olanlar öne çıkar; yoksa her gün başka biri.
 */
function gecmisten(z: Anlik): Satir | null {
  interface Ani {
    tarih: string
    metin: string
    git?: string
    tik?: () => void
  }
  const kisalt = (m: string) => (m.length > 150 ? `${m.slice(0, 147)}…` : m)
  const adaylar: Ani[] = []
  for (const f of oku<{ t?: string; d?: string }[]>('fenerler', []))
    if (f.t && f.d) adaylar.push({ tarih: f.t, metin: `“${kisalt(f.d)}” diye dilemiştin. Dileğin hâlâ gökyüzünde.`, git: '#fener' })
  for (const c of oku<{ tarih: string; soru: string; cevap: string }[]>('cevaplar', []))
    adaylar.push({ tarih: c.tarih, metin: `“${kisalt(c.soru)}” sorusuna şöyle cevap vermiştin: “${kisalt(c.cevap)}”`, git: '#ruzgar' })
  for (const f of oku<{ kim: string; t?: string; zaman: number }[]>('fisiltilar', []))
    if (f.kim === 'ben' && f.t && f.t.length >= 12)
      adaylar.push({ tarih: isoGun(yerel(new Date(f.zaman), ICERIK.sen.saatDilimi)), metin: `“${kisalt(f.t)}” diye fısıldamıştın.`, tik: fisiltiAc })
  const eski = adaylar.filter((a) => gunFarki(a.tarih, z.bugun) >= 7)
  if (!eski.length) return null
  const ayOnce = (t: string) => {
    const [y, a, g] = t.split('-').map(Number)
    const [by, ba, bg] = z.bugun.split('-').map(Number)
    return g === bg ? (by - y) * 12 + (ba - a) : 0
  }
  const sec = eski.find((a) => ayOnce(a.tarih) > 0) ?? eski.find((a) => gunFarki(a.tarih, z.bugun) % 7 === 0) ?? eski[z.tanisalGun % eski.length]
  const gun = gunFarki(sec.tarih, z.bugun)
  const ay = ayOnce(sec.tarih)
  const SAYI = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz', 'On', 'On bir']
  const baslik =
    ay >= 12 && ay % 12 === 0
      ? `${ay === 12 ? 'Bir' : SAYI[ay / 12] ?? ay / 12} yıl önce bugün`
      : ay > 0
        ? `${SAYI[ay] ?? ay} ay önce bugün`
        : gun % 7 === 0
          ? `Tam ${(SAYI[gun / 7] ?? String(gun / 7)).toLocaleLowerCase('tr')} hafta önce`
          : `${sayi(gun)} gün önce, ${tarihYazi(sec.tarih)}`
  return { simge: '📜', baslik, alt: sec.metin, onem: 9.6, git: sec.git, tik: sec.tik }
}

function satirlar(z: Anlik, not: GununNotu, u: Arayuz): Satir[] {
  const s: Satir[] = []
  const eln = kimim() === 'eln'
  const hatira = gecmisten(z)
  if (hatira) s.push(hatira)

  // Arda'dan okunmamış not
  for (const g of gelenler().filter((x) => !x.okundu).slice(-2))
    s.push({ simge: '💌', baslik: `${ICERIK.ben.ad} sana bir not bıraktı`, alt: 'Henüz okumadın.', onem: 10, tik: () => gelenAc(g.id) })

  // kilidi açılmış ama okunmamış mektuplar; sıradaki kilitli mektup
  const acilan = new Set(oku<string[]>('zarflar', []))
  const tarihli = MEKTUPLAR.map((m) => (m.id === 'bulusma' && ICERIK.ilkBulusma ? { ...m, tarih: gunEkle(ICERIK.ilkBulusma.slice(0, 10), -1) } : m)).filter(
    (m) => m.tarih,
  )
  for (const m of tarihli.filter((m) => m.tarih! <= z.bugun && !acilan.has(m.id)))
    s.push({ simge: '✉️', baslik: `“${m.baslik}”`, alt: m.tarih === z.bugun ? 'Bu mektubun kilidi bugün açıldı.' : 'Kilidi açıldı, henüz okumadın.', onem: 9, git: '#zarflar' })
  const siradaki = tarihli.filter((m) => m.tarih! > z.bugun).sort((a, b) => a.tarih!.localeCompare(b.tarih!))[0]

  // şifreli sayfalar
  const a = albumIcerik()
  if (!albumAcik()) s.push({ simge: '🔒', baslik: 'Kilitli sayfalar seni bekliyor', alt: 'Mesajlarımız, fotoğrafların, sesim. Kelimemizi yaz.', onem: 8, git: '#mesajlar' })
  else if (a) {
    if (bekleyenSebep(a)) s.push({ simge: '💌', baslik: 'Bugünün sebebi seni bekliyor', alt: 'Seni sevmemin bir sebebi daha açıldı.', onem: 8.8, git: '#sebepler' })
    if (a.ses && !oku('sesDinlendi', false)) s.push({ simge: '🎧', baslik: 'Sesimi henüz dinlemedin', alt: 'Mektubun altında. Kulaklığını tak.', onem: 7.5, git: '#mektup' })
    const izlenen = new Set(oku<string[]>('izlenenSohbetler', []))
    const kalan = a.sohbetler.filter((x) => !izlenen.has(x.id)).length
    if (kalan) s.push({ simge: '💬', baslik: `${kalan} konuşmamız yeniden yaşanmayı bekliyor`, alt: 'Mesajlarımızdan', onem: 5, git: '#mesajlar' })
    const okunan = oku<number[]>('okunanYildizlar', []).length
    if (okunan < a.yildizlar.length) s.push({ simge: '★', baslik: `${a.yildizlar.length - okunan} yıldız daha okunmadı`, alt: 'Yıldızladıkların', onem: 4, git: '#yildizladiklarin' })
  }

  // günün notu, soru, kupon
  if (oku<string>('zarf', '') !== not.tarih)
    s.push({ simge: not.ozel ? '♥' : '🍃', baslik: not.ozel ? `Bugün özel bir not var: ${not.baslik}` : 'Rüzgâr bugünün notunu getirdi', alt: 'Zarfı henüz açmadın.', onem: not.ozel ? 8.5 : 7, git: '#ruzgar' })
  if (eln && !oku<{ tarih: string }[]>('cevaplar', []).some((c) => c.tarih === z.bugun))
    s.push({ simge: '❓', baslik: 'Günün sorusu', alt: gununSorusu(z), onem: 6, git: '#ruzgar' })
  const k = bugununKuponu(z.bugun)
  if (k && !k.kazindi) s.push({ simge: '🎟️', baslik: 'Bugünün kuponu kazınmayı bekliyor', alt: 'Buluşma cüzdanında.', onem: 6, git: '#cuzdan' })

  // İkimizden hangisi? · yıldızımız
  const h = hangimizBekleyen()
  if (h.onunki) s.push({ simge: '🤔', baslik: `${eln ? ICERIK.ben.ad : ICERIK.sen.ad} ${h.onunki} soruyu cevapladı`, alt: 'Sen de cevapla, cevaplar açılsın.', onem: 6.5, git: '#hangimiz' })
  else if (h.soru) s.push({ simge: '🤔', baslik: `“İkimizden hangisi?” ${h.soru} soru bekliyor`, alt: 'Kopya çekmek yok.', onem: 4, git: '#hangimiz' })
  const y = yildizBugun()
  if (y) s.push({ simge: '✨', ...y, git: '#yildizimiz' })

  // defter, dilek, sır
  const yazilan = oku<Record<string, unknown>>('ilkler', {})
  const bos = ILKLER.filter((i) => !i.tarih && !i.gelecek && !yazilan[i.id]).length
  if (bos) s.push({ simge: '✍️', baslik: `İlklerimiz defterinde ${bos} boş satır var`, alt: 'Hatırladığın bir tarih var mı?', onem: 3, git: '#ilkler' })
  if (!oku<{ t: string }[]>('fenerler', []).some((f) => f.t === z.bugun)) s.push({ simge: '🏮', baslik: 'Bugün bir dilek tutmadın', alt: 'Dilek feneri seni bekliyor.', onem: 2, git: '#fener' })
  const b = new Set(bulunanlar())
  const kalanSir = SIRLAR.filter((x) => !b.has(x.id))
  if (kalanSir.length) {
    const ip = kalanSir[z.tanisalGun % kalanSir.length]
    s.push({ simge: '✦', baslik: `Bir sır ipucu (${b.size}/${SIRLAR.length})`, alt: ip.ipucu, onem: 1, tik: u.sirlarAc })
  }
  if (siradaki) {
    const gun = gunFarki(z.bugun, siradaki.tarih!)
    s.push({ simge: '⏳', baslik: `Sıradaki kilitli mektup ${gun === 1 ? 'yarın' : `${sayi(gun)} gün sonra`} açılıyor`, alt: `“${siradaki.baslik}”`, onem: 0.5, git: '#zarflar' })
  }
  return s.sort((x, y) => y.onem - x.onem).slice(0, 7)
}

function ozelGun(z: Anlik) {
  const g = z.bugun.slice(8)
  if (z.sevgiliGun > 0 && z.sevgiliGun % 100 === 0) return `Bugün “biz” olalı tam ${sayi(z.sevgiliGun)} gün! 🎉`
  if (z.gunNo % 100 === 0) return `Bugün tanışmamızın ${sayi(z.gunNo)}. günü! 🎉`
  if (g === ICERIK.sevgili.slice(8)) return 'Bugün ayın 21’i: bizim günümüz ♥'
  if (g === ICERIK.tanisma.slice(8)) return 'Bugün ayın 6’sı: Nehir’in bir tuşa bastığı gün 🌊'
  return ''
}

let acikKutu: HTMLElement | null = null

export function bugunAc(z: Anlik, not: GununNotu, u: Arayuz) {
  if (acikKutu) return
  const liste = satirlar(z, not, u)
  const ozel = ozelGun(z)
  const perde = document.createElement('div')
  perde.className = 'bg-perde'
  const kutu = document.createElement('section')
  kutu.className = 'bugun'
  kutu.setAttribute('role', 'dialog')
  kutu.setAttribute('aria-label', 'Bugün seni bekleyenler')
  kutu.setAttribute('data-lenis-prevent', '')
  kutu.innerHTML = /* html */ `
    <span class="bg-tutamak" aria-hidden="true"></span>
    <header class="bg-bas">
      <div>
        <small>${tarihYazi(z.bugun, true)}</small>
        <h3>Bugün seni bekleyenler</h3>
      </div>
      <button class="ikon-dugme bg-kapat" type="button" aria-label="Kapat">${ikon('kapat')}</button>
    </header>
    <p class="bg-sayac">Tanışalı <b>${sayi(z.gunNo)}.</b> gün · “biz” olalı <b>${sayi(z.sevgiliGun + 1)}.</b> gün</p>
    ${ozel ? `<p class="bg-ozel">${ozel}</p>` : ''}
    <ul class="bg-liste">
      ${liste
        .map(
          (x, i) => `<li><button type="button" data-i="${i}">
            <span class="bg-simge" aria-hidden="true">${x.simge}</span>
            <span class="bg-yazi"><b>${kacir(x.baslik)}</b>${x.alt ? `<small>${kacir(x.alt)}</small>` : ''}</span>
            <span class="bg-ok" aria-hidden="true">›</span>
          </button></li>`,
        )
        .join('')}
    </ul>
    <p class="bg-alt el">Hepsi yarın da burada. Acele yok ☺️</p>`
  document.body.append(perde, kutu)
  acikKutu = kutu
  ses.nota(84, 0.03)
  gsap.fromTo(perde, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 })
  gsap.fromTo(kutu, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'expo.out' })
  gsap.from(kutu.querySelectorAll('.bg-liste li'), { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.06, delay: 0.25, ease: 'power2.out' })

  const kapat = (sonra?: () => void) => {
    if (!acikKutu) return
    acikKutu = null
    window.removeEventListener('keydown', tus)
    gsap.to(perde, { autoAlpha: 0, duration: 0.3, onComplete: () => perde.remove() })
    gsap.to(kutu, {
      yPercent: 100,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => {
        kutu.remove()
        sonra?.()
      },
    })
  }
  const tus = (e: KeyboardEvent) => e.key === 'Escape' && kapat()
  window.addEventListener('keydown', tus)
  perde.addEventListener('click', () => kapat())
  $('.bg-kapat', kutu).addEventListener('click', () => kapat())
  kutu.querySelector('.bg-liste')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-i]')
    if (!b) return
    const x = liste[+b.dataset.i!]
    ses.tik()
    kapat(() => (x.tik ? x.tik() : x.git && u.git(x.git)))
  })
  // aşağı çekince kapansın
  let y0: number | null = null
  kutu.addEventListener('pointerdown', (e) => (y0 = kutu.scrollTop <= 0 ? e.clientY : null))
  kutu.addEventListener('pointerup', (e) => {
    if (y0 !== null && e.clientY - y0 > 70) kapat()
    y0 = null
  })
}

/** Menüden ("bugun-ac" olayı) her zaman; Eln'in telefonunda günde bir kez kendiliğinden */
export function bugunKur(z: Anlik, not: GununNotu, u: Arayuz) {
  window.addEventListener('bugun-ac', () => bugunAc(z, not, u))
  if (kimim() !== 'eln' || oku<string>('bugunGosterildi', '') === z.bugun) return
  // Eln bir şeyle uğraşırken (kaydırıyor, dokunuyor, yazıyor, bir pencere açık) araya girmesin:
  // eli boşta kalınca açılır; bir dakika boyunca fırsat çıkmazsa o gün hiç açılmaz
  let sonHareket = Date.now()
  const hareket = () => (sonHareket = Date.now())
  for (const t of ['pointerdown', 'keydown', 'wheel', 'touchmove']) window.addEventListener(t, hareket, { passive: true })
  const mesgul = () =>
    Date.now() - sonHareket < 2500 ||
    document.body.classList.contains('modal-acik') ||
    !!document.querySelector('.fisilti:not([hidden]), .gz-kutu, .yd, .hikaye') ||
    !!document.activeElement?.matches('input, textarea')
  const dene = (kalan: number) => {
    if (oku<string>('bugunGosterildi', '') === z.bugun) return
    if (!mesgul()) {
      yaz('bugunGosterildi', z.bugun)
      bugunAc(z, not, u)
    } else if (kalan > 0) window.setTimeout(() => dene(kalan - 1), 3000)
  }
  window.setTimeout(() => dene(17), 9000)
}
