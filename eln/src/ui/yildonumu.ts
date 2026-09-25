import { ICERIK } from '../icerik'
import { oku, yaz, type Ziyaret } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { SIRLAR, bulunanlar, sirBul } from '../cekirdek/sirlar'
import { ardayaYaz, kimim } from '../cekirdek/posta'
import { albumIcerik, albumOtomatik, dosyaUrl } from '../cekirdek/album'
import { type Anlik, sayi, sevgiliAni, simdiMs, tarihYazi } from '../cekirdek/zaman'
import { azHareket, gsap, kacir, titret } from '../bolumler/yardimci'
import { hikayeAc } from './hikaye'
import { MEKTUPLAR } from '../mektuplar'

/**
 * YIL DÖNÜMÜ — 21 Mayıs'ta (biz olduğumuz gün) ve 6 Aralık'ta (tanıştığımız gün) site bambaşka açılır:
 * hikâye gibi ilerleyen tam ekran sayfalar, o yılın sayıları, bir fotoğrafı, akşam 18:32'ye geri sayım
 * ve o güne kilitli mektup. Önizleme: ?tarih=2027-05-21
 */
type Tur = 'sevgili' | 'tanisma'

export function yilDonumu(z: Anlik): { tur: Tur; yil: number } | null {
  const [y, a, g] = z.bugun.split('-')
  for (const [tur, tarih] of [
    ['sevgili', ICERIK.sevgili],
    ['tanisma', ICERIK.tanisma],
  ] as const) {
    const [ty, ta, tg] = tarih.split('-')
    const yil = +y - +ty
    if (a === ta && g === tg && yil > 0) return { tur, yil }
  }
  return null
}

const SIRA = ['', 'Birinci', 'İkinci', 'Üçüncü', 'Dördüncü', 'Beşinci', 'Altıncı', 'Yedinci', 'Sekizinci', 'Dokuzuncu', 'Onuncu']
const yilAdi = (n: number) => (n === 1 ? 'Bir yıl.' : `${sayi(n)} yıl.`)

interface Sayfa {
  html: string
  sonra?: (el: HTMLElement) => void
}

