import { albumAc, albumAcik, albumIcerik, albumOtomatik, kelimeKayitli, type Album } from '../cekirdek/album'
import { oku, yaz } from '../cekirdek/depo'
import { ardayaYaz } from '../cekirdek/posta'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { ICERIK } from '../icerik'
import { $, gsap, ScrollTrigger, titret } from './yardimci'

/**
 * Albüm bölümlerinin (Mesajlarımızdan, Senin Gözünden, Yıldızladıkların, İzlerimiz) ortak kilidi.
 * Birinde kelime yazılınca hepsi birden açılır.
 */
export function kilitHTML() {
  return /* html */ `
    <form class="album-kilit" autocomplete="off">
      <span class="ak-muhur" aria-hidden="true">🔒</span>
      <p class="ak-bas">Bu sayfalar ikimize özel</p>
      <p class="ak-metin">Fotoğrafların ve mesajlarımız burada şifreli duruyor; kelimemizi bilmeyen hiçbir şey göremez. Bir kez yaz, telefonun hatırlar.</p>
      <label class="gorunmez" for="">Kelimemiz</label>
      <div class="ak-satir">
        <input name="kelime" type="password" maxlength="40" placeholder="kelimemiz" autocapitalize="off" autocorrect="off" spellcheck="false" required />
        <button class="dugme" type="submit"><span>Aç</span></button>
      </div>
      <p class="ak-ipucu">İpucu: sahibinin sana taktığı ad 🐾</p>
      <p class="ak-hata" role="alert" hidden></p>
    </form>`
}

let dinleniyor = false

/** Bölümdeki [data-album] alanına kilidi koyar; albüm açılınca `ciz` bir kez çağrılır */
export function albumBolumu(bolum: HTMLElement, ciz: (a: Album, alan: HTMLElement) => void) {
  const alan = $<HTMLElement>('[data-album]', bolum)
  let cizildi = false
  const ac = (a: Album) => {
    if (cizildi) return
    cizildi = true
    alan.innerHTML = ''
    alan.classList.add('acik')
    ciz(a, alan)
    // içerik açılınca sayfa uzadı: kaydırma tetikleyicileri yeniden ölçsün
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }
  const acik = albumIcerik()
  if (albumAcik() && acik) ac(acik)
  else {
    alan.innerHTML = kilitHTML()
    const input = alan.querySelector<HTMLInputElement>('input')!
    input.id = `ak-${bolum.id}`
    alan.querySelector('label')!.setAttribute('for', input.id)
    if (kelimeKayitli()) alan.classList.add('aciliyor')
  }
  window.addEventListener('album-acildi', (e) => ac((e as CustomEvent<Album>).detail))

  if (dinleniyor) return
  dinleniyor = true
  // bütün kilit formları tek dinleyiciyle
  document.addEventListener('submit', async (e) => {
    const form = (e.target as Element).closest<HTMLFormElement>('.album-kilit')
    if (!form) return
    e.preventDefault()
    const input = form.querySelector<HTMLInputElement>('input')!
    const hata = form.querySelector<HTMLElement>('.ak-hata')!
    const dugme = form.querySelector<HTMLButtonElement>('button')!
    if (!input.value.trim()) return
    dugme.disabled = true
    form.classList.add('bekliyor')
    hata.hidden = true
    const s = await albumAc(input.value)
    dugme.disabled = false
    form.classList.remove('bekliyor')
    if (s === 'tamam') {
      ses.cin()
      titret([20, 60, 20])
      window.dispatchEvent(new CustomEvent('kutla', { detail: 40 }))
      window.setTimeout(() => sirBul('album'), 1200)
      if (!oku('albumHaber', false)) {
        yaz('albumHaber', true)
        void ardayaYaz(`${ICERIK.sen.ad} albümümüzü açtı 🔓`, 'Mesajlarımız, fotoğrafları, yıldızladıkları… Şu an bakıyor.', ['unlock'])
      }
      return
    }
    hata.textContent = s === 'yanlis' ? 'Bu değil. Bir daha dene 🐾' : 'Açılamadı; internet bağlantını kontrol edip tekrar dene.'
    hata.hidden = false
    gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' })
    titret([30, 40, 30])
  })
  // telefon kelimeyi hatırlıyorsa sessizce aç
  void albumOtomatik().then((a) => {
    if (!a) for (const x of document.querySelectorAll('[data-album].aciliyor')) x.classList.remove('aciliyor')
  })
}
