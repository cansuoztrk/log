import { ICERIK } from '../icerik'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { YT_DURUM, type YTOynatici, ytYukle } from '../cekirdek/youtube'
import { $, belir, ikon, satirSatir, titret } from './yardimci'

const { sarki, sen, ben } = ICERIK
const idler: string[] = sarki.youtubeIdleri ?? []
/** Kendi mp3'ümüz yoksa şarkı YouTube oynatıcısıyla sitenin içinde çalar */
const youtubeIle = !sarki.dosya && idler.length > 0

export function sarkiHTML() {
  if (!sarki.baslik) return ''
  return /* html */ `
  <section id="sarki" class="bolum" data-bolum="" data-ad="Şarkımız">
    <div class="icerik-sutun sarki-izgara">
      <div class="pikap" data-dom aria-hidden="true">
        <div class="pikap-govde">
          <div class="plak">
            <div class="plak-etiket"><b>${sarki.baslik}</b><span>${sarki.sanatci}</span><i>${sen.ad[0]} · ${ben.ad[0]}</i></div>
          </div>
          <div class="kol"><span class="kol-bas"></span></div>
          <span class="pikap-isik"></span>
        </div>
      </div>
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Bizim şarkımız</p>
        <h2 class="baslik"><em>${sarki.baslik}</em></h2>
        <p class="sarki-sanatci">${sarki.sanatci}</p>
        <p class="satir italik">Şarkımızın adı “${sarki.baslik}”. Oysa birlikte hiç anımız yok henüz; hepsi bir ekranda, bir seste, bir mesajda.</p>
        <p class="metin">Ama bu şarkıyı her dinlediğimde, henüz yaşamadığımız anıları hatırlıyorum: aynı oda, aynı an, aynı şarkı. İlk gerçek anımız bu olsun: buluştuğumuz gün, onu birlikte dinleyelim.</p>
        <div class="sarki-dugmeler">
          ${sarki.dosya || youtubeIle ? `<button class="dugme sarki-cal" type="button">${ikon('muzik')}<span>Çal</span></button>` : ''}
          ${sarki.spotify ? `<a class="dugme ${sarki.dosya || youtubeIle ? 'hayalet' : ''} sarki-bag" href="${sarki.spotify}" target="_blank" rel="noopener">${ikon('muzik')}<span>Spotify’da dinle</span></a>` : ''}
          ${sarki.youtube && !youtubeIle ? `<a class="dugme hayalet sarki-bag" href="${sarki.youtube}" target="_blank" rel="noopener"><span>YouTube</span></a>` : ''}
        </div>
        ${youtubeIle ? `<div class="sarki-ekran" data-dom><p class="sarki-ekran-bas"><span class="canli" aria-hidden="true"></span>Şu an çalıyor · ${sarki.baslik} · ${sarki.sanatci}</p><div class="yt-kap"></div></div><p class="dipnot sarki-durum" aria-live="polite"></p>` : ''}
      </div>
    </div>
  </section>`
}

export function sarkiKur() {
  const bolum = document.querySelector<HTMLElement>('#sarki')
  if (!bolum) return
  satirSatir($('.baslik', bolum))
  belir([$('.pikap', bolum), ...Array.from(bolum.querySelectorAll('.bolum-bas > p, .sarki-dugmeler'))])
  const pikap = $('.pikap', bolum)
  const cal = (acik: boolean) => {
    pikap.classList.toggle('caliyor', acik)
    if (acik) titret(15)
  }
  const dugme = bolum.querySelector<HTMLButtonElement>('.sarki-cal')
  if (youtubeIle && dugme) {
    youtubeKur(bolum, dugme, cal)
    return
  }
  dugme?.addEventListener('click', async () => {
    if (pikap.classList.contains('caliyor')) {
      ses.sarkiDur()
      cal(false)
      dugme.querySelector('span')!.textContent = 'Çal'
      return
    }
    const oldu = await ses.sarkiCal(sarki.dosya, () => {
      cal(false)
      dugme.querySelector('span')!.textContent = 'Çal'
    })
    if (oldu) {
      cal(true)
      dugme.querySelector('span')!.textContent = 'Durdur'
    }
  })
  // Bağlantıyla dinlemeye gidince de plak bir süre dönsün
  for (const a of bolum.querySelectorAll('.sarki-bag')) {
    a.addEventListener('click', () => {
      cal(true)
      window.setTimeout(() => cal(false), 12000)
    })
  }
}

