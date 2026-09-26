import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ortakOku, ortakYaz } from '../cekirdek/ortak'
import { ardayaYaz, type Kim, kimim } from '../cekirdek/posta'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { ek, isoGun, simdi, yerel } from '../cekirdek/zaman'
import { $, belir, gsap, kacir, satirSatir, titret } from './yardimci'

/**
 * İKİMİZDEN HANGİSİ? — ikimiz de aynı soruları kendi telefonumuzda, birbirimizi görmeden cevaplarız.
 * İkimiz de cevaplayınca soru açılır: aynı mı dedik, yoksa tartışmalı mı?
 * Her yeni günde 3 soru (ilk gün 5). Cevaplar "ortak durum" ile öbür telefona gider.
 */
const { ben, sen } = ICERIK

// id'ler sabit: araya soru eklenebilir, sıra değişse de cevaplar karışmaz
const SORULAR: [string, string][] = [
  ['ozlem', 'Kim daha çok özlüyor?'],
  ['iyigece', 'Kim “iyi geceler” deyip yarım saat daha yazıyor?'],
  ['kiskanc', 'Kim daha kıskanç?'],
  ['havalimani', 'Havalimanında kim önce ağlar?'],
  ['gartic', 'gartic.io’da kim daha iyi çizer?'],
  ['sever', 'Kim ötekini daha çok seviyor?'],
  ['kus', 'Kim daha çabuk küser?'],
  ['baris', 'Küsünce kim önce yazar?'],
  ['uykucu', 'Kim daha uykucu?'],
  ['romantik', 'Kim daha romantik?'],
  ['inat', 'Kim daha inatçı?'],
  ['optum', 'Kim daha çok “öptüm” diyor?'],
  ['cay', 'Kim daha güzel çay demler?'],
  ['film', 'Birlikte film izlerken kim önce uyur?'],
  ['karar', 'Ne yiyeceğimize kim karar veremez?'],
  ['gulmek', 'Kim ötekini daha çok güldürüyor?'],
  ['ilkbakis', 'Yüz yüze ilk anda kim konuşamayacak?'],
  ['tamam', 'Kim “tamam” der ama tamam değildir?'],
  ['sarki', 'Kim daha çok şarkı atıyor?'],
  ['gecyatma', 'Kim daha geç yatıyor?'],
  ['sabah', 'Sabahları kim daha çekilmez?'],
  ['foto', 'Kim daha çok fotoğraf çekiyor?'],
  ['korku', 'Korku filminde kim gözünü kapatır?'],
  ['yol', 'Yabancı bir şehirde kim yolu bulur?'],
  ['ozur', 'Kim daha çok özür diliyor?'],
  ['emoji', 'Kim daha çok ☺️ atıyor?'],
  ['gec', 'İlk buluşmaya kim geç kalır?'],
  ['dans', 'Kim daha iyi dans eder?'],
  ['sabir', 'Uzak mesafeye kim daha sabırlı?'],
  ['bokkus', 'Kim daha çok “bokkuş” diyor?'],
  ['surpriz', 'Kim daha çok sürpriz yapıyor?'],
  ['daginik', 'Evde kim daha dağınık olacak?'],
  ['atistirma', 'Gece yarısı kim atıştırır?'],
  ['hakli', 'Tartışınca sonunda kim haklı çıkar?'],
  ['telefon', 'Telefonu kim daha önce kapatmak istemez?'],
  ['tatli', 'Kim daha tatlı uyur?'],
  ['plan', 'Buluşmayı kim daha çok hayal ediyor?'],
  ['hediye', 'Kim daha güzel hediye seçer?'],
  ['ilkadim', 'İlk adımı kim attı?'],
  ['sonsoz', 'Son sözü kim söyler?'],
]
const ILK_GUN = 5
const GUNDE = 3

type Cevaplar = Record<string, Kim>

const AYNI = ['Oy birliği ☺️', 'Aynı cevap. Demek ki doğru.', 'Tartışma yok, ikimiz de aynı yeri gösterdik.', 'Birbirimizi iyi tanıyoruz.']
const KENDI = ['İkimiz de kendimizi gösterdik 😏 Yüz yüze çözeriz.', 'İkimiz de “ben” dedik. Bu iş hakemsiz bitmez.']
const OTEKI = ['İkimiz de ötekini gösterdik ☺️ Kimse kabul etmiyor.', 'İkimiz de “sen” dedik. Bu kez kibarlık kazandı.']

