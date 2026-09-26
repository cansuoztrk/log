import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { albumAcik, albumIcerik } from '../cekirdek/album'
import { ortakOku, ortakYaz } from '../cekirdek/ortak'
import { ardayaYaz, type Kim, kimim } from '../cekirdek/posta'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { ek, MESAFE, sayi } from '../cekirdek/zaman'
import { $, belir, gsap, kacir, satirSatir, titret } from './yardimci'

/**
 * ŞEHRİMİ GEZDİREYİM — iki şehir, iki metro hattı. İstanbul hattının duraklarını Arda seçti;
 * Eln istediklerine ♥ koyar. Bakü hattını Eln çizer: Arda'yı götürmek istediği yerleri notuyla ekler.
 * İki hat bir uçuşla birbirine bağlanır. Bakü hattının son durağı şifreli albümdedir (kilit açılınca görünür).
 * Eklenen duraklar ve kalpler "ortak durum" ile iki telefona da gider.
 */
const { ben, sen } = ICERIK
type Sehir = 'ist' | 'bak'

interface Durak {
  id: string
  ad: string
  yer: string
  bilgi: string
  not: string
}
interface Eklenen {
  id: string
  sehir: Sehir
  ad: string
  not: string
  z: number
}

const ISTANBUL: Durak[] = [
  { id: 'havalimani', ad: 'İstanbul Havalimanı', yer: 'Arnavutköy', bilgi: 'Uçağının ineceği yer.', not: 'Kapıdan çıkınca ilk göreceğin şey elimdeki pembe zambaklar olacak. Sonra ben.' },
  { id: 'galata', ad: 'Galata Kulesi', yer: 'Beyoğlu', bilgi: '1348’den beri şehre yukarıdan bakan Ceneviz kulesi.', not: 'Tepesine çıkıp bütün şehri sana göstereceğim. Sonra şehre değil, sana bakacağım.' },
  { id: 'balat', ad: 'Balat', yer: 'Fatih', bilgi: 'Haliç kıyısında, rengârenk evleriyle eski bir semt.', not: 'Renkli evlerin önünde fotoğraf çekeceğiz. Hangi evin önünde duracağımızı sen seçeceksin; pembe olan, biliyorum.' },
  { id: 'pierreloti', ad: 'Pierre Loti', yer: 'Eyüp', bilgi: 'Haliç’e tepeden bakan eski bir kahve; teleferikle çıkılır.', not: 'Teleferikle yukarı çıkıp Haliç’e karşı çay içeceğiz. Bakü’deki füniküleri özletirse söyle.' },
  { id: 'ortakoy', ad: 'Ortaköy', yer: 'Beşiktaş', bilgi: 'Boğaz Köprüsü’nün dibinde küçük bir cami, kumpirciler, dalga sesi.', not: 'Kumpirimizi birlikte seçeceğiz. Arkada köprü, önümüzde Boğaz, yanımda sen.' },
  { id: 'vapur', ad: 'Vapur', yer: 'Beşiktaş → Kadıköy', bilgi: 'Avrupa’dan Asya’ya yirmi dakika.', not: 'Martılara simit atacağız. İki kıtanın arasında, elin elimde. En kısa kıtalararası yolculuğumuz bu olacak.' },
  { id: 'moda', ad: 'Moda Sahili', yer: 'Kadıköy', bilgi: 'Akşamüstü herkesin denize karşı oturduğu kıyı.', not: 'Taşların üstüne oturup denize bakacağız. Hiç konuşmasak da olur; yan yana olmak yeter.' },
  { id: 'kizkulesi', ad: 'Salacak · Kız Kulesi', yer: 'Üsküdar', bilgi: 'Kız Kulesi’nin tam karşısı; güneş tarihî yarımadanın arkasına batar.', not: 'Günü burada bitireceğiz: senin Qız Qalası’nın İstanbul’daki kardeşine karşı, gün batarken. Leandros her gece yüzmek zorundaydı; ben sadece elini tutacağım.' },
]
const BAKU_KAPI: Durak = { id: 'gyd', ad: 'Heydər Əliyev Hava Limanı', yer: 'Bakı', bilgi: 'Senin şehrinin kapısı.', not: 'Bu kez kapıda bekleyen sen olacaksın. Ben de ilk kez senin şehrinin havasını soluyacağım.' }
/** Bakü hattına hızlı ekleme için öneriler (adı doldurur, notu Eln yazar) */
const ONERILER = ['İçərişəhər', 'Dənizkənarı Bulvar', 'Alov Qüllələri', 'Dağüstü Park', 'Heydər Əliyev Mərkəzi', 'Nizami küçəsi']
const EN_FAZLA = 8

