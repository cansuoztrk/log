import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { kimim } from '../cekirdek/posta'
import { saatYazi } from '../cekirdek/zaman'
import { gsap, ikon, kacir, titret } from '../bolumler/yardimci'
import { baglanti, type Ek } from './nabiz'
import { bildir } from './ust'

/**
 * FISILTI — ikimiz de aynı anda sitedeyken birbirimize yazdığımız, sesli fısıldadığımız köşe.
 * · Mesajlar ikimizin bildiği bir kelimeden türetilen anahtarla uçtan uca şifrelenir (AES-GCM).
 * · Yazılı fısıltılar sunucuda hiç saklanmaz (ntfy cache=no); sadece o an bağlı olana ulaşır.
 * · Sesli fısıltılar şifreli bir dosya olarak birkaç saat durur (ntfy dosyayı başka türlü vermiyor).
 * · Geçmiş yalnızca kendi telefonumuzda durur.
 */

const { ben: arda, sen: eln } = ICERIK
const KELIME = 'fisiltiKelime'
const GECMIS = 'fisiltilar'
const EN_UZUN_SES = 15 // saniye

interface Fisilti {
  id: string
  kim: 'ben' | 'o'
  t?: string
  ses?: { sure: number }
  zaman: number
  durum?: 'gidiyor' | 'gitti' | 'okundu' | 'hata'
}

/* ─── şifre ─────────────────────────────────────────────────────────────── */
let anahtar: CryptoKey | null = null
const kodla = new TextEncoder()
const coz = new TextDecoder()

async function anahtarUret(kelime: string) {
  const temiz = kelime.normalize('NFC').trim().toLocaleLowerCase('tr-TR')
  const ham = await crypto.subtle.importKey('raw', kodla.encode(temiz), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: kodla.encode(`once-sana-dogar:${ICERIK.ruzgarPostasi.ntfyKonu}`), iterations: 150_000 },
    ham,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

function b64(b: Uint8Array) {
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}
const b64Coz = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function sifreleBayt(veri: Uint8Array<ArrayBuffer>) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, anahtar!, veri))
  const son = new Uint8Array(12 + ct.length)
  son.set(iv)
  son.set(ct, 12)
  return son
}

async function cozBayt(veri: Uint8Array<ArrayBuffer>) {
  if (!anahtar || veri.length < 13) return null
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: veri.subarray(0, 12) }, anahtar, veri.subarray(12)))
  } catch {
    return null // başka bir kelimeyle kilitlenmiş
  }
}

const sifreleNesne = async (o: object) => b64(await sifreleBayt(kodla.encode(JSON.stringify(o))))
async function cozNesne<T>(s: unknown): Promise<T | null> {
  if (typeof s !== 'string') return null
  try {
    const b = await cozBayt(b64Coz(s))
    return b ? (JSON.parse(coz.decode(b)) as T) : null
  } catch {
    return null
  }
}

/* ─── durum ─────────────────────────────────────────────────────────────── */
let liste = oku<Fisilti[]>(GECMIS, [])
const sesler = new Map<string, Blob>() // bu oturumdaki sesli fısıltılar (kaydedilmez)
const kaydet = () => {
  liste = liste.slice(-150)
  yaz(GECMIS, liste)
}
const yeniId = () => Date.now().toString(36).padStart(9, '0') + Math.random().toString(36).slice(2, 6)
const sureYaz = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

let kur = false
let panel: HTMLElement
let acik = false
let okunmamis = 0
const bekleyenler: { m: Record<string, unknown>; ek?: Ek }[] = [] // kelime girilmeden gelenler

