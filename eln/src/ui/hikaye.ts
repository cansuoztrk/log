import { ICERIK } from '../icerik'
import { ADIM_KM, oku, type Ziyaret } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { SIRLAR, bulunanlar, sirBul } from '../cekirdek/sirlar'
import { MESAFE, anlik, dolunaySayisi, sayi, sevgiliAni, simdiMs, tarihYazi } from '../cekirdek/zaman'
import { azHareket, gsap, ikon, titret } from '../bolumler/yardimci'

const { ben, sen, arkadas } = ICERIK

interface Sayfa {
  ust: string
  sayi?: number
  birim?: string
  metin: string
  ton: number
}

/** Bu cihazda biriken her şeyden, o güne kadarki hikâyemiz */
function sayfalar(): Sayfa[] {
  const z = anlik()
  const ziyaret = oku<Ziyaret>('ziyaret', { gunler: [], toplam: 0, ilk: null })
  const notlar = Object.keys(oku<Record<string, unknown>>('notlar', {})).length
  const cevaplar = oku<unknown[]>('cevaplar', []).length
  const kuponlar = oku<{ kullanildi?: string }[]>('kuponlar', [])
  const opucuk = oku<number>('opucuk', 0)
  const zarflar = oku<string[]>('zarflar', []).length
  const gelenler = oku<unknown[]>('gelenler', []).length
  const saat = Math.floor((simdiMs() - sevgiliAni().getTime()) / 3_600_000)
  const dolunay = dolunaySayisi(sevgiliAni(), z.an)
  const km = Math.min(MESAFE, ziyaret.gunler.length * ADIM_KM)
  const s: Sayfa[] = [
    { ust: 'Bizim hikâyemiz', metin: `${sen.ad} ve ${ben.ad}. ${tarihYazi(ICERIK.tanisma)}’ten bugüne. Dokun, devam et.`, ton: 0 },
    {
      ust: 'Tanışalı',
      sayi: z.tanisalGun,
      birim: 'gün',
      metin: `${arkadas} bir tuşa bastı; ben gruba eklendim, sen de hayatıma. O günden beri ${sayi(z.tanisalGun)} gün geçti.`,
      ton: 1,
    },
    {
      ust: '“Biz” olalı',
      sayi: Math.max(0, saat),
      birim: 'saat',
      metin: `21 Mayıs, benim saatimle ${ICERIK.sevgiliSaat}, seninkiyle bir saat sonrası. O dakikadan beri saat saat, seninim.`,
      ton: 2,
    },
  ]
  if (dolunay > 0)
    s.push({
      ust: 'Aynı ay',
      sayi: dolunay,
      birim: 'dolunay',
      metin: 'O günden beri gökyüzü bu kadar kez doldu. Her birinde aynı ışık iki ayrı pencereye düştü.',
      ton: 3,
    })
  if (ziyaret.gunler.length > 0)
    s.push({
      ust: 'Bu sitede',
      sayi: ziyaret.gunler.length,
      birim: 'gün',
      metin: `Buraya bu kadar farklı günde geldin. Her gelişinde sana 21 km yaklaştım: toplam ${sayi(km)} km.`,
      ton: 4,
    })
  if (notlar > 0)
    s.push({
      ust: 'Rüzgâr getirdi',
      sayi: notlar,
      birim: 'not',
      metin:
        cevaplar > 0
          ? `Rüzgâr sana bu kadar not getirdi. Sen de ${sayi(cevaplar)} soruya cevap verdin; hepsini okudum.`
          : 'Rüzgâr sana bu kadar not getirdi. Her biri bir sabah, bir akşam, bir “seni düşündüm”.',
      ton: 1,
    })
  if (gelenler > 0)
    s.push({
      ust: 'Ters rüzgâr',
      sayi: gelenler,
      birim: 'not',
      metin: 'Ben de sana rüzgârla bu kadar not yolladım. Sen açtıkça telefonuma “okundu” düştü; her seferinde gülümsedim.',
      ton: 2,
    })
  if (kuponlar.length > 0) {
    const kullanilan = kuponlar.filter((k) => k.kullanildi).length
    s.push({
      ust: 'Cüzdanında',
      sayi: kuponlar.length,
      birim: 'kupon',
      metin: `Kullandıkların: ${sayi(kullanilan)}. Buluşmamızı bekleyenler: ${sayi(kuponlar.length - kullanilan)}. Hepsini ödeyeceğim; faiziyle.`,
      ton: 3,
    })
  }
  if (zarflar > 0)
    s.push({
      ust: 'Açtığın mektuplar',
      sayi: zarflar,
      birim: 'zarf',
      metin: 'Her biri bir gün işine yarasın diye yazılmıştı. İşine yaradıysa ne mutlu bana.',
      ton: 4,
    })
  s.push({
    ust: 'Bulduğun sırlar',
    sayi: bulunanlar().length,
    birim: `/ ${SIRLAR.length}`,
    metin:
      bulunanlar().length >= SIRLAR.length
        ? 'Hepsini buldun. Artık bu sitede senden saklanan hiçbir şey yok.'
        : 'Kalanlar hâlâ saklanıyor. Bazıları sadece belli bir gün, belli bir dakika çıkar.',
    ton: 0,
  })
  if (opucuk > 0)
    s.push({
      ust: 'Öptüm',
      sayi: opucuk,
      birim: 'öpücük',
      metin: 'Sitenin sonundaki düğmeden bana bu kadar “öptüm” dedin. Hepsini aldım. Hepsini saklıyorum.',
      ton: 2,
    })
  s.push({
    ust: 'Ve',
    metin: 'Bu daha başlangıç. Hikâyenin en güzel sayfası henüz yazılmadı: aynı şehirde, aynı masada, aynı saatte.',
    ton: 5,
  })
  return s
}

