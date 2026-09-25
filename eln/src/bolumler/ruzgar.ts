import { ICERIK } from '../icerik'
import { NOTLAR, OZEL_NOTLAR, SORULAR } from '../notlar'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { elneYaz, type Gelen, kimim, ulastir } from '../cekirdek/posta'
import { type Anlik, MESAFE, gunFarki, isoGun, sayi, tarihYazi, yerel } from '../cekirdek/zaman'
import { $, belir, gsap, ikon, kacir, satirSatir, titret } from './yardimci'

const { ben, sen, tanisma, sevgili, dogumGunu } = ICERIK

export interface GununNotu {
  tarih: string
  metin: string
  baslik: string
  ozel: boolean
}

/** Onun bana taktığı adlardan biri (her açılışta başka), büyük harfle: "Posi" */
export function banaHitap() {
  const h = ICERIK.banaHitaplari
  if (!h.length) return ben.ad
  const s = h[Math.floor(Math.random() * h.length)]
  return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1)
}

/** Ona seslendiğim adlardan biri (gün boyunca aynı kalır, her gün başka) */
export function hitap(tohum = 0) {
  const h = ICERIK.hitaplar
  if (!h.length) return sen.ad
  const g = Math.floor(Date.now() / 86_400_000) + tohum
  return h[((g % h.length) + h.length) % h.length]
}
const buyukHarf = (s: string) => s.replace(/^(\s*)(\S)/, (_, a: string, b: string) => a + b.toLocaleUpperCase('tr-TR'))
const doldur = (s: string, n: number, yas = 0) =>
  buyukHarf(
    s
      .replaceAll('{yas} yaşın', yas > 0 ? `${yas} yaşın` : 'Yeni yaşın')
      .replaceAll('{n}', String(n))
      .replaceAll('{ad}', sen.ad)
      .replaceAll('{tamAd}', sen.tamAd ?? sen.ad)
      .replaceAll('{hitap}', hitap()),
  )

/** Bugünün notu: özel günlerde özel not, diğer günlerde sıradaki not. */
export function gununNotu(z: Anlik): GununNotu {
  const [y, m, d] = z.bugun.split('-').map(Number)
  const ag = z.bugun.slice(5)
  const ayFarki = (iso: string) => (y - +iso.slice(0, 4)) * 12 + (m - +iso.slice(5, 7))
  const yilFarki = (iso: string) => y - +iso.slice(0, 4)
  const ozel = (anahtar: keyof typeof OZEL_NOTLAR, baslik: string, n = 0): GununNotu => ({
    tarih: z.bugun,
    metin: doldur(OZEL_NOTLAR[anahtar], n),
    baslik,
    ozel: true,
  })
  if (dogumGunu.sen && ag === dogumGunu.sen)
    return { ...ozel('dogumGunuSen', 'İyi ki doğdun'), metin: doldur(OZEL_NOTLAR.dogumGunuSen, 0, ICERIK.dogumYili ? y - ICERIK.dogumYili : 0) }
  if (dogumGunu.ben && ag === dogumGunu.ben) return ozel('dogumGunuBen', 'Benim doğum günüm')
  if (ag === sevgili.slice(5) && yilFarki(sevgili) > 0) return ozel('yildonumuSevgili', `${yilFarki(sevgili)}. yılımız`, yilFarki(sevgili))
  if (ag === tanisma.slice(5) && yilFarki(tanisma) > 0) return ozel('yildonumuTanisma', 'Tanışma yıl dönümü', yilFarki(tanisma))
  if (ag === '02-14') return ozel('sevgililerGunu', 'Sevgililer Günü')
  if (ag === '03-08') return ozel('kadinlarGunu', '8 Mart')
  if (ag === '03-20' || ag === '03-21') return ozel('novruz', 'Novruz Bayramı')
  if (ag === '01-01') return ozel('yeniYil', 'Yeni yıl')
  if (d === +sevgili.slice(8) && z.bugun > sevgili) return ozel('ayin21i', `${ayFarki(sevgili)}. ayımız`, ayFarki(sevgili))
  if (d === +tanisma.slice(8) && z.bugun > tanisma) return ozel('ayin6si', `Tanışmamızın ${ayFarki(tanisma)}. ayı`, ayFarki(tanisma))
  const i = (Math.max(0, gunFarki(tanisma, z.bugun)) * 37 + 11) % NOTLAR.length
  return { tarih: z.bugun, metin: doldur(NOTLAR[i], 0), baslik: `Not №${i + 1}`, ozel: false }
}