/** Menüden, bildirimden ya da "şu an burada" kutusundan açılır */
export function fisiltiAc() {
  hazirla()
  if (acik) return
  acik = true
  panel.hidden = false
  document.body.classList.add('modal-acik')
  gsap.fromTo(panel, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out' })
  durumGuncelle()
  if (!anahtar) kilitGoster()
  else window.setTimeout(() => panel.querySelector<HTMLTextAreaElement>('.fs-alan')?.focus({ preventScroll: true }), 400)
  sonaKaydir(false)
  okunmamis = 0
  rozetGuncelle()
  okunduGonder()
}

function kapat() {
  acik = false
  document.body.classList.remove('modal-acik')
  gsap.to(panel, { autoAlpha: 0, y: 30, duration: 0.4, onComplete: () => (panel.hidden = true) })
}

/* ─── arayüz ────────────────────────────────────────────────────────────── */
function hazirla() {
  if (kur) return
  kur = true
  const karsi = baglanti.karsiAd || (kimim() === 'eln' ? arda.ad : eln.ad)
  panel = document.createElement('section')
  panel.className = 'fisilti'
  panel.hidden = true
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', 'Fısıltı')
  panel.setAttribute('data-lenis-prevent', '')
  panel.innerHTML = /* html */ `
    <header class="fs-bas">
      <button class="ikon-dugme fs-kapat" type="button" aria-label="Kapat">${ikon('kapat')}</button>
      <div class="fs-kim">
        <b>${kacir(karsi)}</b>
        <small class="fs-durum"></small>
      </div>
      <svg class="fs-yay" viewBox="0 0 300 64" aria-hidden="true">
        <path class="fs-yol" d="M22 46 Q150 -8 278 46" />
        <circle class="fs-sehir" cx="22" cy="46" r="3.5" />
        <circle class="fs-sehir" cx="278" cy="46" r="3.5" />
        <text x="22" y="61">İST</text><text x="278" y="61">BAKI</text>
        <circle class="fs-isik" r="4" cx="22" cy="46" opacity="0" />
      </svg>
      <p class="fs-kilitli">🔒 uçtan uca şifreli · sunucuda saklanmaz · <button type="button" class="fs-kelime-degis">kelimemiz</button></p>
    </header>
    <div class="fs-liste" aria-live="polite"></div>
    <p class="fs-yaziyor" hidden><span class="fs-dalga" aria-hidden="true"><i></i><i></i><i></i></span><span>${kacir(karsi)} yazıyor…</span></p>
    <div class="fs-yok" hidden>
      <p><b>${kacir(karsi)}</b> şu an burada değil. Fısıltılar yalnızca ikimiz de buradayken gider.</p>
      <button class="dugme hayalet fs-ruzgara" type="button"><span>Rüzgâr Postası’na bırak</span></button>
    </div>
    <div class="fs-hizli">
      ${['☺️', '🥺', 'Öptüm 💋', 'Səni sevirəm', 'bokkuş'].map((h) => `<button type="button" data-hizli="${h}">${h}</button>`).join('')}
    </div>
    <div class="fs-mik-yardim" role="alert" hidden></div>
    <form class="fs-yaz" autocomplete="off">
      <button class="fs-mik" type="button" aria-label="Sesli fısıltı kaydet"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>
      <label class="gorunmez" for="fs-alan">Fısıltın</label>
      <textarea id="fs-alan" class="fs-alan" rows="1" maxlength="1000" placeholder="Fısılda…"></textarea>
      <button class="fs-gonder" type="submit" aria-label="Gönder"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </form>
    <div class="fs-kayit" hidden>
      <span class="fs-kayit-nokta" aria-hidden="true"></span>
      <span class="fs-kayit-sure">0:00</span>
      <span class="fs-kayit-dalga" aria-hidden="true">${'<i></i>'.repeat(18)}</span>
      <button class="fs-iptal" type="button" aria-label="Vazgeç">${ikon('kapat')}</button>
      <button class="fs-bitir" type="button">Gönder</button>
    </div>
    <div class="fs-kilit" hidden>
      <p class="fs-kilit-ikon" aria-hidden="true">🔒</p>
      <h3>Fısıltılarımız ikimize özel</h3>
      <p class="fs-kilit-metin">${
        kimim() === 'arda'
          ? `Bir kelime seç ve ${kacir(eln.ad)}’e söyle; ikiniz de aynı kelimeyi yazınca fısıltılar sadece sizin telefonlarınızda okunur.`
          : `${kacir(karsi)} sana bir kelime söyleyecek (ya da söyledi). İkiniz de aynı kelimeyi yazınca fısıltılar sadece sizin telefonlarınızda okunur.`
      }</p>
      <form class="fs-kilit-form" autocomplete="off">
        <label class="gorunmez" for="fs-kelime">Kelimemiz</label>
        <input id="fs-kelime" type="password" maxlength="64" placeholder="kelimemiz" required />
        <button class="dugme" type="submit"><span>Kilidi aç</span></button>
      </form>
      <p class="dipnot">Kelime bu telefondan başka hiçbir yere gitmez.</p>
    </div>`
  document.body.appendChild(panel)

  const alan = panel.querySelector<HTMLTextAreaElement>('.fs-alan')!
  const form = panel.querySelector<HTMLFormElement>('.fs-yaz')!
  panel.querySelector('.fs-kapat')!.addEventListener('click', kapat)
  window.addEventListener('keydown', (e) => e.key === 'Escape' && acik && kapat())
  panel.querySelector('.fs-ruzgara')!.addEventListener('click', () => {
    kapat()
    document.querySelector('#ruzgar')?.scrollIntoView({ behavior: 'smooth' })
  })
  panel.querySelector('.fs-kelime-degis')!.addEventListener('click', kilitGoster)

  // yazarken kutu büyür; "yazıyor…" en fazla 6 saniyede bir gider (ntfy'yi yormamak için)
  let sonYaziyor = 0
  alan.addEventListener('input', () => {
    alan.style.height = 'auto'
    alan.style.height = `${Math.min(alan.scrollHeight, 120)}px`
    if (alan.value.trim() && baglanti.cevrimici() && Date.now() - sonYaziyor > 6000) {
      sonYaziyor = Date.now()
      void baglanti.gonder({ tip: 'yaziyor' })
    }
  })
  alan.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer: coarse)').matches) {
      e.preventDefault()
      form.requestSubmit()
    }
  })
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const t = alan.value.trim()
    if (!t) return
    alan.value = ''
    alan.style.height = 'auto'
    void metinGonder(t)
  })
  for (const b of panel.querySelectorAll<HTMLButtonElement>('[data-hizli]')) b.addEventListener('click', () => void metinGonder(b.dataset.hizli!))

  // kilit
  panel.querySelector<HTMLFormElement>('.fs-kilit-form')!.addEventListener('submit', async (e) => {
    e.preventDefault()
    const girdi = panel.querySelector<HTMLInputElement>('#fs-kelime')!
    const kelime = girdi.value.trim()
    if (!kelime) return
    anahtar = await anahtarUret(kelime)
    yaz(KELIME, kelime)
    girdi.value = ''
    panel.querySelector<HTMLElement>('.fs-kilit')!.hidden = true
    ses.cin()
    for (const b of bekleyenler.splice(0)) await isle(b.m, b.ek)
    ciz()
  })

  sesKur()
  ciz()

  // Telefonda klavye açılınca pencere görünen alana sığsın (iOS'ta yazı kutusu klavyenin altında kalmasın)
  const vv = window.visualViewport
  if (vv && matchMedia('(max-width: 699px)').matches) {
    const sigdir = () => {
      if (!acik) return
      panel.style.top = `${vv.offsetTop + 10}px`
      panel.style.height = `${vv.height - 10}px`
      panel.style.bottom = 'auto'
      sonaKaydir(false)
    }
    vv.addEventListener('resize', sigdir)
    vv.addEventListener('scroll', sigdir)
  }
}