function sayfalar(z: Anlik, tur: Tur, yil: number): Sayfa[] {
  const { sen, ben, arkadas } = ICERIK
  const s: Sayfa[] = []
  const gun = tur === 'sevgili' ? z.sevgiliGun : z.tanisalGun
  // 1. açılış
  s.push({
    html: `<small>${tarihYazi(z.bugun)}</small>
      <h2>${yilAdi(yil)}</h2>
      <p>${
        tur === 'sevgili'
          ? `${yil === 1 ? 'Bir yıl' : `${sayi(yil)} yıl`} önce bugün, saat ${ICERIK.sevgiliSaat}’de “biz” olduk. Bakü’de güneş batıyordu, İstanbul’da hâlâ yüksekteydi.`
          : `${yil === 1 ? 'Bir yıl' : `${sayi(yil)} yıl`} önce bugün ${arkadas} bir tuşa bastı. Ben gruba eklendim, sen de hayatıma.`
      }</p>`,
  })
  // 2. büyük sayaç
  s.push({
    html: `<small>${tur === 'sevgili' ? '“Biz” olalı' : 'Tanışalı'}</small>
      <h2 class="yd-sayi" data-hedef="${gun}">0</h2>
      <p>gün. ${tur === 'sevgili' ? 'Her birinde seni yeniden seçtim.' : 'Hiçbirini başka türlü yaşamak istemezdim.'}</p>`,
    sonra: (el) => {
      const h = el.querySelector<HTMLElement>('.yd-sayi')!
      const o = { n: 0 }
      gsap.to(o, { n: gun, duration: azHareket ? 0 : 2.4, ease: 'power3.out', onUpdate: () => (h.textContent = sayi(Math.round(o.n))) })
    },
  })
  // 3. bu telefonda biriken bir yıl
  const ziyaret = oku<Ziyaret>('ziyaret', { gunler: [], toplam: 0, ilk: null })
  const saat = Math.floor((simdiMs() - sevgiliAni().getTime()) / 3_600_000)
  const kalemler = [
    [ziyaret.gunler.length, 'gün buraya geldin'],
    [Object.keys(oku<Record<string, unknown>>('notlar', {})).length, 'rüzgâr notu topladın'],
    [oku<number>('opucuk', 0), 'kez “öptüm” dedin'],
    [oku<unknown[]>('fisiltilar', []).length, 'fısıltı'],
    [oku<unknown[]>('fenerler', []).length, 'dilek feneri uçurdun'],
    [Object.keys(oku<Record<string, unknown>>('ilkler', {})).length, 'ilk deftere yazıldı'],
    [oku<unknown[]>('kuponlar', []).length, 'kupon kazıdın'],
    [bulunanlar().length, `sır buldun (${SIRLAR.length} içinden)`],
  ].filter(([n]) => (n as number) > 0) as [number, string][]
  if (tur === 'sevgili' && saat > 0) kalemler.unshift([saat, 'saat'])
  if (kalemler.length)
    s.push({
      html: `<small>Bu bir yılda</small>
        <ul class="yd-liste">${kalemler.map(([n, m]) => `<li><b>${sayi(n)}</b><span>${m}</span></li>`).join('')}</ul>
        <p class="el">Sayamadıklarım: sesini kaç kez dinlediğim, seni kaç kez düşündüğüm.</p>`,
    })
  // 4. albüm açıksa: bir fotoğrafı
  const a = albumIcerik()
  if (a?.fotolar.length) {
    const f = a.fotolar[(yil - 1) % a.fotolar.length]
    s.push({
      html: `<small>Bu yılın en güzel manzarası</small>
        <figure class="yd-foto"><img alt="${kacir(f.alt ?? sen.ad)}"/><figcaption class="el">${kacir(f.not ?? '')}</figcaption></figure>`,
      sonra: (el) => {
        void dosyaUrl(f.id).then((u) => {
          const img = el.querySelector('img')
          if (u && img) img.src = u
        })
      },
    })
  }
  // 5. akşama geri sayım (yalnızca 21 Mayıs)
  if (tur === 'sevgili') {
    const hedef = new Date(`${z.bugun}T${ICERIK.sevgiliSaat}:00+03:00`).getTime()
    const kalan = Math.round((hedef - simdiMs()) / 60000)
    s.push({
      html:
        kalan > 0
          ? `<small>Bu akşam</small><h2>${ICERIK.sevgiliSaat}</h2>
             <p>${Math.floor(kalan / 60) ? `${sayi(Math.floor(kalan / 60))} saat ` : ''}${kalan % 60} dakika sonra, bir yıl önceki o dakika yeniden gelecek. O an burada ol; ben de olacağım.</p>`
          : `<small>Bu akşam</small><h2>${ICERIK.sevgiliSaat}</h2>
             <p>O dakika geçti ama bu gün daha bitmedi. Bir yıl önce bu saatlerde ikimiz de telefona bakıp gülümsüyorduk.</p>`,
    })
  }
  // 6. kapanış (o güne kilitli bir mektup varsa ona götürür)
  const mektupId = tur === 'sevgili' ? `yildonumu-${yil}` : yil === 1 ? 'yil-tanisma' : ''
  const mektupVar = MEKTUPLAR.some((m) => m.id === mektupId)
  s.push({
    html: `<small>${SIRA[yil] ?? `${sayi(yil)}.`} ${tur === 'sevgili' ? 'yıl dönümümüz' : 'tanışma yıl dönümümüz'}</small>
      <h2 class="kaligrafi">${sen.ad} &amp; ${ben.ad}</h2>
      <p>${mektupVar ? 'Senin için bir mektup bıraktım; bugüne kilitliydi, artık açık.' : 'Bir yıl daha. Bir sonrakinde aynı masada olalım.'}</p>
      <div class="yd-dugmeler">
        ${mektupVar ? `<button class="dugme" type="button" data-yd="mektup" data-id="${mektupId}"><span>Mektubu aç</span></button>` : ''}
        <button class="dugme hayalet" type="button" data-yd="hikaye"><span>Hikâyemizi izle</span></button>
        <button class="dugme hayalet" type="button" data-yd="kapat"><span>Siteye gir</span></button>
      </div>`,
  })
  return s
}