/** "Bugün seni bekleyenler" için: cevaplamadığım açık sorular ve öbürünün cevapladıkları */
export function hangimizBekleyen() {
  const benKim = kimim()
  const karsiKim: Kim = benKim === 'eln' ? 'arda' : 'eln'
  const gunler = oku<string[]>('hangimizGunleri', [])
  const n = Math.min(SORULAR.length, ILK_GUN + GUNDE * Math.max(0, gunler.length - 1))
  const b = ortakOku<Cevaplar>(`hangi:${benKim}`, {})
  const o = ortakOku<Cevaplar>(`hangi:${karsiKim}`, {})
  const acik = SORULAR.slice(0, n).filter(([id]) => !b[id])
  return { soru: acik.length, onunki: acik.filter(([id]) => o[id]).length }
}

export function hangimizHTML() {
  return /* html */ `
  <section id="hangimiz" class="bolum" data-bolum="" data-ad="İkimizden Hangisi?">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>İkimizden hangisi?</p>
        <h2 class="baslik">Aynı sorular, iki telefon. <em>Kopya çekmek yok.</em></h2>
        <p class="metin">Ben de bu soruları kendi telefonumda cevaplıyorum; birbirimizin cevabını göremiyoruz. İkimiz de cevaplayınca soru açılıyor. Her yeni günde üç soru daha.</p>
      </div>
      <div class="hm" data-dom>
        <div class="hm-skor" aria-live="polite"></div>
        <div class="hm-sahne"></div>
        <details class="hm-gecmis">
          <summary>Cevaplarımız</summary>
          <ol class="hm-liste"></ol>
        </details>
      </div>
    </div>
  </section>`
}