function kilitGoster() {
  const k = panel.querySelector<HTMLElement>('.fs-kilit')!
  k.hidden = false
  gsap.fromTo(k, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 })
  window.setTimeout(() => panel.querySelector<HTMLInputElement>('#fs-kelime')?.focus(), 300)
}

function durumGuncelle() {
  if (!kur) return
  const var_ = baglanti.cevrimici()
  panel.classList.toggle('yok', !var_)
  panel.querySelector<HTMLElement>('.fs-durum')!.innerHTML = var_ ? '<i class="fs-yesil"></i>şu an burada' : 'şu an burada değil'
  panel.querySelector<HTMLElement>('.fs-yok')!.hidden = var_
  for (const el of panel.querySelectorAll<HTMLButtonElement | HTMLTextAreaElement>('.fs-yaz button, .fs-yaz textarea, .fs-hizli button'))
    el.disabled = !var_
}

function rozetGuncelle() {
  const r = document.querySelector<HTMLElement>('.nabiz-fisilti .rozet-sayi')
  if (!r) return
  r.hidden = okunmamis === 0
  r.textContent = String(okunmamis)
}

/* ─── liste ─────────────────────────────────────────────────────────────── */
function balonHTML(f: Fisilti) {
  const tik = f.kim === 'ben' ? { gidiyor: '·', gitti: '✓', okundu: '✓✓', hata: '! tekrar dene' }[f.durum ?? 'gitti'] : ''
  const govde = f.ses
    ? sesler.has(f.id)
      ? `<button class="fs-oynat" type="button" data-oynat="${f.id}" aria-label="Dinle">▶</button><span class="fs-ses-dalga" aria-hidden="true">${'<i></i>'.repeat(16)}</span><span class="fs-ses-sure">${sureYaz(f.ses.sure)}</span>`
      : `<span class="fs-ses-gitti">🎙️ Sesli fısıltı · ${sureYaz(f.ses.sure)} <em>(rüzgârla gitti)</em></span>`
    : kacir(f.t ?? '').replace(/\n/g, '<br/>')
  return `<div class="fs-m ${f.kim}${f.durum === 'hata' ? ' hata' : ''}" data-id="${f.id}">
    <div class="fs-balon${f.ses ? ' ses' : ''}">${govde}</div>
    <small class="fs-alt">${saatYazi(new Date(f.zaman), kimim() === 'arda' ? arda.saatDilimi : eln.saatDilimi)}${tik ? ` · <b class="fs-tik ${f.durum}">${tik}</b>` : ''}</small>
  </div>`
}

