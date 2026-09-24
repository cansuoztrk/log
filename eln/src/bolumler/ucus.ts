import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { type Anlik, sayi, simdi, simdiMs } from '../cekirdek/zaman'
import { $, $$, azHareket, belir, gorunurken, satirSatir, titret } from './yardimci'

const { ben, sen, tanisma, ilkBulusma, birlikteListesi } = ICERIK
const KARAKTERLER = ' ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZƏ0123456789:.-'
const tr = (s: string) => s.toLocaleUpperCase('tr-TR')
const UCUS_NO = `${tr(ben.ad[0])}${tr(sen.ad[0])}${tanisma.slice(8, 10)}${tanisma.slice(5, 7)}`

const ALANLAR = [
  { ad: 'Uçuş', uzunluk: 6 },
  { ad: 'Nereden', uzunluk: 8 },
  { ad: 'Nereye', uzunluk: 8 },
  { ad: 'Kapı', uzunluk: 6 },
  { ad: 'Durum', uzunluk: 14 },
]

export function ucusHTML(z: Anlik) {
  const hucreler = (n: number) =>
    Array.from({ length: n }, () => `<span class="flap"><span class="f u"><i> </i></span><span class="f a"><i> </i></span><span class="f ku"><i> </i></span><span class="f ka"><i> </i></span></span>`).join('')
  return /* html */ `
  <section id="ucus" class="bolum" data-bolum="X" data-ad="İlk Buluşma">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no">X</span>İlk buluşma</p>
        <h2 class="baslik">Hiç buluşmadık. <em>Henüz.</em></h2>
      </div>
      <div class="pano" data-dom aria-label="Kalkış panosu">
        <div class="pano-bas"><span>Kalkış · Departures</span><span class="pano-saat">--:--</span></div>
        ${ALANLAR.map((a, i) => `<div class="pano-satir" data-alan="${i}"><small>${a.ad}</small><div class="flaplar">${hucreler(a.uzunluk)}</div></div>`).join('')}
        <div class="pano-alt"><span>GYD ⇄ IST · uçuş ~3 saat</span><span>bekleyiş: ${sayi(z.gunNo)}. gün</span></div>
      </div>
      <div class="ucus-metin">
        <p class="satir">O anı o kadar çok kurdum ki, hafızamda bir anı gibi duruyor.</p>
        <p class="metin">Geliş kapısından biri çıkacak. Belki sen, belki ben. Kim kime uçarsa uçsun, sonu aynı: kalabalığın içinde o yüz, ve dünyanın bir anlığına susması.</p>
        <p class="satir buyuk italik">Ne diyeceğimi bin kez prova ettim. Sonunda karar verdim: hiçbir şey demeyeceğim. <em>Sadece sarılacağım.</em></p>
        <p class="metin">O saniyenin yanında, bu sitedeki bütün kelimeler susar.</p>
      </div>
      <div class="birlikte">
        <p class="etiket">Birlikte yapacaklarımız</p>
        <ul>
          ${birlikteListesi
            .map(
              (m, i) => `<li><label><input type="checkbox" data-i="${i}"/><span class="kutu" aria-hidden="true"><svg viewBox="0 0 24 24"><use href="#i-kalp"/></svg></span><span class="madde">${m}</span></label></li>`,
            )
            .join('')}
        </ul>
        <p class="dipnot">Birini yaptığımızda işaretle. (Yaptıkça bu liste uzayacak, söz.)</p>
      </div>
    </div>
  </section>`
}

/* ─── Split-flap ─── */
class Flap {
  private simdiki = ' '
  private kuyruk: string[] = []
  private donuyor = false
  constructor(private el: HTMLElement) {}

  ayarla(hedef: string) {
    const bas = KARAKTERLER.indexOf(this.simdiki)
    const son = Math.max(0, KARAKTERLER.indexOf(hedef))
    const adimlar: string[] = []
    let i = bas < 0 ? 0 : bas
    const toplam = (son - i + KARAKTERLER.length) % KARAKTERLER.length
    const atla = toplam > 9 ? toplam - (5 + Math.floor(Math.random() * 4)) : 0
    i = (i + atla) % KARAKTERLER.length
    while (i !== son) {
      i = (i + 1) % KARAKTERLER.length
      adimlar.push(KARAKTERLER[i])
    }
    this.kuyruk = adimlar
    if (!this.donuyor) this.adim()
  }