/** Günün sorusu (her gün başka; "başka soru" ile sıradakine geçilir) */
export function gununSorusu(z: Anlik, kaydir = 0) {
  const i = (((Math.max(0, gunFarki(tanisma, z.bugun)) * 23 + 5 + kaydir) % SORULAR.length) + SORULAR.length) % SORULAR.length
  return SORULAR[i]
}

interface Cevap {
  tarih: string
  soru: string
  cevap: string
}

export type NotArsivi = Record<string, { metin: string; baslik: string }>

export function notKaydet(n: GununNotu) {
  const arsiv = oku<NotArsivi>('notlar', {})
  arsiv[n.tarih] = { metin: n.metin, baslik: n.baslik }
  yaz('notlar', arsiv)
  return arsiv
}

export function ruzgarHTML(z: Anlik, not: GununNotu) {
  return /* html */ `
  <section id="ruzgar" class="bolum" data-bolum="IX" data-ad="Rüzgâr Postası">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no">IX</span>Rüzgâr postası</p>
        <h2 class="baslik">Rüzgârlar şehrine <em>her gün bir not</em>.</h2>
        <p class="metin">${sen.sehir}’ye rüzgârlar şehri derler; Xəzri kuzeyden, Gilavar güneyden eser. Ben de rüzgâra her gün sana bir not bıraktım. Her gün yenisi gelir; uğradığın günlerin notları senin koleksiyonuna eklenir.</p>
      </div>
      <div class="posta-izgara">
        <div class="zarf-sahne" data-dom>
          <button class="zarf" type="button" aria-label="Bugünün notunu aç">
            <span class="zarf-arka"></span>
            <span class="mektupcuk">
              <small>Gün ${sayi(z.gunNo)} · ${tarihYazi(z.bugun, true)}</small>
              <em class="not-baslik">${not.ozel ? '✦ ' : ''}${not.baslik}</em>
              <span class="not-metin">${not.metin}</span>
              <span class="not-imza">— ${ben.ad[0]}.</span>
            </span>
            <span class="zarf-on"></span>
            <span class="zarf-kapak"></span>
            <span class="muhur">${sen.ad[0]}·${ben.ad[0]}</span>
          </button>
          <p class="zarf-ipucu">zarfı aç</p>
          <button class="dugme hayalet notlar-ac" type="button">${ikon('zarf')}<span>Topladığın notlar · <b class="not-sayisi">0</b></span></button>
        </div>

        <div class="ruzgara cam" data-dom>
          <p class="etiket">${kimim() === 'arda' ? `${sen.ad}’e rüzgârla bir not bırak` : 'Sen de rüzgâra bir şey bırak'}</p>
          <div class="soru"${kimim() === 'arda' ? ' hidden' : ''}>
            <p class="soru-ust"><span>Günün sorusu</span>
              <button class="soru-degis" type="button" aria-label="Başka bir soru">↻</button>
              <button class="soru-kaldir" type="button" aria-label="Soruyu kaldır, serbest yaz">×</button>
            </p>
            <p class="soru-metin">${gununSorusu(z)}</p>
          </div>
          <label class="gorunmez" for="ruzgar-metin">Mesajın</label>
          <div class="yazi-alani">
            <textarea id="ruzgar-metin" rows="4" maxlength="600" placeholder="${kimim() === 'arda' ? `Siteyi bir sonraki açışında onu bekliyor olacak…` : 'Cevabın… ya da aklından geçen başka bir şey.'}"></textarea>
            <canvas class="ruzgar-tuval" aria-hidden="true"></canvas>
          </div>
          <div class="ruzgar-alt">
            <button class="dugme ruzgar-gonder" type="button">${ikon('ruzgar')}<span>Rüzgâra bırak</span></button>
            <span class="dipnot">${kimim() === 'arda' ? `${sen.sehir} yönüne, doğuya doğru.` : `${ben.sehir} yönüne, batıya doğru.`}</span>
          </div>
          <p class="ruzgar-durum dipnot" aria-live="polite"></p>
        </div>
      </div>
    </div>
  </section>`
}