export function yilDonumuAc(z: Anlik, tur: Tur, yil: number, kutla: (n: number) => void, kapaninca?: () => void) {
  const liste = sayfalar(z, tur, yil)
  const kutu = document.createElement('section')
  kutu.className = `yd yd-${tur}`
  kutu.setAttribute('role', 'dialog')
  kutu.setAttribute('aria-label', 'Yıl dönümü')
  kutu.setAttribute('data-lenis-prevent', '')
  kutu.innerHTML = `
    <div class="yd-kalpler" aria-hidden="true">${Array.from({ length: 16 }, (_, k) => `<span style="--x:${(k * 37) % 100}%;--g:${(k * 0.7) % 6}s;--s:${0.7 + ((k * 13) % 7) / 10}">♥</span>`).join('')}</div>
    <div class="yd-cubuklar">${liste.map(() => '<i><b></b></i>').join('')}</div>
    <div class="yd-sahne" aria-live="polite"></div>
    <p class="yd-ipucu">Dokun, devam et</p>`
  document.body.appendChild(kutu)
  document.body.classList.add('modal-acik')
  const sahne = kutu.querySelector<HTMLElement>('.yd-sahne')!
  const cubuklar = [...kutu.querySelectorAll<HTMLElement>('.yd-cubuklar b')]
  let i = -1
  let zamanlayici = 0

  const kapat = () => {
    window.clearTimeout(zamanlayici)
    document.body.classList.remove('modal-acik')
    gsap.to(kutu, { autoAlpha: 0, duration: 0.6, onComplete: () => kutu.remove() })
    kapaninca?.()
  }
  const git = (n: number) => {
    if (n < 0) n = 0
    if (n >= liste.length) return
    i = n
    window.clearTimeout(zamanlayici)
    cubuklar.forEach((c, k) => {
      gsap.killTweensOf(c)
      gsap.set(c, { scaleX: k < i ? 1 : 0 })
    })
    const son = i === liste.length - 1
    if (!son && !azHareket) gsap.to(cubuklar[i], { scaleX: 1, duration: 6.5, ease: 'none' })
    else gsap.set(cubuklar[i], { scaleX: 1 })
    sahne.innerHTML = `<div class="yd-sayfa">${liste[i].html}</div>`
    const el = sahne.firstElementChild as HTMLElement
    gsap.from(el.children, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.15, ease: 'expo.out' })
    liste[i].sonra?.(el)
    ses.nota([76, 79, 81, 84, 86, 88][i % 6], 0.035)
    if (i === 0 || son) kutla(son ? 90 : 40)
    if (son) {
      titret([30, 60, 30, 60, 80])
      window.setTimeout(() => sirBul('yildonumu'), 1200)
      kutu.querySelector('.yd-ipucu')?.remove()
    } else if (!azHareket) zamanlayici = window.setTimeout(() => git(i + 1), 6500)
  }

  kutu.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-yd]')
    if (b) {
      const ne = b.dataset.yd
      kapat()
      if (ne === 'mektup') window.setTimeout(() => window.dispatchEvent(new CustomEvent('zarf-ac', { detail: b.dataset.id })), 700)
      if (ne === 'hikaye') window.setTimeout(() => hikayeAc(), 700)
      return
    }
    // ekranın sol üçte biri geri, gerisi ileri
    const r = kutu.getBoundingClientRect()
    git((e as MouseEvent).clientX < r.width / 3 ? i - 1 : i + 1)
  })
  window.addEventListener('keydown', function tus(e) {
    if (!kutu.isConnected) return window.removeEventListener('keydown', tus)
    if (e.key === 'Escape') kapat()
    else if (e.key === 'ArrowRight' || e.key === ' ') git(i + 1)
    else if (e.key === 'ArrowLeft') git(i - 1)
  })
  gsap.fromTo(kutu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 })
  git(0)
}

/** Yıl dönümü sabahı (gün içinde ilk girişte) kendiliğinden; menüden değil, yalnızca o gün */
export function yilDonumuKur(z: Anlik, kutla: (n: number) => void, kapaninca: () => void) {
  const y = yilDonumu(z)
  if (!y) return false
  document.documentElement.classList.add('yildonumu')
  if (oku<string>('yildonumuGosterildi', '') === z.bugun) return false
  yaz('yildonumuGosterildi', z.bugun)
  // telefon kelimeyi hatırlıyorsa albüm çözülsün (fotoğraf sayfası için), ama en fazla 2,5 sn beklenir
  const bekle = new Promise((r) => window.setTimeout(r, 2500))
  void Promise.all([Promise.race([albumOtomatik(), bekle]), new Promise((r) => window.setTimeout(r, 700))]).then(() =>
    yilDonumuAc(z, y.tur, y.yil, kutla, kapaninca),
  )
  if (kimim() === 'eln')
    void ardayaYaz(
      y.tur === 'sevgili' ? `${ICERIK.sen.ad} yıl dönümü sürprizini açtı 🎉` : `${ICERIK.sen.ad} tanışma yıl dönümü sürprizini açtı 🎉`,
      'Şu an bakıyor. Bugün ona bir şey yaz.',
      ['tada'],
    )
  return true
}
