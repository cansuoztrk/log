import { ICERIK } from '../icerik'
import { oku, type Ziyaret } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { albumIcerik } from '../cekirdek/album'
import { YT_DURUM, type YTOynatici, ytYukle } from '../cekirdek/youtube'
import { MESAFE, anlik, sayi, tarihYazi } from '../cekirdek/zaman'
import { azHareket, gsap, ikon, kacir } from '../bolumler/yardimci'

/**
 * JENERİK — sitenin en sonunda, bir filmin bitişi gibi: üstte şarkının resmî klibi çalar,
 * altından isimler kayar; en sonda "jenerik sonrası sahne". Şarkı YouTube'dan çalar (dosya barındırılmaz).
 */
const { ben, sen, arkadas, jenerik, sarki } = ICERIK

type Satir = [string, string] | { baslik: string } | { not: string }

function satirlar(): Satir[] {
  const z = anlik()
  const ziyaret = oku<Ziyaret>('ziyaret', { gunler: [], toplam: 0, ilk: null })
  const adlar = (ICERIK.banaHitaplari ?? []).join(', ')
  const s: Satir[] = [
    { baslik: 'Başrolde' },
    [sen.ad === 'Eln' ? 'Elnare' : sen.ad, '“Elnos” rolünde, kendisi'],
    [ben.ad, adlar ? `${adlar} rollerinde` : 'kendisi'],
    { baslik: '' },
    ['Yönetmen', ben.ad],
    ['Senaryo', `${sen.ad} & ${ben.ad} (hâlâ yazılıyor)`],
    ['Fikir', `${arkadas}’in bir tuşa basması`],
    ['İlk çekim günü', tarihYazi(ICERIK.tanisma)],
    ['“Biz” sahnesi', `${tarihYazi(ICERIK.sevgili)}, ${ICERIK.sevgiliSaat}`],
    { baslik: '' },
    ['Çekim yerleri', 'İstanbul · Bakü · bir Instagram grubu · gece yarısı sesli aramalar'],
    ['Aradaki mesafe', `${sayi(MESAFE)} km`],
    ['Çekim süresi', `${sayi(z.gunNo)} gün (devam ediyor)`],
    ['Seyirci', `${sen.ad}, ${sayi(ziyaret.gunler.length || 1)} gün boyunca`],
    { baslik: '' },
    ['Işık', 'Bakü’de önce doğan güneş'],
    ['Ses', `${sen.ad}’in kahkahası`],
    ['Ses kurgusu', '“öptüm”'],
    ['Görüntü yönetmeni', 'ön kamera'],
    ['Kostüm', 'pembe'],
    ['Çiçekler', 'zambak, her ay bir tane'],
    ['Özel efektler', '☺️'],
    ['İkram', 'çay, iki bardak'],
    ['Dil danışmanı', 'Azerbaycanca (Arda hâlâ öğreniyor)'],
    ['Kelime danışmanı', 'bokkuş (anlamı gizli)'],
  ]
  // kilit açıksa: yalnızca ikimizin bildiği satırlar (şifreli albümden)
  const ek = albumIcerik()?.jenerik
  if (ek?.length) s.push({ baslik: '' }, ...ek)
  s.push(
    { baslik: 'Müzik' },
    [`“${sarki.baslik}”`, sarki.sanatci],
    [`“${jenerik.baslik}”`, jenerik.sanatci],
    { baslik: 'Özel teşekkürler' },
    [arkadas, 'her şeyi başlattığı için'],
    ['İnternet', `${sayi(MESAFE)} km’yi bir “alo”ya indirdiği için`],
    [sen.ad, 'her şey için'],
    { not: 'Bu filmdeki bütün olaylar ve kişiler gerçektir. Benzerlik tesadüf değildir.' },
    { not: 'Çekimler sırasında hiçbir kalp zarar görmedi. Sadece biraz özlem çekildi.' },
  )
  return s
}

const satirHTML = (x: Satir) =>
  'baslik' in x
    ? x.baslik
      ? `<h3 class="jn-baslik">${kacir(x.baslik)}</h3>`
      : '<span class="jn-bosluk"></span>'
    : 'not' in x
      ? `<p class="jn-not">${kacir(x.not)}</p>`
      : `<p class="jn-satir"><span>${kacir(x[0])}</span><b>${kacir(x[1])}</b></p>`

let acik = false