  private yaz(sinif: string, c: string) {
    this.el.querySelector(`.${sinif} i`)!.textContent = c
  }

  private adim(): void {
    const c = this.kuyruk.shift()
    if (c === undefined) {
      this.donuyor = false
      return
    }
    this.donuyor = true
    const eski = this.simdiki
    this.simdiki = c
    if (azHareket) {
      for (const s of ['u', 'a', 'ku', 'ka']) this.yaz(s, c)
      return this.adim()
    }
    this.yaz('u', c)
    this.yaz('ku', eski)
    this.yaz('ka', c)
    this.yaz('a', eski)
    this.el.classList.remove('cevir')
    void this.el.offsetWidth
    this.el.classList.add('cevir')
    tik()
    window.setTimeout(() => {
      this.yaz('a', c)
      this.adim()
    }, 70)
  }
}

let sonTik = 0
let panoGorunur = false
function tik() {
  const t = performance.now()
  if (!panoGorunur || t - sonTik < 28) return
  sonTik = t
  ses.tik()
}

function geriSayim() {
  if (!ilkBulusma) return null
  const hedef = new Date(ilkBulusma + (ilkBulusma.length <= 10 ? 'T12:00' : '') + ':00+04:00').getTime()
  const fark = hedef - simdiMs()
  if (fark <= 0) return 'İNDİ'
  const g = Math.floor(fark / 86400000)
  const s = Math.floor((fark % 86400000) / 3600000)
  const d = Math.floor((fark % 3600000) / 60000)
  return `${g}G ${String(s).padStart(2, '0')}S ${String(d).padStart(2, '0')}D`
}

export function ucusKur() {
  const bolum = $('#ucus')
  satirSatir($('.baslik', bolum))
  belir(Array.from(bolum.querySelectorAll('.ucus-metin > *')))
  belir($('.birlikte', bolum))

  const satirlar = $$('.pano-satir', bolum).map((s) => $$('.flap', s).map((f) => new Flap(f)))
  const yazdir = (i: number, metin: string) => {
    const hucre = satirlar[i]
    const m = tr(metin).padEnd(hucre.length, ' ').slice(0, hucre.length)
    hucre.forEach((f, k) => window.setTimeout(() => f.ayarla(m[k]), k * 45))
  }
  const DURUMLAR = ['HAYAL EDİLİYOR', 'PLANLANIYOR', 'YAKINDA', 'KALBİMDE İNDİ']
  let tur = 0
  const guncelle = () => {
    const ters = tur % 2 === 1
    yazdir(0, UCUS_NO)
    yazdir(1, ters ? ben.yerelSehir : sen.yerelSehir)
    yazdir(2, ters ? sen.yerelSehir : ben.yerelSehir)
    yazdir(3, 'KALBİM')
    yazdir(4, geriSayim() ?? DURUMLAR[tur % DURUMLAR.length])
    tur++
  }
  let zaman = 0
  const saat = $('.pano-saat', bolum)
  gorunurken($('.pano', bolum), (a) => {
    panoGorunur = a
    window.clearInterval(zaman)
    if (a) {
      guncelle()
      zaman = window.setInterval(() => {
        guncelle()
      }, 6500)
    }
  })
  const saatYaz = () => {
    const t = simdi()
    saat.textContent = new Intl.DateTimeFormat('tr-TR', { timeZone: sen.saatDilimi, hour: '2-digit', minute: '2-digit' }).format(t) + ' GYD'
  }
  saatYaz()
  window.setInterval(saatYaz, 30000)

  // Birlikte listesi
  const secili = new Set(oku<number[]>('liste', []))
  for (const kutu of $$<HTMLInputElement>('.birlikte input', bolum)) {
    const i = +kutu.dataset.i!
    kutu.checked = secili.has(i)
    kutu.addEventListener('change', () => {
      kutu.checked ? secili.add(i) : secili.delete(i)
      yaz('liste', [...secili])
      if (kutu.checked) {
        ses.nota(86, 0.04)
        titret(12)
      }
    })
  }
}