function ciz() {
  if (!kur) return
  const kutu = panel.querySelector<HTMLElement>('.fs-liste')!
  kutu.innerHTML = liste.length
    ? liste.map(balonHTML).join('')
    : `<p class="fs-bos">Buraya yazdıkların, ikimiz de buradayken rüzgârdan hızlı gider.<br/><em>İlk fısıltı senden olsun.</em></p>`
  sonaKaydir(false)
}

function ekle(f: Fisilti) {
  const kutu = panel.querySelector<HTMLElement>('.fs-liste')!
  kutu.querySelector('.fs-bos')?.remove()
  kutu.insertAdjacentHTML('beforeend', balonHTML(f))
  const el = kutu.lastElementChild as HTMLElement
  gsap.from(el, { autoAlpha: 0, x: f.kim === 'ben' ? 24 : -24, y: 8, duration: 0.6, ease: 'expo.out' })
  sonaKaydir(true)
}

function guncelle(f: Fisilti) {
  const el = panel.querySelector<HTMLElement>(`.fs-m[data-id="${f.id}"]`)
  if (!el) return
  const yeni = document.createElement('div')
  yeni.innerHTML = balonHTML(f)
  el.replaceWith(yeni.firstElementChild!)
}

function sonaKaydir(yumusak: boolean) {
  const kutu = panel?.querySelector<HTMLElement>('.fs-liste')
  if (kutu) kutu.scrollTo({ top: kutu.scrollHeight, behavior: yumusak ? 'smooth' : 'auto' })
}

/** Başlıktaki yayda bir ışık, gönderenin şehrinden alıcınınkine uçar */
function isikUcur(benden: boolean) {
  const yol = panel.querySelector<SVGPathElement>('.fs-yol')!
  const isik = panel.querySelector<SVGCircleElement>('.fs-isik')!
  const uzunluk = yol.getTotalLength()
  const benIst = kimim() === 'arda'
  const soldan = benden === benIst // İstanbul solda, Bakü sağda
  const o = { t: 0 }
  isik.setAttribute('opacity', '1')
  gsap.to(o, {
    t: 1,
    duration: 1.1,
    ease: 'power2.inOut',
    onUpdate: () => {
      const p = yol.getPointAtLength(uzunluk * (soldan ? o.t : 1 - o.t))
      isik.setAttribute('cx', String(p.x))
      isik.setAttribute('cy', String(p.y))
    },
    onComplete: () => {
      isik.setAttribute('opacity', '0')
      gsap.fromTo(panel.querySelectorAll('.fs-sehir')[soldan ? 1 : 0], { attr: { r: 7 } }, { attr: { r: 3.5 }, duration: 0.8, ease: 'expo.out' })
    },
  })
}

/* ─── gönderme ──────────────────────────────────────────────────────────── */
async function metinGonder(t: string) {
  if (!anahtar) return kilitGoster()
  if (!baglanti.cevrimici()) return durumGuncelle()
  const f: Fisilti = { id: yeniId(), kim: 'ben', t, zaman: Date.now(), durum: 'gidiyor' }
  liste.push(f)
  kaydet()
  ekle(f)
  isikUcur(true)
  ses.nota(81, 0.025)
  titret(8)
  await tekrarGonder(f)
}