export function hangimizKur() {
  const bolum = $('#hangimiz')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('.hm', bolum)])
  const skor = $('.hm-skor', bolum)
  const sahne = $('.hm-sahne', bolum)
  const liste = $('.hm-liste', bolum)
  const gecmis = $<HTMLDetailsElement>('.hm-gecmis', bolum)
  const benKim = kimim()
  const karsiKim: Kim = benKim === 'eln' ? 'arda' : 'eln'
  const ad = (k: Kim) => (k === 'eln' ? sen.ad : ben.ad)
  const karsiAd = benKim === 'eln' ? ben.ad : sen.ad

  // bölümü gördüğü her yeni gün yeni sorular
  const bugun = isoGun(yerel(simdi(), sen.saatDilimi))
  const gunler = oku<string[]>('hangimizGunleri', [])
  if (!gunler.includes(bugun)) {
    gunler.push(bugun)
    yaz('hangimizGunleri', gunler)
  }
  const acik = () => Math.min(SORULAR.length, ILK_GUN + GUNDE * (gunler.length - 1))

  const benim = () => ortakOku<Cevaplar>(`hangi:${benKim}`, {})
  const onun = () => ortakOku<Cevaplar>(`hangi:${karsiKim}`, {})
  let gosterilen: string | null = null

  const sonucYazi = (id: string, b: Kim, o: Kim) => {
    const i = SORULAR.findIndex((s) => s[0] === id)
    if (b === o) return AYNI[i % AYNI.length]
    // benim cevabım benim kendim mi?
    return b === benKim ? KENDI[i % KENDI.length] : OTEKI[i % OTEKI.length]
  }

  const skorYaz = () => {
    const b = benim()
    const o = onun()
    let ayni = 0
    let farkli = 0
    let bekleyen = 0
    for (const [id] of SORULAR) {
      if (!b[id]) continue
      if (!o[id]) bekleyen++
      else if (b[id] === o[id]) ayni++
      else farkli++
    }
    skor.innerHTML = `<span><b>${ayni}</b> aynı fikir</span><span><b>${farkli}</b> tartışmalı</span><span><b>${bekleyen}</b> ${ek(karsiAd, 'belirtme')} bekliyor</span>`
    liste.innerHTML = SORULAR.filter(([id]) => b[id])
      .map(([id, soru]) => {
        const sonuc = o[id] ? (o[id] === b[id] ? 'ayni' : 'farkli') : 'bekliyor'
        return `<li class="${sonuc}"><p>${kacir(soru)}</p><span>Ben → <b>${ad(b[id])}</b></span><span>${karsiAd} → <b>${o[id] ? ad(o[id]) : '⏳'}</b></span></li>`
      })
      .join('')
    gecmis.hidden = !liste.children.length
  }

  const sahneCiz = (canli = false) => {
    const b = benim()
    const o = onun()
    const n = acik()
    const siradaki = SORULAR.slice(0, n).find(([id]) => !b[id])
    if (!siradaki) {
      gosterilen = null
      const kalan = SORULAR.length - n
      sahne.innerHTML = /* html */ `
        <div class="hm-kart hm-bitti">
          <p class="hm-soru">${kalan ? 'Bugünlük bu kadar.' : 'Hepsini cevapladık.'}</p>
          <p class="hm-alt">${kalan ? `Yarın ${Math.min(GUNDE, kalan)} yeni soru gelecek.` : 'Yeni sorular gelince burada olacak.'} Aşağıda cevaplarımız duruyor; ${karsiAd} cevapladıkça açılıyor.</p>
        </div>`
      return
    }
    const [id, soru] = siradaki
    gosterilen = id
    const sira = SORULAR.findIndex((s) => s[0] === id) + 1
    sahne.innerHTML = /* html */ `
      <div class="hm-kart">
        <p class="hm-no">Soru ${sira} / ${n}${o[id] ? ` · <span class="hm-hazir">${karsiAd} cevapladı</span>` : ''}</p>
        <p class="hm-soru">${kacir(soru)}</p>
        <div class="hm-secim">
          <button type="button" data-k="${benKim}" class="hm-kisi ${benKim}"><i>${(benKim === 'eln' ? sen.ad : ben.ad)[0]}</i><span>Ben</span></button>
          <button type="button" data-k="${karsiKim}" class="hm-kisi ${karsiKim}"><i>${karsiAd[0]}</i><span>${karsiAd}</span></button>
        </div>
      </div>`
    if (canli) gsap.from(sahne.firstElementChild, { autoAlpha: 0, y: 16, rotateX: -12, duration: 0.7, ease: 'expo.out' })
  }

  const sonucGoster = (id: string) => {
    const b = benim()[id]
    const o = onun()[id]
    const kart = sahne.querySelector('.hm-kart')!
    const alt = document.createElement('div')
    alt.className = 'hm-sonuc'
    alt.innerHTML = o
      ? `<p class="hm-cevaplar"><span>Ben → <b>${ad(b)}</b></span><span>${karsiAd} → <b>${ad(o)}</b></span></p><p class="hm-yorum el">${sonucYazi(id, b, o)}</p>`
      : `<p class="hm-cevaplar"><span>Ben → <b>${ad(b)}</b></span><span>${karsiAd} → <b class="hm-muhur">✉︎ mühürlü</b></span></p><p class="hm-yorum el">${karsiAd} cevaplayınca açılacak.</p>`
    kart.querySelector('.hm-secim')?.replaceWith(alt)
    gsap.from(alt, { autoAlpha: 0, y: 10, duration: 0.6 })
    if (o && o === b) {
      ses.cin()
      titret([20, 40, 20])
      window.dispatchEvent(new CustomEvent('kutla', { detail: 20 }))
      window.setTimeout(() => sirBul('hangimiz'), 1400)
    }
  }

  sahne.addEventListener('click', (e) => {
    const d = (e.target as Element).closest<HTMLButtonElement>('.hm-kisi')
    if (!d || !gosterilen) return
    const id = gosterilen
    ortakYaz(`hangi:${benKim}`, { ...benim(), [id]: d.dataset.k as Kim })
    ses.tik()
    titret(12)
    d.classList.add('secildi')
    sonucGoster(id)
    skorYaz()
    const bittiMi = SORULAR.slice(0, acik()).every(([q]) => benim()[q])
    if (bittiMi && oku<string>('hangimizHaber', '') !== bugun) {
      yaz('hangimizHaber', bugun)
      void ardayaYaz(`${sen.ad} “İkimizden hangisi?” sorularını cevapladı 🤔`, 'Sıra sende. Sen de cevaplayınca ikiniz de görebileceksiniz; kopya çekmek yok.', ['thinking'])
    }
    window.setTimeout(() => sahneCiz(true), 2600)
  })

  // öbür telefondan cevaplar gelince
  window.addEventListener('ortak-degisti', (e) => {
    if (!(e as CustomEvent<string[]>).detail.includes(`hangi:${karsiKim}`)) return
    skorYaz()
    const b = benim()
    const o = onun()
    if (SORULAR.some(([id]) => b[id] && b[id] === o[id])) window.setTimeout(() => sirBul('hangimiz'), 1400)
    if (gosterilen && o[gosterilen]) {
      const no = sahne.querySelector('.hm-no')
      if (no && !no.querySelector('.hm-hazir')) no.insertAdjacentHTML('beforeend', ` · <span class="hm-hazir">${karsiAd} cevapladı</span>`)
    }
  })

  skorYaz()
  sahneCiz()
}