/** Yazıyı parçacıklara çevirip batıya (sola) uçurur */
function ucur(alan: HTMLTextAreaElement, tuval: HTMLCanvasElement, yon = -1) {
  return new Promise<void>((bitti) => {
    const r = alan.getBoundingClientRect()
    const px = Math.min(2, window.devicePixelRatio || 1)
    tuval.width = r.width * px
    tuval.height = r.height * px
    const x = tuval.getContext('2d')!
    x.setTransform(px, 0, 0, px, 0, 0)
    const stil = getComputedStyle(alan)
    x.font = `${stil.fontWeight} ${stil.fontSize} ${stil.fontFamily}`
    x.fillStyle = '#f7ede0'
    x.textBaseline = 'top'
    const sol = parseFloat(stil.paddingLeft)
    const ust = parseFloat(stil.paddingTop)
    const satirY = parseFloat(stil.lineHeight) || parseFloat(stil.fontSize) * 1.4
    const genislik = r.width - sol * 2
    let y = ust - alan.scrollTop
    for (const paragraf of alan.value.split('\n')) {
      let satir = ''
      for (const kelime of paragraf.split(' ')) {
        const dene = satir ? satir + ' ' + kelime : kelime
        if (x.measureText(dene).width > genislik && satir) {
          x.fillText(satir, sol, y)
          y += satirY
          satir = kelime
        } else satir = dene
      }
      x.fillText(satir, sol, y)
      y += satirY
    }
    const veri = x.getImageData(0, 0, tuval.width, tuval.height).data
    const parcalar: { x: number; y: number; vx: number; vy: number; o: number; g: number }[] = []
    const adim = Math.round(2 * px)
    for (let yy = 0; yy < tuval.height; yy += adim)
      for (let xx = 0; xx < tuval.width; xx += adim)
        if (veri[(yy * tuval.width + xx) * 4 + 3] > 110)
          parcalar.push({ x: xx / px, y: yy / px, vx: 0, vy: 0, o: 1, g: (xx / tuval.width) * 0.6 + Math.random() * 0.4 })
    alan.classList.add('ucuyor')
    const bas = performance.now()
    const kare = (t: number) => {
      const s = (t - bas) / 1000
      x.clearRect(0, 0, r.width, r.height)
      for (const p of parcalar) {
        if (s < p.g * 0.5) {
          x.fillStyle = 'rgba(247,237,224,0.9)'
          x.fillRect(p.x, p.y, 1.4, 1.4)
          continue
        }
        p.vx += yon * (0.35 + Math.random() * 0.25)
        p.vy += (Math.random() - 0.62) * 0.35
        p.x += p.vx
        p.y += p.vy
        p.o *= 0.975
        x.fillStyle = `rgba(255,${200 + Math.round(p.g * 40)},${170 + Math.round(p.g * 30)},${p.o})`
        x.fillRect(p.x, p.y, 1.6, 1.6)
      }
      if (s < 2.2) requestAnimationFrame(kare)
      else {
        x.clearRect(0, 0, r.width, r.height)
        alan.value = ''
        alan.classList.remove('ucuyor')
        bitti()
      }
    }
    requestAnimationFrame(kare)
  })
}