async function tekrarGonder(f: Fisilti) {
  const tamam = await baglanti.gonder({ tip: 'fisilti', id: f.id, v: await sifreleNesne({ t: f.t }) })
  f.durum = tamam ? 'gitti' : 'hata'
  kaydet()
  guncelle(f)
  if (tamam) sirBul('fisilti')
}

/* ─── sesli fısıltı ─────────────────────────────────────────────────────── */
const ua = navigator.userAgent
/** Instagram, Facebook, TikTok… içindeki tarayıcılar sitelere mikrofon vermez */
const uygulamaIci = () => /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|TikTok|musical_ly|Snapchat|Twitter/i.test(ua) || /; wv\)/.test(ua)
const iphone = () => /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const anaEkranda = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

/** Mikrofon açılamayınca nedenine göre ne yapılacağını panelin içinde anlatır */
function mikYardim(neden: string) {
  const kutu = panel.querySelector<HTMLElement>('.fs-mik-yardim')!
  const izin = ['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(neden)
  const mesgul = ['NotReadableError', 'TrackStartError', 'AbortError'].includes(neden)
  let baslik: string
  let metin: string
  if (neden === 'uygulama') {
    baslik = 'Bu pencere mikrofonu vermiyor'
    metin = `Siteyi Instagram’ın (ya da başka bir uygulamanın) içinden açmışsın; bu uygulamalar sitelere mikrofon izni vermiyor. Sağ üstteki <b>•••</b> menüsünden <b>${iphone() ? 'Safari’de aç' : 'Tarayıcıda aç'}</b>’a bas; orada sesli fısıltı çalışır.`
  } else if (izin && iphone()) {
    baslik = 'Mikrofon izni kapalı'
    metin = /CriOS/.test(ua)
      ? 'iPhone’da <b>Ayarlar → Chrome → Mikrofon</b>’u aç, sonra sayfayı yenileyip tekrar bas.'
      : anaEkranda()
        ? 'Ana ekrandaki uygulamada iPhone her seferinde sorar: mikrofona basınca çıkan soruya <b>İzin Ver</b> de. Hiç sormuyorsa <b>Ayarlar → Safari → Mikrofon → Sor</b> yap.'
        : 'Safari’de adres çubuğundaki <b>aA</b> → <b>Web Sitesi Ayarları</b> → <b>Mikrofon</b> → <b>İzin Ver</b>. Orada yoksa <b>Ayarlar → Safari → Mikrofon → İzin Ver</b>. Sonra sayfayı yenileyip tekrar bas.'
  } else if (izin) {
    baslik = 'Mikrofon izni kapalı'
    metin =
      'Adres çubuğunun solundaki <b>ayar (ya da kilit) simgesi</b> → <b>İzinler</b> → <b>Mikrofon</b> → <b>İzin ver</b>. Orada açıksa telefonun <b>Ayarlar → Uygulamalar → Chrome → İzinler → Mikrofon</b>’u da aç. Sonra sayfayı yenileyip tekrar bas.'
  } else if (mesgul) {
    baslik = 'Mikrofon şu an başka yerde'
    metin =
      'Telefonla, WhatsApp’ta ya da Instagram’da aramadaysanız mikrofon o aramada; telefon onu aynı anda siteye vermiyor. Aramayı kapatınca tekrar dene (arama sürerken yazarak fısıldayabilirsin).'
  } else if (neden === 'NotFoundError' || neden === 'DevicesNotFoundError' || neden === 'OverconstrainedError') {
    baslik = 'Mikrofon bulunamadı'
    metin = 'Bu cihazda kullanılabilir bir mikrofon görünmüyor. Kulaklık takılıysa çıkarıp tekrar dene.'
  } else if (neden === 'InvalidStateError') {
    baslik = 'Telefon mikrofonu bırakmadı'
    metin = iphone()
      ? 'Safari’yi tamamen kapat (alttan yukarı kaydırıp Safari’yi yukarı at), yeniden açıp siteye gir ve mikrofona tekrar bas. Arka planda müzik ya da video çalıyorsa önce onu durdur.'
      : 'Sayfayı yenileyip tekrar dene. Arka planda müzik ya da video çalıyorsa önce onu durdur.'
  } else if (neden === 'desteksiz' || neden === 'kaydedici') {
    baslik = 'Bu tarayıcı ses kaydedemedi'
    metin = `Tarayıcını güncelleyip tekrar dene ya da siteyi ${iphone() ? 'Safari' : 'Chrome'}’da aç. O zamana kadar yazarak fısıldayabilirsin.`
  } else {
    baslik = 'Mikrofon açılamadı'
    metin = 'Sayfayı yenileyip tekrar dene. Olmazsa aşağıdaki kodu Arda’ya gönder.'
  }
  kutu.innerHTML = `<p class="fs-my-bas">🎙️ ${baslik}</p><p>${metin}</p>
    <div class="fs-my-alt"><small class="fs-my-kod">${kacir(neden)}</small><button type="button" class="dugme hayalet" data-yardim="kapat"><span>Tamam</span></button>${neden === 'uygulama' || neden === 'desteksiz' ? '' : '<button type="button" class="dugme" data-yardim="tekrar"><span>Tekrar dene</span></button>'}</div>`
  kutu.hidden = false
  gsap.fromTo(kutu, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35 })
  titret([20, 40, 20])
}
function yardimGizle() {
  const kutu = panel.querySelector<HTMLElement>('.fs-mik-yardim')
  if (kutu) kutu.hidden = true
}