let acik = false

export function hikayeAc() {
  if (acik) return
  acik = true
  ses.baslat()
  const liste = sayfalar()
  const SURE = 5.5
  const el = document.createElement('div')
  el.className = 'hikaye'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-label', 'Bizim hikâyemiz')
  el.innerHTML = /* html */ `
    <div class="h-cubuklar">${liste.map(() => '<span><i></i></span>').join('')}</div>
    <button class="ikon-dugme h-kapat" type="button" aria-label="Kapat">${ikon('kapat')}</button>
    <div class="h-sayfa" aria-live="polite">
      <p class="h-ust"></p>
      <p class="h-sayi"><b></b><span class="h-birim"></span></p>
      <p class="h-metin"></p>
      <p class="h-imza kaligrafi"></p>
    </div>
    <button class="h-geri" type="button" aria-label="Önceki"></button>
    <button class="h-ileri" type="button" aria-label="Sonraki"></button>`
  document.body.appendChild(el)
  document.body.classList.add('modal-acik')
  const cubuklar = Array.from(el.querySelectorAll<HTMLElement>('.h-cubuklar i'))
  const sayfa = el.querySelector<HTMLElement>('.h-sayfa')!
  const ust = el.querySelector<HTMLElement>('.h-ust')!
  const sayiEl = el.querySelector<HTMLElement>('.h-sayi b')!
  const birim = el.querySelector<HTMLElement>('.h-birim')!
  const metin = el.querySelector<HTMLElement>('.h-metin')!
  const imza = el.querySelector<HTMLElement>('.h-imza')!

  let i = -1
  let ilerleme: gsap.core.Tween | null = null
  const goster = (n: number) => {
    if (n < 0) n = 0
    if (n >= liste.length) {
      sirBul('hikaye')
      kapat()
      return
    }
    i = n
    const p = liste[i]
    el.dataset.ton = String(p.ton)
    cubuklar.forEach((c, k) => {
      gsap.killTweensOf(c)
      gsap.set(c, { scaleX: k < i ? 1 : 0 })
    })
    ust.textContent = p.ust
    metin.textContent = p.metin
    imza.textContent = i === liste.length - 1 ? 'Öptüm.' : ''
    sayiEl.parentElement!.hidden = p.sayi == null
    birim.textContent = p.birim ?? ''
    if (p.sayi != null) {
      const o = { v: 0 }
      gsap.to(o, { v: p.sayi, duration: azHareket ? 0.01 : 1.4, ease: 'power3.out', onUpdate: () => (sayiEl.textContent = sayi(Math.round(o.v))) })
    }
    gsap.fromTo(sayfa.children, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'expo.out' })
    ses.nota([74, 76, 78, 81, 83, 86][i % 6], 0.03)
    titret(6)
    ilerleme?.kill()
    ilerleme = gsap.fromTo(cubuklar[i], { scaleX: 0 }, { scaleX: 1, duration: SURE, ease: 'none', onComplete: () => goster(i + 1) })
  }

  const kapat = () => {
    acik = false
    ilerleme?.kill()
    document.body.classList.remove('modal-acik')
    gsap.to(el, { autoAlpha: 0, duration: 0.6, onComplete: () => el.remove() })
  }
  el.querySelector('.h-kapat')!.addEventListener('click', kapat)
  el.querySelector('.h-ileri')!.addEventListener('click', () => goster(i + 1))
  el.querySelector('.h-geri')!.addEventListener('click', () => goster(i - 1))
  // basılı tutunca durur (hikâyelerdeki gibi)
  el.addEventListener('pointerdown', () => ilerleme?.pause())
  el.addEventListener('pointerup', () => ilerleme?.resume())
  el.addEventListener('pointercancel', () => ilerleme?.resume())
  const tus = (e: KeyboardEvent) => {
    if (!acik) return window.removeEventListener('keydown', tus)
    if (e.key === 'Escape') kapat()
    if (e.key === 'ArrowRight') goster(i + 1)
    if (e.key === 'ArrowLeft') goster(i - 1)
  }
  window.addEventListener('keydown', tus)
  gsap.from(el, { autoAlpha: 0, duration: 0.6 })
  goster(0)
}