export function ruzgarKur(z: Anlik, not: GununNotu, notlarAc: () => void) {
  const bolum = $('#ruzgar')
  satirSatir($('.baslik', bolum))
  belir($('.bolum-bas .metin', bolum))
  belir([$('.zarf-sahne', bolum), $('.ruzgara', bolum)])

  const arsiv = notKaydet(not)
  $('.not-sayisi', bolum).textContent = String(Object.keys(arsiv).length)

  // Zarf
  const zarf = $('.zarf', bolum)
  const mektupcuk = $('.mektupcuk', bolum)
  const onde = { yPercent: -14, scale: 1.04, zIndex: 6 }
  if (oku<string>('zarf', '') === not.tarih) {
    zarf.classList.add('acik', 'hazir')
    gsap.set(mektupcuk, onde)
  }
  zarf.addEventListener('click', () => {
    if (zarf.classList.contains('acik')) return
    zarf.classList.add('acik')
    yaz('zarf', not.tarih)
    ses.vuus(1.1)
    titret(15)
    // mektup zarftan çıkar, öne geçer ve okunur hâle gelir
    gsap
      .timeline()
      .to(mektupcuk, { yPercent: -80, duration: 0.95, ease: 'power2.inOut', delay: 0.45 })
      .add(() => {
        zarf.classList.add('hazir')
        ses.nota(81, 0.04)
      })
      .set(mektupcuk, { zIndex: 6 })
      .to(mektupcuk, { yPercent: onde.yPercent, scale: onde.scale, duration: 1, ease: 'expo.out' })
  })
  $('.notlar-ac', bolum).addEventListener('click', notlarAc)

  // Rüzgâra bırak
  const alan = $<HTMLTextAreaElement>('#ruzgar-metin', bolum)
  const tuval = $<HTMLCanvasElement>('.ruzgar-tuval', bolum)
  const dugme = $<HTMLButtonElement>('.ruzgar-gonder', bolum)
  const durum = $('.ruzgar-durum', bolum)

  // Günün sorusu: ↻ sıradakine geçer, × kaldırır (serbest yazı)
  const soruKutu = $('.soru', bolum)
  const soruMetin = $('.soru-metin', bolum)
  let kaydir = 0
  let soruVar = kimim() !== 'arda' // günün sorusu Eln'e; Arda'nın ekranında gizli
  const soruDegis = () => {
    kaydir++
    gsap
      .timeline()
      .to(soruMetin, { autoAlpha: 0, y: -8, duration: 0.2 })
      .add(() => (soruMetin.textContent = gununSorusu(z, kaydir)))
      .fromTo(soruMetin, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35 })
  }
  $('.soru-degis', bolum).addEventListener('click', () => {
    ses.tik()
    soruDegis()
  })
  $('.soru-kaldir', bolum).addEventListener('click', () => {
    soruVar = false
    ses.tik()
    gsap.to(soruKutu, { autoAlpha: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, duration: 0.4, ease: 'power2.inOut', onComplete: () => (soruKutu.hidden = true) })
    alan.placeholder = `Rüzgâra bir şey söyle… ${banaHitap()} bekliyor.`
    alan.focus()
  })

  dugme.addEventListener('click', async () => {
    const metin = alan.value.trim()
    dugme.disabled = true
    ses.vuus(2)
    titret([10, 40, 10])
    if (!metin) {
      gsap.fromTo(zarf, { rotate: 0 }, { rotate: -4, yoyo: true, repeat: 3, duration: 0.08 })
      durum.textContent = 'Boş bir zarf rüzgâra karıştı…'
      window.setTimeout(() => sirBul('bos'), 900)
      dugme.disabled = false
      return
    }
    const soru = soruVar ? soruMetin.textContent ?? '' : ''
    // Arda'nın cihazında rüzgâr ters yönde (doğuya) eser: not Eln'in sitesinde onu bekler
    if (kimim() === 'arda') {
      await ucur(alan, tuval, 1)
      const gitti = await elneYaz(metin, soru)
      if (gitti) window.dispatchEvent(new Event('not-gonderildi'))
      durum.innerHTML = gitti
        ? `Rüzgâr ${sen.sehir}’ye doğru yola çıktı. ${sen.ad} 12 saat içinde siteyi açarsa notu bulur; <b>okuyunca telefonuna “okundu ✓” düşer.</b>`
        : 'Rüzgâr çıkamadı (bağlantı yok gibi). Biraz sonra yine dene.'
      if (gitti && soru) window.setTimeout(soruDegis, 1800)
      dugme.disabled = false
      return
    }
    await ucur(alan, tuval)
    const sonuc = soru
      ? await ulastir(`${sen.ad} · günün sorusu`, `❝${soru}❞\n\n${metin}`, ['love_letter', 'question'])
      : await ulastir(`${sen.ad} · rüzgâr postası`, metin, ['love_letter', 'wind_face'])
    if (soru) {
      const cevaplar = oku<Cevap[]>('cevaplar', [])
      cevaplar.push({ tarih: z.bugun, soru, cevap: metin })
      yaz('cevaplar', cevaplar)
      // cevaplanan soru gider, sıradaki gelir (istersen onu da cevaplarsın)
      window.setTimeout(soruDegis, 1800)
    }
    const saat = Math.round(MESAFE / 40)
    durum.innerHTML =
      sonuc === 'ntfy'
        ? `Rüzgâr yola çıktı. Saatte 40 km esseydi bana ${saat} saatte varırdı; neyse ki kısa yoldan gitti. <b>Telefonuma çoktan düştü.</b>`
        : sonuc === 'wa' || sonuc === 'paylas'
          ? `Rüzgâr yola çıktı… Son kilometresi senin elinde: açılan pencereden <b>bana gönder</b>.`
          : sonuc === 'kopya'
            ? `Rüzgâr yazdıklarını panoya bıraktı. <b>Bana yapıştırman yeter.</b>`
            : `Rüzgâr yola çıktı. Saatte 40 km hızla, ${saat} saat sonra ${ben.sehir}’da.`
    dugme.disabled = false
    const sade = metin.toLocaleLowerCase('tr-TR').replace(/ə/g, 'e').replace(/\s+/g, ' ')
    if (/seni sev(iyorum|irem)/.test(sade)) window.setTimeout(() => sirBul('sevirem'), 1400)
    if (/\bbok/.test(sade)) window.setTimeout(() => sirBul('bok'), 2600)
    if (/opt[uü]m/.test(sade.replace(/ö/g, 'o'))) window.setTimeout(() => sirBul('optum'), 3800)
    if (ICERIK.banaHitaplari.some((h) => sade.includes(h.toLocaleLowerCase('tr-TR')))) window.setTimeout(() => sirBul('posi'), 5000)
  })
}

