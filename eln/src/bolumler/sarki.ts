import { ICERIK } from '../icerik'
import { ses } from '../cekirdek/ses'
import { $, belir, ikon, satirSatir, titret } from './yardimci'

const { sarki, sen, ben } = ICERIK

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
          ${sarki.dosya ? `<button class="dugme sarki-cal" type="button">${ikon('muzik')}<span>Çal</span></button>` : ''}
          ${sarki.spotify ? `<a class="dugme ${sarki.dosya ? 'hayalet' : ''} sarki-bag" href="${sarki.spotify}" target="_blank" rel="noopener">${ikon('muzik')}<span>Spotify’da dinle</span></a>` : ''}
          ${sarki.youtube ? `<a class="dugme hayalet sarki-bag" href="${sarki.youtube}" target="_blank" rel="noopener"><span>YouTube</span></a>` : ''}
        </div>
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