export function jenerikAc() {
  if (acik) return
  acik = true
  const el = document.createElement('section')
  el.className = 'jenerik'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-label', 'Jenerik')
  el.setAttribute('data-lenis-prevent', '')
  el.innerHTML = /* html */ `
    <button class="ikon-dugme jn-kapat" type="button" aria-label="Kapat">${ikon('kapat')}</button>
    <div class="jn-ekran"><div class="jn-yt"></div><p class="jn-caliyor">♪ ${kacir(jenerik.baslik)} · ${kacir(jenerik.sanatci)}</p></div>
    <p class="jn-durum" aria-live="polite"></p>
    <div class="jn-perde">
      <div class="jn-akis">
        <p class="jn-soz el">Sonunu bilsem de hepsini baştan yaşardım. Bu kez biraz daha erken tanışarak.<span>— ${kacir(ben.ad)}</span></p>
        <p class="jn-ust">${kacir(ben.yerelSehir ?? 'İstanbul')} – ${kacir(sen.yerelSehir ?? 'Bakü')} ortak yapımı</p>
        <h2 class="jn-ad">Önce Sana Doğar</h2>
        ${satirlar().map(satirHTML).join('')}
        <div class="jn-bitis">
          <p class="jn-buyuk">Bu film henüz bitmedi.</p>
          <p class="jn-kucuk">Devamı: yüz yüze.</p>
        </div>
      </div>
    </div>
    <div class="jn-sahne" hidden>
      <small>Jenerik sonrası sahne</small>
      <p>Bir havalimanı. Kalabalık. Biri elinde pembe bir zambak tutuyor.</p>
      <p>Bir telefon titriyor: “Neredesin?”</p>
      <p>Cevap gelmiyor. Çünkü artık gerek yok.</p>
      <p class="el">“Öptüm.” Bu kez yüz yüze.</p>
    </div>`
  document.body.appendChild(el)
  document.body.classList.add('modal-acik')
  const akis = el.querySelector<HTMLElement>('.jn-akis')!
  const perde = el.querySelector<HTMLElement>('.jn-perde')!
  const durum = el.querySelector<HTMLElement>('.jn-durum')!
  let oynatici: YTOynatici | null = null
  let kayma: gsap.core.Tween | null = null
  let yedek = 0
  let muzikCaliyor = false

  const sahneSonrasi = () => {
    const sahne = el.querySelector<HTMLElement>('.jn-sahne')!
    sahne.hidden = false
    gsap.fromTo(sahne.children, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 1.4, ease: 'power2.out' })
    window.setTimeout(() => sirBul('jenerik'), 7000)
  }
  // isimler, şarkının süresine yayılarak kayar (şarkı yoksa ~100 sn)
  const kaydir = (sure: number) => {
    if (kayma) return
    window.clearTimeout(yedek)
    const h = perde.clientHeight
    const bitis = akis.querySelector<HTMLElement>('.jn-bitis')!
    // son cümleler perdenin ortasında durur
    const son = -(bitis.offsetTop + bitis.offsetHeight / 2 - h / 2)
    kayma = gsap.fromTo(
      akis,
      { y: h * 0.45 },
      {
        y: son,
        duration: azHareket ? 1 : sure,
        ease: 'none',
        onComplete: () => window.setTimeout(() => {
          gsap.to(perde, { autoAlpha: 0, duration: 2 })
          gsap.to(el.querySelector('.jn-ekran'), { autoAlpha: 0.25, duration: 2 })
          window.setTimeout(sahneSonrasi, 2600)
        }, 3500),
      },
    )
  }

  const kapat = () => {
    acik = false
    window.clearTimeout(yedek)
    kayma?.kill()
    try {
      oynatici?.pauseVideo()
    } catch {
      /* oynatıcı hazır değildi */
    }
    if (muzikCaliyor) ses.sustur(false)
    document.body.classList.remove('modal-acik')
    window.removeEventListener('keydown', tus)
    gsap.to(el, { autoAlpha: 0, duration: 0.6, onComplete: () => el.remove() })
  }
  const tus = (e: KeyboardEvent) => e.key === 'Escape' && kapat()
  window.addEventListener('keydown', tus)
  el.querySelector('.jn-kapat')!.addEventListener('click', kapat)
  gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2 })

  // şarkı başlamazsa (bağlantı yok, kayıt gömülmeye kapalı) isimler yine de kayar
  yedek = window.setTimeout(() => {
    durum.innerHTML = `Şarkı başlamadıysa videodaki ▶’e dokun ya da <a href="${jenerik.youtube}" target="_blank" rel="noopener">YouTube’da aç</a>.`
    kaydir(100)
  }, 9000)

  void ytYukle()
    .then((YT) => {
      if (!acik) return
      oynatici = new YT.Player(el.querySelector<HTMLElement>('.jn-yt')!, {
        host: 'https://www.youtube-nocookie.com',
        videoId: jenerik.youtubeIdleri[0],
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls: 0, origin: location.origin },
        events: {
          onReady: () => oynatici?.playVideo(),
          onStateChange: (e) => {
            if (e.data === YT_DURUM.caliyor) {
              muzikCaliyor = true
              ses.sustur(true)
              durum.textContent = ''
              const sure = (oynatici as unknown as { getDuration?: () => number }).getDuration?.() || 228
              kaydir(Math.max(60, sure - 12))
            } else if (e.data === YT_DURUM.bitti) {
              muzikCaliyor = false
              ses.sustur(false)
            }
          },
          onError: () => {
            durum.innerHTML = `Şarkı burada açılmadı; <a href="${jenerik.youtube}" target="_blank" rel="noopener">YouTube’da aç</a>, isimler burada kaymaya devam etsin.`
            kaydir(100)
          },
        },
      })
    })
    .catch(() => {
      durum.textContent = 'YouTube şu an açılmıyor; isimler müziksiz kayacak.'
      kaydir(100)
    })
}