export function notlarCekmeceHTML() {
  const arsiv = oku<NotArsivi>('notlar', {})
  const gunler = Object.keys(arsiv).sort().reverse()
  const cevaplar = oku<Cevap[]>('cevaplar', []).slice().reverse()
  const gelenler = oku<Gelen[]>('gelenler', []).slice().reverse()
  return /* html */ `
    <div class="cekmece-bas"><h3>Topladığın notlar</h3><button class="ikon-dugme kapat" type="button" aria-label="Kapat">${ikon('kapat')}</button></div>
    <div class="cekmece-govde notlar-liste" data-lenis-prevent>
      ${
        gelenler.length
          ? `<h4 class="arsiv-ara ilk">${ben.ad}’dan gelenler · ${gelenler.length}</h4>
      ${gelenler
        .map(
          (g) =>
            `<button class="arsiv-not arsiv-gelen${g.okundu ? '' : ' yeni'}" type="button" data-gelen="${g.id}"><small>${tarihYazi(isoGun(yerel(new Date(g.zaman), sen.saatDilimi)), true)}${g.okundu ? '' : ' · yeni'}</small><p>${kacir(g.metin.length > 90 ? g.metin.slice(0, 90) + '…' : g.metin)}</p></button>`,
        )
        .join('')}
      <h4 class="arsiv-ara">Günün notları</h4>`
          : ''
      }
      <p class="dipnot">Uğradığın her gün, o günün notu buraya eklenir. Şu ana kadar <b>${gunler.length}</b> not.</p>
      ${gunler
        .map(
          (g) => `<article class="arsiv-not"><small>${tarihYazi(g, true)} · ${arsiv[g].baslik}</small><p>${arsiv[g].metin}</p></article>`,
        )
        .join('')}
      ${
        cevaplar.length
          ? `<h4 class="arsiv-ara">Cevapladığın sorular · ${cevaplar.length}</h4>
      ${cevaplar
        .map((c) => `<article class="arsiv-not cevap"><small>${tarihYazi(c.tarih, true)}</small><em>${kacir(c.soru)}</em><p>${kacir(c.cevap)}</p></article>`)
        .join('')}`
          : ''
      }
    </div>`
}