export function geziHTML() {
  return /* html */ `
  <section id="gezi" class="bolum" data-bolum="" data-ad="Şehrimi Gezdireyim">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Şehrimi gezdireyim</p>
        <h2 class="baslik">İki şehir, iki hat. <em>Son durak hep sen.</em></h2>
        <p class="metin">Sana İstanbul’u gezdireceğim, sen de bana Bakü’yü. İstanbul hattının duraklarını ben seçtim; görmek istediklerine ♥ koy. Bakü hattını sen çiz: beni götürmek istediğin yerleri ekle, her birine bir not yaz. Eklediğin her durak bana gelir.</p>
      </div>
      <div class="tur" data-dom>
        <div class="tur-hat ist">
          <header class="tur-bas"><span class="tur-rozet">M1</span><div><b>İstanbul</b><small>${sen.ad} Hattı · seni gezdireceğim yerler</small></div></header>
          <ol class="tur-duraklar" data-sehir="ist"></ol>
        </div>
        <div class="tur-ucus" aria-label="İstanbul ile Bakü arası uçuş">
          <span class="tur-ucak" aria-hidden="true">✈</span>
          <p><b>${sayi(MESAFE)} km</b> · yaklaşık 3 saat<small>aktarma: gökyüzü</small></p>
        </div>
        <div class="tur-hat bak">
          <header class="tur-bas"><span class="tur-rozet">M2</span><div><b>Bakı</b><small>${ben.ad} Hattı · beni gezdireceğin yerler</small></div></header>
          <ol class="tur-duraklar" data-sehir="bak"></ol>
        </div>
        <p class="tur-bilet" aria-live="polite"></p>
      </div>
    </div>
  </section>`
}