function sesKur() {
  const mik = panel.querySelector<HTMLButtonElement>('.fs-mik')!
  const kayitKutu = panel.querySelector<HTMLElement>('.fs-kayit')!
  const sureEl = panel.querySelector<HTMLElement>('.fs-kayit-sure')!
  const form = panel.querySelector<HTMLElement>('.fs-yaz')!
  let kaydedici: MediaRecorder | null = null
  let akis: MediaStream | null = null
  let parcalar: Blob[] = []
  let bas = 0
  let bitis = 0
  let sayac = 0
  let gonderilsin = false

  const bitir = (gonder: boolean) => {
    gonderilsin = gonder
    bitis = performance.now()
    window.clearInterval(sayac)
    if (kaydedici?.state === 'recording') kaydedici.stop()
    kayitKutu.hidden = true
    form.hidden = false
  }

  /** mikrofonu kapat, iOS ses oturumunu eski hâline döndür */
  const birak = () => {
    akis?.getTracks().forEach((t) => t.stop())
    akis = null
    ses.kayitModu(false)
  }
  let basliyor = false
  const baslat = async () => {
    if (!anahtar) return kilitGoster()
    if (!baglanti.cevrimici()) return durumGuncelle()
    if (basliyor || kaydedici?.state === 'recording') return
    yardimGizle()
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return mikYardim(uygulamaIci() ? 'uygulama' : 'desteksiz')
    basliyor = true
    mik.classList.add('bekliyor')
    const kisit = { audio: { echoCancellation: true, noiseSuppression: true } }
    try {
      ses.kayitModu(true)
      try {
        akis = await navigator.mediaDevices.getUserMedia(kisit)
      } catch (e) {
        // iOS ses oturumu hâlâ kayda kapalıysa bir kez de en sade oturumla dene
        if ((e as DOMException)?.name !== 'InvalidStateError' || !ses.oturumSerbest()) throw e
        akis = await navigator.mediaDevices.getUserMedia(kisit)
      }
    } catch (e) {
      ses.kayitModu(false)
      const ad = (e as DOMException)?.name || 'Error'
      // uygulama içi tarayıcıda izin hatası: asıl çözüm siteyi gerçek tarayıcıda açmak
      return mikYardim(uygulamaIci() && ['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(ad) ? 'uygulama' : ad)
    } finally {
      basliyor = false
      mik.classList.remove('bekliyor')
    }
    const iz = akis.getAudioTracks()[0]
    if (!iz || iz.readyState === 'ended') {
      birak()
      return mikYardim('NotReadableError')
    }
    // her iki telefonda da çalınabilsin diye önce mp4 (AAC), yoksa webm (Opus)
    const tur = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t))
    // bazı telefonlar "destekliyorum" deyip o ayarla kaydedici kuramıyor: sırayla daha sade ayarları dene
    const secenekler: MediaRecorderOptions[] = [
      ...(tur ? [{ mimeType: tur, audioBitsPerSecond: 48_000 }, { mimeType: tur }] : []),
      { audioBitsPerSecond: 48_000 },
      {},
    ]
    kaydedici = null
    for (const o of secenekler) {
      try {
        kaydedici = new MediaRecorder(akis, o)
        break
      } catch {
        /* sıradaki */
      }
    }
    if (!kaydedici) {
      birak()
      return mikYardim('kaydedici')
    }
    parcalar = []
    kaydedici.ondataavailable = (e) => e.data.size && parcalar.push(e.data)
    kaydedici.onstop = async () => {
      birak()
      ses.sustur(false)
      const sure = Math.min(EN_UZUN_SES, ((bitis || performance.now()) - bas) / 1000)
      if (!gonderilsin || sure < 0.6) return
      const blob = new Blob(parcalar, { type: kaydedici?.mimeType || tur || 'audio/mp4' })
      const f: Fisilti = { id: yeniId(), kim: 'ben', ses: { sure }, zaman: Date.now(), durum: 'gidiyor' }
      sesler.set(f.id, blob)
      liste.push(f)
      kaydet()
      ekle(f)
      isikUcur(true)
      const sifreli = await sifreleBayt(new Uint8Array(await blob.arrayBuffer()))
      const tamam = await baglanti.dosyaGonder(
        { tip: 'ses', id: f.id, v: await sifreleNesne({ sure, tur: blob.type }) },
        new Blob([sifreli as BlobPart]),
      )
      f.durum = tamam ? 'gitti' : 'hata'
      kaydet()
      guncelle(f)
      if (tamam) sirBul('fisilti')
    }
    kaydedici.onerror = () => {
      bitir(false)
      mikYardim('kaydedici')
    }
    try {
      kaydedici.start(250)
    } catch {
      try {
        kaydedici.start()
      } catch {
        birak()
        return mikYardim('kaydedici')
      }
    }
    ses.sustur(true)
    bas = performance.now()
    form.hidden = true
    kayitKutu.hidden = false
    titret(15)
    sureEl.textContent = '0:00'
    sayac = window.setInterval(() => {
      const s = (performance.now() - bas) / 1000
      sureEl.textContent = sureYaz(s)
      if (s >= EN_UZUN_SES) bitir(true)
    }, 200)
  }
  mik.addEventListener('click', () => void baslat())
  panel.querySelector('.fs-mik-yardim')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-yardim]')
    if (!b) return
    yardimGizle()
    if (b.dataset.yardim === 'tekrar') void baslat()
  })
  panel.querySelector('.fs-bitir')!.addEventListener('click', () => bitir(true))
  panel.querySelector('.fs-iptal')!.addEventListener('click', () => bitir(false))

  // dinleme
  panel.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-oynat]')
    if (b) void dinle(b)
    const h = (e.target as Element).closest<HTMLElement>('.fs-m.ben.hata')
    if (h) {
      const f = liste.find((x) => x.id === h.dataset.id)
      if (f?.t) {
        f.durum = 'gidiyor'
        guncelle(f)
        void tekrarGonder(f)
      }
    }
  })
}

