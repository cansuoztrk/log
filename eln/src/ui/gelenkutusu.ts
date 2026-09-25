import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { ardayaYaz, type Gelen, gelenleriAl, kimim } from '../cekirdek/posta'
import { saatYazi, tarihYazi, isoGun, yerel } from '../cekirdek/zaman'
import { gsap, ikon, kacir, titret } from '../bolumler/yardimci'
import { banaHitap } from '../bolumler/ruzgar'
import { bildir } from './ust'

const { ben, sen } = ICERIK

export const gelenler = () => oku<Gelen[]>('gelenler', [])

/** Arda'nın bıraktığı bir notu mektup gibi açar; ilk açılışta Arda'ya "okundu" gider. */
export function gelenAc(id: string) {
  const liste = gelenler()
  const g = liste.find((x) => x.id === id)
  if (!g) return
  const an = new Date(g.zaman)
  const m = document.createElement('div')
  m.className = 'zarf-modal gelen-modal'
  m.setAttribute('role', 'dialog')
  m.setAttribute('aria-modal', 'true')
  m.setAttribute('data-lenis-prevent', '')
  m.innerHTML = /* html */ `
    <article class="kagit modal-kagit">
      <button class="ikon-dugme modal-kapat" type="button" aria-label="Kapat">${ikon('kapat')}</button>
      <p class="hitap modal-baslik">Rüzgâr senin için bir şey getirdi…</p>
      <p class="mektup-tarih">${tarihYazi(isoGun(yerel(an, sen.saatDilimi)))}, ${saatYazi(an, sen.saatDilimi)} · ${ben.yerelSehir}’dan</p>
      ${g.soru ? `<p class="gelen-soru">❝${kacir(g.soru)}❞</p>` : ''}
      <div class="modal-metin">${kacir(g.metin)
        .split(/\n+/)
        .map((p) => `<p>${p}</p>`)
        .join('')}</div>
      <p class="imza">${banaHitap()}</p>
    </article>`
  document.body.appendChild(m)
  document.body.classList.add('modal-acik')
  const kagit = m.querySelector('.kagit')!
  ses.vuus(0.9)
  window.setTimeout(() => ses.nota(81, 0.035), 350)
  titret([15, 40, 15])
  gsap.fromTo(m, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 })
  gsap.fromTo(kagit, { y: 60, rotateX: 25, opacity: 0 }, { y: 0, rotateX: 0, opacity: 1, duration: 1, ease: 'expo.out' })
  const kapat = () =>
    gsap.to(m, {
      autoAlpha: 0,
      duration: 0.4,
      onComplete: () => {
        m.remove()
        if (!document.querySelector('.zarf-modal:not([hidden]), .uyku')) document.body.classList.remove('modal-acik')
      },
    })
  m.querySelector('.modal-kapat')!.addEventListener('click', kapat)
  m.addEventListener('click', (e) => e.target === m && kapat())

  if (!g.okundu) {
    g.okundu = true
    yaz('gelenler', liste)
    const ozet = g.metin.length > 70 ? `${g.metin.slice(0, 70)}…` : g.metin
    void ardayaYaz(`${sen.ad} notunu okudu ✓`, `“${ozet}”`, ['white_check_mark'])
  }
}

/** Eln'in cihazında: açılışta ve arada bir Arda'dan yeni not var mı diye bakar. */
export function gelenKutusuKur() {
  // "Topladığın notlar" çekmecesindeki gelen notlara dokununca aç
  document.addEventListener('click', (e) => {
    const b = (e.target as Element | null)?.closest<HTMLElement>('[data-gelen]')
    if (b) gelenAc(b.dataset.gelen!)
  })
  if (kimim() !== 'eln') return
  let bakiyor = false
  const bak = async () => {
    if (bakiyor || document.hidden) return
    bakiyor = true
    const yeniler = await gelenleriAl()
    bakiyor = false
    const liste = gelenler()
    const eklenen = yeniler.filter((y) => !liste.some((x) => x.id === y.id))
    if (!eklenen.length) return
    liste.push(...eklenen)
    liste.sort((a, b) => a.zaman - b.zaman)
    yaz('gelenler', liste.slice(-200))
    ses.bildirim()
    titret([30, 80, 30])
    const son = eklenen[eklenen.length - 1]
    bildir({
      ust: eklenen.length > 1 ? `${eklenen.length} yeni not` : 'Rüzgâr ters yönden esti',
      baslik: `${banaHitap()} sana bir not bıraktı`,
      metin: 'Dokun, aç.',
      simge: '✉',
      sure: 20000,
      tik: () => gelenAc(son.id),
    })
  }
  window.setTimeout(() => void bak(), 3000)
  window.setInterval(() => void bak(), 5 * 60_000)
  document.addEventListener('visibilitychange', () => !document.hidden && void bak())
  // ikimiz de sitedeysek Arda not gönderince hemen bak (bkz. ui/nabiz.ts)
  window.addEventListener('gelen-kontrol', () => void bak())
}