export function geziKur() {
  const bolum = $('#gezi')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('.tur', bolum)])
  const benKim = kimim()
  const karsiKim: Kim = benKim === 'eln' ? 'arda' : 'eln'
  const adi = (k: Kim) => (k === 'eln' ? sen.ad : ben.ad)
  const listeler = { ist: $('.tur-duraklar[data-sehir="ist"]', bolum), bak: $('.tur-duraklar[data-sehir="bak"]', bolum) }
  const bilet = $('.tur-bilet', bolum)
  let acik: string | null = null
  let ekleAcik: Sehir | null = null
  let kalpHaber = 0

  const eklenenler = (k: Kim) => ortakOku<Eklenen[]>(`gezi:${k}`, [])
  const kalpler = (k: Kim) => new Set(ortakOku<string[]>(`gezi-kalp:${k}`, []))
  /** bir şehrin hattı: sabit duraklar + ikimizin ekledikleri (eklenme sırasıyla) */
  const hat = (sehir: Sehir) => {
    const ek_ = [...eklenenler('eln'), ...eklenenler('arda')]
      .filter((e) => e.sehir === sehir)
      .sort((a, b) => a.z - b.z)
    const eklenen = ek_.map((e) => ({ tur: 'eklenen' as const, e, yazan: eklenenler('eln').some((x) => x.id === e.id) ? ('eln' as Kim) : ('arda' as Kim) }))
    if (sehir === 'ist') return [...ISTANBUL.map((d) => ({ tur: 'sabit' as const, d })), ...eklenen]
    return [{ tur: 'sabit' as const, d: BAKU_KAPI }, ...eklenen]
  }

  const kalpDugmesi = (id: string) => {
    const benimKalp = kalpler(benKim).has(id)
    const onunKalp = kalpler(karsiKim).has(id)
    return `${onunKalp ? `<p class="tur-onun">♥ ${adi(karsiKim)} burayı çok istiyor</p>` : ''}<button type="button" class="tur-istiyorum" data-kalp="${id}" aria-pressed="${benimKalp}">${benimKalp ? '♥ İstiyorum' : '♡ Bunu istiyorum'}</button>`
  }

  const sonDurak = () => {
    const son = albumIcerik()?.gezi?.son
    if (!albumAcik() || !son)
      return /* html */ `
      <li class="tur-durak son kilitli">
        <button type="button" class="tur-dugme" data-id="son" aria-expanded="${acik === 'son'}"><i class="tur-nokta" aria-hidden="true">🔒</i><span class="tur-ad">Son durak</span><small>kilitli</small></button>
        ${acik === 'son' ? `<div class="tur-detay"><p class="tur-bilgi">Bu durak kilitli sayfalarla birlikte açılır. Kelimemizi bir kez yazman yeter.</p><a class="dugme hayalet" href="#mesajlar">Kilide git</a></div>` : ''}
      </li>`
    return /* html */ `
      <li class="tur-durak son">
        <button type="button" class="tur-dugme" data-id="son" aria-expanded="${acik === 'son'}"><i class="tur-nokta" aria-hidden="true">⌂</i><span class="tur-ad">${kacir(son.ad)}</span><small>${kacir(son.alt)}</small></button>
        ${
          acik === 'son'
            ? `<div class="tur-detay"><p class="tur-not el">${kacir(son.not)}</p><ul class="tur-yakin">${son.yakin.map(([a, b]) => `<li><b>${kacir(a)}</b><span>${kacir(b)}</span></li>`).join('')}</ul></div>`
            : ''
        }
      </li>`
  }

  const ciz = (sehir: Sehir) => {
    const ol = listeler[sehir]
    const benimSehrim = (benKim === 'arda') === (sehir === 'ist')
    const html = hat(sehir).map((x) => {
      if (x.tur === 'sabit') {
        const d = x.d
        const kalpli = kalpler('eln').has(d.id) || kalpler('arda').has(d.id)
        return /* html */ `
        <li class="tur-durak${kalpli ? ' kalpli' : ''}">
          <button type="button" class="tur-dugme" data-id="${d.id}" aria-expanded="${acik === d.id}"><i class="tur-nokta" aria-hidden="true"></i><span class="tur-ad">${d.ad}</span><small>${d.yer}</small>${kalpli ? '<em class="tur-kalp" aria-label="istendi">♥</em>' : ''}</button>
          ${acik === d.id ? `<div class="tur-detay"><p class="tur-bilgi">${d.bilgi}</p><p class="tur-not el">${d.not}</p>${d.id === 'havalimani' || d.id === 'gyd' ? '' : kalpDugmesi(d.id)}</div>` : ''}
        </li>`
      }
      const e = x.e
      const kalpli = kalpler(x.yazan === 'eln' ? 'arda' : 'eln').has(e.id)
      return /* html */ `
        <li class="tur-durak eklenen${kalpli ? ' kalpli' : ''}">
          <button type="button" class="tur-dugme" data-id="${e.id}" aria-expanded="${acik === e.id}"><i class="tur-nokta" aria-hidden="true"></i><span class="tur-ad">${kacir(e.ad)}</span><small>${x.yazan === benKim ? 'senin durağın' : `${ek(adi(x.yazan), 'ilgi')} durağı`}</small>${kalpli ? '<em class="tur-kalp" aria-label="istendi">♥</em>' : ''}</button>
          ${
            acik === e.id
              ? `<div class="tur-detay">${e.not ? `<p class="tur-not el">“${kacir(e.not)}”</p>` : ''}<p class="tur-imza">— ${x.yazan === benKim ? 'sen' : adi(x.yazan)}</p>${
                  x.yazan === benKim
                    ? `${kalpler(karsiKim).has(e.id) ? `<p class="tur-onun">♥ ${adi(karsiKim)} burayı çok istiyor</p>` : ''}<button type="button" class="tur-kaldir" data-kaldir="${e.id}">Durağı kaldır</button>`
                    : kalpDugmesi(e.id)
                }</div>`
              : ''
          }
        </li>`
    })
    const benimEkledigim = eklenenler(benKim).filter((e) => e.sehir === sehir).length
    const ekle =
      benimEkledigim >= EN_FAZLA
        ? ''
        : ekleAcik === sehir
          ? /* html */ `
        <li class="tur-ekle acik">
          <form class="tur-form">
            <input name="ad" maxlength="40" required placeholder="${sehir === 'bak' ? 'Durağın adı (ör. Bulvar)' : 'Görmek istediğin yer'}" autocomplete="off" />
            ${sehir === 'bak' && benKim === 'eln' ? `<div class="tur-oneriler">${ONERILER.map((o) => `<button type="button" data-oneri="${o}">${o}</button>`).join('')}</div>` : ''}
            <textarea name="not" maxlength="140" rows="2" placeholder="${sehir === 'bak' ? 'Orada bana ne göstereceksin?' : 'Neden orası?'}"></textarea>
            <div class="tur-form-alt"><button class="dugme" type="submit">Durağı ekle</button><button class="dugme hayalet tur-vazgec" type="button">Vazgeç</button></div>
          </form>
        </li>`
          : `<li class="tur-ekle"><button type="button" class="tur-ekle-dugme" data-ekle="${sehir}">+ ${benimSehrim ? 'Hattıma durak ekle' : sehir === 'ist' ? 'İstek durağı ekle' : 'Görmek istediğim bir yer'}</button></li>`
    ol.innerHTML = html.join('') + ekle + (sehir === 'bak' ? sonDurak() : '')
  }

  const biletYaz = () => {
    const k = kalpler(benKim).size
    const e = eklenenler(benKim).length
    const hepsi = eklenenler('eln').length + eklenenler('arda').length + ISTANBUL.length + 1
    bilet.innerHTML = `<span>🎫 Gidiş–dönüş · İstanbul ⇄ Bakı</span><span>${hepsi} durak · senin ♥: ${k} · senin eklediğin: ${e}</span>`
  }
  const hepsiniCiz = () => {
    ciz('ist')
    ciz('bak')
    biletYaz()
  }

  const kalpHaberiVer = () => {
    if (benKim !== 'eln') return
    window.clearTimeout(kalpHaber)
    kalpHaber = window.setTimeout(() => {
      const secilen = ISTANBUL.filter((d) => kalpler('eln').has(d.id)).map((d) => d.ad)
      if (secilen.length) void ardayaYaz(`${sen.ad} İstanbul’da görmek istediklerini seçti ♥`, secilen.join(', '), ['world_map'])
    }, 60_000)
  }

  bolum.addEventListener('click', (ev) => {
    const t = ev.target as Element
    const oneri = t.closest<HTMLButtonElement>('[data-oneri]')
    if (oneri) {
      const input = oneri.closest('form')!.querySelector<HTMLInputElement>('input[name="ad"]')!
      input.value = oneri.dataset.oneri!
      oneri.closest('form')!.querySelector<HTMLTextAreaElement>('textarea')!.focus()
      return
    }
    const kalp = t.closest<HTMLButtonElement>('[data-kalp]')
    if (kalp) {
      const id = kalp.dataset.kalp!
      const set = kalpler(benKim)
      const vardi = set.has(id)
      if (vardi) set.delete(id)
      else set.add(id)
      ortakYaz(`gezi-kalp:${benKim}`, [...set])
      ses.kalp(vardi ? 0.4 : 0.8)
      titret(vardi ? 8 : [15, 40, 15])
      if (!vardi) kalpHaberiVer()
      return
    }
    const kaldir = t.closest<HTMLButtonElement>('[data-kaldir]')
    if (kaldir) {
      ortakYaz(
        `gezi:${benKim}`,
        eklenenler(benKim).filter((e) => e.id !== kaldir.dataset.kaldir),
      )
      acik = null
      return
    }
    const ekleDugme = t.closest<HTMLButtonElement>('[data-ekle]')
    if (ekleDugme) {
      ekleAcik = ekleDugme.dataset.ekle as Sehir
      hepsiniCiz()
      bolum.querySelector<HTMLInputElement>('.tur-form input')?.focus()
      return
    }
    if (t.closest('.tur-vazgec')) {
      ekleAcik = null
      hepsiniCiz()
      return
    }
    const d = t.closest<HTMLButtonElement>('.tur-dugme')
    if (d) {
      acik = acik === d.dataset.id ? null : d.dataset.id!
      ses.tik()
      hepsiniCiz()
      const detay = bolum.querySelector('.tur-detay')
      if (detay) gsap.from(detay, { autoAlpha: 0, y: -6, duration: 0.45, ease: 'power2.out' })
    }
  })

  bolum.addEventListener('submit', (ev) => {
    ev.preventDefault()
    const f = ev.target as HTMLFormElement
    const ad = (f.elements.namedItem('ad') as HTMLInputElement).value.trim().slice(0, 40)
    const not = (f.elements.namedItem('not') as HTMLTextAreaElement).value.trim().slice(0, 140)
    if (!ad || !ekleAcik) return
    const sehir = ekleAcik
    const yeni: Eklenen = { id: `${benKim[0]}${Date.now().toString(36)}`, sehir, ad, not, z: Date.now() }
    ekleAcik = null
    acik = yeni.id
    ortakYaz(`gezi:${benKim}`, [...eklenenler(benKim), yeni])
    ses.cin()
    titret([20, 50, 20])
    window.dispatchEvent(new CustomEvent('kutla', { detail: 16 }))
    if (benKim === 'eln')
      void ardayaYaz(
        sehir === 'bak' ? `${sen.ad} Bakü’de sana göstereceği bir yer ekledi 🗺️` : `${sen.ad} İstanbul’da görmek istediği bir yer ekledi 🗺️`,
        `${ad}${not ? `: “${not}”` : ''}`,
        ['world_map'],
      )
    const bakuSayisi = eklenenler(benKim).filter((e) => e.sehir === 'bak').length
    if (benKim === 'eln' && bakuSayisi >= 3) window.setTimeout(() => sirBul('gezi'), 1500)
  })

  // ortak durum değişince (öbür telefondan durak ya da kalp gelince, ya da kendi yazdığımız) yeniden çiz
  window.addEventListener('ortak-degisti', (e) => {
    if ((e as CustomEvent<string[]>).detail.some((k) => k.startsWith('gezi'))) hepsiniCiz()
  })
  window.addEventListener('album-acildi', hepsiniCiz)
  hepsiniCiz()
  // ilk kez gelince havalimanı durağı açık dursun: nasıl kullanılacağı belli olsun
  if (!oku('geziGoruldu', false)) {
    yaz('geziGoruldu', true)
    acik = 'havalimani'
    hepsiniCiz()
  }
}

/** Bugün kartı için: Bakü hattında Eln'in hiç durağı yoksa */
export function geziBekliyor() {
  return kimim() === 'eln' && !ortakOku<Eklenen[]>('gezi:eln', []).some((e) => e.sehir === 'bak')
}