let calan: HTMLAudioElement | null = null
async function dinle(b: HTMLButtonElement) {
  const blob = sesler.get(b.dataset.oynat!)
  if (!blob) return
  calan?.pause()
  const a = new Audio(URL.createObjectURL(blob))
  calan = a
  const balon = b.closest('.fs-balon')!
  balon.classList.add('caliyor')
  b.textContent = '❚❚'
  ses.sustur(true)
  const bitti = () => {
    balon.classList.remove('caliyor')
    b.textContent = '▶'
    ses.sustur(false)
    URL.revokeObjectURL(a.src)
  }
  a.onended = bitti
  a.onpause = bitti
  try {
    await a.play()
  } catch {
    bitti()
  }
}

/* ─── gelen ─────────────────────────────────────────────────────────────── */
let yaziyorZaman = 0
let okunduZaman = 0

function okunduGonder() {
  window.clearTimeout(okunduZaman)
  okunduZaman = window.setTimeout(() => {
    if (!acik || document.hidden || !baglanti.cevrimici()) return
    const son = [...liste].reverse().find((f) => f.kim === 'o')
    if (son) void baglanti.gonder({ tip: 'okundu', son: son.id })
  }, 700)
}

async function isle(m: Record<string, unknown>, ek?: Ek) {
  const karsi = baglanti.karsiAd
  if (m.tip === 'yaziyor') {
    if (!kur) return
    const y = panel.querySelector<HTMLElement>('.fs-yaziyor')!
    y.hidden = false
    window.clearTimeout(yaziyorZaman)
    yaziyorZaman = window.setTimeout(() => (y.hidden = true), 7000)
    return
  }
  if (m.tip === 'okundu') {
    const son = String(m.son ?? '')
    let degisti = false
    for (const f of liste) {
      if (f.kim === 'ben' && f.id <= son && f.durum !== 'okundu' && f.durum !== 'hata') {
        f.durum = 'okundu'
        degisti = true
        if (kur) guncelle(f)
      }
    }
    if (degisti) kaydet()
    return
  }
  // mesaj ya da ses: önce anahtar
  if (!anahtar) {
    bekleyenler.push({ m, ek })
    bildir({
      ust: 'Fısıltı',
      baslik: `${karsi} sana fısıldadı`,
      metin: 'Okumak için kelimenizi yaz. Dokun.',
      simge: '🔒',
      tik: fisiltiAc,
      sure: 12000,
    })
    return
  }
  // kimlik HTML'e girer: yalnızca harf ve rakam
  const id =
    String(m.id ?? '')
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 24) || yeniId()
  if (liste.some((f) => f.id === id && f.kim === 'o')) return
  let f: Fisilti
  if (m.tip === 'fisilti') {
    const icerik = await cozNesne<{ t: string }>(m.v)
    if (!icerik) return kelimeUyusmadi()
    f = { id, kim: 'o', t: icerik.t, zaman: Date.now() }
  } else {
    const bilgi = await cozNesne<{ sure: number; tur: string }>(m.v)
    if (!bilgi) return kelimeUyusmadi()
    // ses dosyası yalnızca ntfy'nin kendisinden indirilir
    if (!ek?.url || !ek.url.startsWith('https://ntfy.sh/')) return
    try {
      const veri = await cozBayt(new Uint8Array(await (await fetch(ek.url)).arrayBuffer()))
      if (!veri) return kelimeUyusmadi()
      sesler.set(id, new Blob([veri as BlobPart], { type: bilgi.tur }))
    } catch {
      return
    }
    f = { id, kim: 'o', ses: { sure: bilgi.sure }, zaman: Date.now() }
  }
  liste.push(f)
  kaydet()
  sirBul('fisilti')
  if (acik && !document.hidden) {
    ekle(f)
    isikUcur(false)
    ses.nota(86, 0.03)
    titret(10)
    panel.querySelector<HTMLElement>('.fs-yaziyor')!.hidden = true
    okunduGonder()
  } else {
    if (kur) ciz()
    okunmamis++
    rozetGuncelle()
    ses.bildirim()
    titret([20, 60, 20])
    const onizleme = f.ses ? '🎙️ Sesli fısıltı' : (f.t ?? '').length > 60 ? `${f.t!.slice(0, 60)}…` : (f.t ?? '')
    bildir({ ust: 'Fısıltı', baslik: `${karsi} fısıldadı`, metin: kacir(onizleme), simge: '💬', tik: fisiltiAc, sure: 12000 })
  }
}