/* ─── YouTube ile çalma ───
   Oynatıcı bölüme yaklaşınca önceden hazırlanır: telefonlarda (özellikle iPhone) çalma,
   ancak dokunuşun hemen içinde başlatılırsa izin veriliyor. İlk kayıt gömülmeye kapalıysa
   ya da kaldırılmışsa sıradakine geçilir; hiçbiri olmazsa Spotify bağlantısı öne çıkar. */
function youtubeKur(bolum: HTMLElement, dugme: HTMLButtonElement, cal: (acik: boolean) => void) {
  const ekran = $('.sarki-ekran', bolum)
  const kap = $('.yt-kap', bolum)
  const durum = $('.sarki-durum', bolum)
  const yazi = dugme.querySelector('span')!
  let oynatici: YTOynatici | null = null
  let hazir = false
  let bekleyen = false
  let caliyor = false
  let sira = 0
  let sonDokunus = 0

  const kur = async () => {
    if (oynatici) return
    try {
      const YT = await ytYukle()
      oynatici = new YT.Player(kap, {
        host: 'https://www.youtube-nocookie.com',
        videoId: idler[0],
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, origin: location.origin },
        events: {
          onReady: () => {
            hazir = true
            if (bekleyen) oynatici?.playVideo()
          },
          onStateChange: (e) => {
            if (e.data === YT_DURUM.caliyor) {
              caliyor = true
              bekleyen = false
              cal(true)
              ses.sustur(true)
              yazi.textContent = 'Durdur'
              durum.textContent = ''
            } else if (e.data === YT_DURUM.durdu || e.data === YT_DURUM.bitti) {
              caliyor = false
              cal(false)
              ses.sustur(false)
              yazi.textContent = 'Çal'
              if (e.data === YT_DURUM.bitti) window.setTimeout(() => sirBul('anilar'), 800)
            }
          },
          onError: () => {
            sira++
            if (oynatici && sira < idler.length) {
              // az önce dokunulduysa sıradaki kayıt hemen çalmayı dener; tarayıcı izin vermezse ekrandaki ▶ kalır
              if (Date.now() - sonDokunus < 4000) {
                durum.textContent = 'Başka bir kayıt açılıyor… Başlamazsa ekrandaki ▶’e dokun.'
                oynatici.loadVideoById(idler[sira])
              } else {
                durum.textContent = 'Başka bir kayıt hazırlandı; bir kez daha dokun.'
                oynatici.cueVideoById(idler[sira])
              }
            } else {
              durum.innerHTML = `Şarkı burada açılmadı. <b>Spotify’da dinle</b> düğmesinden dinleyebilirsin.`
              ekran.classList.remove('acik')
              bolum.querySelector('.sarki-bag')?.classList.remove('hayalet')
            }
          },
        },
      })
    } catch {
      durum.innerHTML = 'YouTube şu an açılmıyor (bağlantı yok gibi). <b>Spotify’da dinle</b> düğmesini deneyebilirsin.'
    }
  }

  // bölüme yaklaşınca oynatıcıyı hazırla
  const io = new IntersectionObserver(
    (k) => {
      if (k.some((x) => x.isIntersecting)) {
        io.disconnect()
        void kur()
      }
    },
    { rootMargin: '900px' },
  )
  io.observe(bolum)

  dugme.addEventListener('click', () => {
    ses.baslat()
    sonDokunus = Date.now()
    if (caliyor) {
      oynatici?.pauseVideo()
      return
    }
    ekran.classList.add('acik')
    titret(12)
    if (hazir && oynatici) oynatici.playVideo()
    else {
      bekleyen = true
      durum.textContent = 'Oynatıcı hazırlanıyor… Başlamazsa ekrandaki ▶’e dokun.'
      void kur()
    }
  })
}
