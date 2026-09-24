import { ses } from '../cekirdek/ses'
import { $, $$, belir, satirSatir } from './yardimci'

/** İki dil, tek kalp — Türkçe ön yüz, Azərbaycan dili arka yüz */
const KARTLAR: [string, string, string][] = [
  ['Özledim', 'Darıxmışam', 'Özlemek bir eksiklik; darıxmak bir daralma, göğsün sıkışması. Senden uzakta ikisini birden yaşıyorum.'],
  ['Güzelim', 'Gözəlim', 'Derler ki bu kelime “göz”den gelir: gözün gördüğü en güzel şey. Seni bir ekrandan görüyorum ve yine de öyle.'],
  ['Kalbim', 'Ürəyim', 'Bizde de var aslında: yüreğim. Ama senin sesinle “ürəyim” başka türlü atıyor.'],
  ['İyi geceler', 'Gecən xeyrə qalsın', 'Sizin iyi geceleriniz bir dua: gecen hayra kalsın. Her gece bunu ben de sana diliyorum.'],
  ['Yakında', 'Tezliklə', 'İki dilde de en sevdiğim kelime. Her gün biraz daha doğru.'],
  ['Canım', 'Canım', 'Bu ikimizde de aynı. Çünkü can, can.'],
  ['Seni seviyorum', 'Səni sevirəm', 'Birkaç harf farkı. Tek kalp.'],
]

export function dillerHTML() {
  return /* html */ `
  <section id="diller" class="bolum" data-bolum="VII" data-ad="İki Dil">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no">VII</span>İki dil, tek kalp</p>
        <h2 class="baslik">Aynı dilin iki <em>sesiyiz</em>.</h2>
        <p class="metin">Aynı kökten iki dal: Türkçe ve Azərbaycan dili. Kelimelerimizin çoğu aynı; bazıları ise birimizde daha güzel. Kartlara dokun; arkalarında senin dilin var.</p>
      </div>
      <div class="kartlar">
        ${KARTLAR.map(
          ([tr, az, not], i) => `
          <button class="kart${i === KARTLAR.length - 1 ? ' genis' : ''}" type="button" aria-label="${tr} — ${az}">
            <span class="kart-ic">
              <span class="kart-yuz on"><small>TR</small><b>${tr}</b><i>dokun</i></span>
              <span class="kart-yuz arka"><small>AZ</small><b>${az}</b><span>${not}</span></span>
            </span>
          </button>`,
        ).join('')}
      </div>
    </div>
  </section>`
}

export function dillerKur() {
  const bolum = $('#diller')
  satirSatir($('.baslik', bolum))
  belir($('.bolum-bas .metin', bolum))
  const kartlar = $$('.kart', bolum)
  belir(kartlar, { stagger: 0.08 })
  kartlar.forEach((k, i) =>
    k.addEventListener('click', () => {
      k.classList.toggle('dondu')
      ses.nota([74, 76, 78, 81, 83, 86, 88][i % 7], 0.035)
    }),
  )
}