let uyarildi = 0
function kelimeUyusmadi() {
  if (Date.now() - uyarildi < 60_000) return
  uyarildi = Date.now()
  bildir({
    ust: 'Fısıltı',
    baslik: 'Bir fısıltı açılamadı',
    metin: `${baglanti.karsiAd} başka bir kelimeyle fısıldamış. Kelimeniz aynı mı? Dokun, kontrol et.`,
    simge: '🔒',
    tik: () => {
      fisiltiAc()
      kilitGoster()
    },
    sure: 14000,
  })
}

/** nabizKur'dan sonra çağrılır: gelenleri dinler, "şu an burada" kutusundaki düğmeyi bağlar */
export function fisiltiKur() {
  const kelime = oku<string>(KELIME, '')
  if (kelime) void anahtarUret(kelime).then((a) => (anahtar = a))
  window.addEventListener('fisilti-gelen', (e) => {
    const { m, ek } = (e as CustomEvent<{ m: Record<string, unknown>; ek?: Ek }>).detail
    void isle(m, ek)
  })
  window.addEventListener('nabiz-durum', () => durumGuncelle())
  document.addEventListener('click', (e) => {
    if ((e.target as Element).closest('.nabiz-fisilti, .fisilti-ac')) fisiltiAc()
  })
  document.addEventListener('visibilitychange', () => !document.hidden && acik && okunduGonder())
}
