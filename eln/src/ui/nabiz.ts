import { ICERIK } from '../icerik'
import { type Kim, kimim } from '../cekirdek/posta'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { ayEvresi, gokyuzu, onizleme, simdi } from '../cekirdek/zaman'
import { ayCiz } from '../cekirdek/ay-ciz'
import { gsap, titret } from '../bolumler/yardimci'
import { bildir } from './ust'
import { banaHitap } from '../bolumler/ruzgar'

/**
 * Aynı anda — ikiniz de sitedeyken birbirinizi görür, birbirinize kalp atışı gönderirsiniz.
 * ntfy.sh üzerinden çalışır (sunucu gerekmez). Kimlik: Arda siteyi bir kez ?ben=arda ile açar.
 */
interface Mesaj {
  tip: 'geldim' | 'buradayim' | 'gittim' | 'kalp' | 'ay' | 'opucuk' | 'tut' | 'birak' | 'not' | 'fisilti' | 'ses' | 'okundu' | 'yaziyor' | 'dokun'
  kim: Kim
  oturum: string
  [ek: string]: unknown
}

/** ntfy'nin bir mesaja eklediği dosya bilgisi (sesli fısıltılar için) */
export interface Ek {
  url: string
  type?: string
  size?: number
}

/**
 * Fısıltı (ui/fisilti.ts) bu bağlantıyı kullanır: ikimiz de sitedeyken mesaj, ses, okundu, yazıyor.
 * nabizKur çalışınca doldurulur.
 */
export const baglanti = {
  hazir: false,
  karsiAd: '',
  cevrimici: () => false,
  /** Önbelleğe alınmadan (sunucuda saklanmadan) gönderir */
  gonder: async (_veri: Record<string, unknown>) => false,
  /** Dosyalı gönderim (ses): ntfy dosyayı ancak mesajı önbellekte tutarsa verir, o yüzden önbellekli */
  dosyaGonder: async (_veri: Record<string, unknown>, _dosya: Blob) => false,
}

export function nabizKur(onKalp: () => void) {
  const konu = ICERIK.ruzgarPostasi.ntfyKonu
  if (!konu || onizleme || typeof EventSource === 'undefined') return
  const kanal = `${konu}-nabiz`
  const ben = kimim()
  const karsi: Kim = ben === 'eln' ? 'arda' : 'eln'
  // Onun ekranında ben "Posi", "Mosi"… olarak görünürüm; benim ekranımda o "Eln"
  const karsiAd = karsi === 'arda' ? banaHitap() : ICERIK.sen.ad
  const oturum = Math.random().toString(36).slice(2, 10)
  let sonGorulme = 0
  let cevrimici = false

  // ─── arayüz ───
  const el = document.createElement('div')
  el.className = 'nabiz'
  el.setAttribute('aria-live', 'polite')
  el.innerHTML = /* html */ `
    <span class="nabiz-nokta" aria-hidden="true"></span>
    <span class="nabiz-yazi"><b>${karsiAd}</b> şu an burada</span>
    <button class="nabiz-fisilti" type="button" aria-label="${karsiAd}’a fısılda"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5z"/></svg><span class="rozet-sayi" hidden>0</span></button>
    <button class="nabiz-ay" type="button" aria-label="Aynı anda aya bakalım" hidden>☾</button>
    <button class="nabiz-kalp" type="button" aria-label="${karsiAd}’a kalp atışı gönder"><svg viewBox="0 0 24 24"><use href="#i-kalp"/></svg></button>`
  document.body.appendChild(el)
  const kalpDugme = el.querySelector<HTMLButtonElement>('.nabiz-kalp')!
  const ayDugme = el.querySelector<HTMLButtonElement>('.nabiz-ay')!
  // Ay iki şehirde de gökyüzündeyse "aya bakalım" düğmesi görünür
  const ayVarMi = () => {
    const an = simdi()
    return gokyuzu(an, ICERIK.ben).ayYukseklik > 2 && gokyuzu(an, ICERIK.sen).ayYukseklik > 2
  }
  const ayDugmesi = () => (ayDugme.hidden = !ayVarMi())
  ayDugmesi()
  window.setInterval(ayDugmesi, 60_000)

  // Nabız mesajları anlıktır: sunucuda saklanmasına gerek yok (cache=no)
  const adres = `https://ntfy.sh/${encodeURIComponent(kanal)}`
  const gonder = (tip: Mesaj['tip']) => {
    const m: Mesaj = { tip, kim: ben, oturum }
    return fetch(`${adres}?cache=no`, { method: 'POST', body: JSON.stringify(m), keepalive: tip === 'gittim' }).catch(() => undefined)
  }
  baglanti.karsiAd = karsiAd
  baglanti.cevrimici = () => cevrimici
  baglanti.gonder = async (veri) => {
    try {
      const r = await fetch(`${adres}?cache=no`, { method: 'POST', body: JSON.stringify({ ...veri, kim: ben, oturum }) })
      return r.ok
    } catch {
      return false
    }
  }
  baglanti.dosyaGonder = async (veri, dosya) => {
    try {
      const ust = encodeURIComponent(JSON.stringify({ ...veri, kim: ben, oturum }))
      const r = await fetch(`${adres}?filename=f.bin&message=${ust}`, { method: 'PUT', body: dosya })
      return r.ok
    } catch {
      return false
    }
  }
  baglanti.hazir = true

  // Sayfanın altına başka bir şey (ör. barındırma sağlayıcısının rozeti) yerleşip kalbi örtüyorsa
  // kutu kendiliğinden yukarı kayar; o şey kalkınca yerine döner.
  const ortuluyorMu = () => {
    if (!cevrimici) return
    // yukarıdaysa, geçiş animasyonu olmadan bir anlığına aşağıda ölç (aynı karede; göz görmez)
    const yukarida = el.classList.contains('yukari')
    if (yukarida) {
      el.style.transition = 'none'
      el.classList.remove('yukari')
    }
    const r = kalpDugme.getBoundingClientRect()
    const ustteki = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    el.classList.toggle('yukari', !!ustteki && !el.contains(ustteki))
    if (yukarida) {
      void el.offsetWidth
      el.style.transition = ''
    }
  }
  window.setInterval(ortuluyorMu, 3000)
  window.addEventListener('resize', ortuluyorMu)

  const durumYaz = () => {
    const simdi = Date.now()
    const acik = simdi - sonGorulme < 7 * 60_000
    if (acik !== cevrimici) {
      cevrimici = acik
      el.classList.toggle('acik', acik)
      window.dispatchEvent(new CustomEvent('nabiz-durum', { detail: acik }))
      if (acik) window.setTimeout(ortuluyorMu, 900) // giriş animasyonu bitince bak
      if (acik) {
        ses.bildirim()
        bildir({ ust: 'Aynı anda', baslik: `${karsiAd} şu an burada`, metin: 'İkimiz aynı sayfadayız. Köşedeki kalbe dokunursan kalbin ona ulaşır.', simge: '●' })
        sirBul('aynian')
      }
    }
  }

  // ─── dinle ───
  let kaynak: EventSource | null = null
  let geldimBekliyor = false
  let hata = 0
  let yenidenZaman = 0
  const baglan = () => {
    kaynak?.close()
    window.clearTimeout(yenidenZaman)
    kaynak = new EventSource(`https://ntfy.sh/${encodeURIComponent(kanal)}/sse`)
    // "geldim" ancak dinlemeye başladıktan sonra gider; yoksa karşının "buradayım" cevabı kaçabilir
    kaynak.onopen = () => {
      hata = 0
      if (geldimBekliyor) {
        geldimBekliyor = false
        void gonder('geldim')
      }
    }
    // bağlantı yoksa sonsuza dek denemesin: giderek seyrelen birkaç deneme
    kaynak.onerror = () => {
      kaynak?.close()
      if (++hata <= 5 && !document.hidden) yenidenZaman = window.setTimeout(baglan, 4000 * 2 ** hata)
    }
    kaynak.onmessage = (e) => {
      let m: Mesaj
      let ek: Ek | undefined
      try {
        const zarf = JSON.parse(e.data)
        if (zarf.event && zarf.event !== 'message') return
        m = JSON.parse(zarf.message)
        ek = zarf.attachment
      } catch {
        return
      }
      if (m.kim === ben || m.oturum === oturum) return
      // fısıltılar ayrı modülde işlenir (ama karşı tarafın burada olduğunu da gösterirler)
      if (m.tip === 'fisilti' || m.tip === 'ses' || m.tip === 'okundu' || m.tip === 'yaziyor') {
        sonGorulme = Date.now()
        durumYaz()
        window.dispatchEvent(new CustomEvent('fisilti-gelen', { detail: { m, ek } }))
        return
      }
      if (m.tip === 'gittim') {
        sonGorulme = 0
        durumYaz()
        karsiKalp(false)
        return
      }
      const yeniGeldi = Date.now() - sonGorulme > 7 * 60_000
      sonGorulme = Date.now()
      durumYaz()
      if (m.tip === 'geldim' && yeniGeldi) void gonder('buradayim')
      if (m.tip === 'kalp') kalpGeldi()
      if (m.tip === 'ay') ayRandevusu(true)
      if (m.tip === 'opucuk') opucukGeldi()
      if (m.tip === 'tut') karsiKalp(true)
      if (m.tip === 'not') window.dispatchEvent(new Event('gelen-kontrol'))
      if (m.tip === 'birak') karsiKalp(false)
      // Parmak Uçları: karşının dokunduğu yer
      if (m.tip === 'dokun') window.dispatchEvent(new CustomEvent('dokunus-gelen', { detail: { x: m.x, y: m.y } }))
    }
  }

  // Arda rüzgâra not bıraktıysa ve Eln şu an sitedeyse, onun sayfası notu hemen alsın
  window.addEventListener('not-gonderildi', () => {
    if (cevrimici) void gonder('not')
  })

  // ─── sondaki kalbe aynı anda dokunmak ───
  // final bölümü 'kalp-tut' yayınlar; karşı tarafın durumu 'karsi-kalp' olarak geri gelir
  let tutuyorum = false
  window.addEventListener('kalp-tut', (e) => {
    const t = (e as CustomEvent<boolean>).detail
    if (t === tutuyorum) return
    tutuyorum = t
    if (cevrimici) void gonder(t ? 'tut' : 'birak')
  })
  let karsiZaman = 0
  const karsiKalp = (t: boolean) => {
    window.clearTimeout(karsiZaman)
    window.dispatchEvent(new CustomEvent('karsi-kalp', { detail: t }))
    // "bıraktım" mesajı kaybolursa sonsuza dek tutuyor görünmesin
    if (t) karsiZaman = window.setTimeout(() => karsiKalp(false), 30_000)
  }

  const kalpGeldi = () => {
    onKalp()
    ses.kalp(1)
    window.setTimeout(() => ses.kalp(0.8), 900)
    titret([60, 120, 40, 400, 60, 120, 40])
    const k = document.createElement('div')
    k.className = 'gelen-kalp'
    k.innerHTML = `<svg viewBox="0 0 24 24"><use href="#i-kalp"/></svg><p><b>${karsiAd}</b> sana kalp atışını gönderdi</p>`
    document.body.appendChild(k)
    gsap
      .timeline({ onComplete: () => k.remove() })
      .from(k, { autoAlpha: 0, duration: 0.4 })
      .fromTo(k.querySelector('svg'), { scale: 0.4 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' }, 0)
      .to(k.querySelector('svg'), { scale: 1.15, duration: 0.18, yoyo: true, repeat: 5, ease: 'power1.inOut' })
      .to(k, { autoAlpha: 0, duration: 0.8, delay: 0.8 })
  }

  // ─── öpücük (sayfanın sonundaki "Öptüm") ───
  window.addEventListener('opucuk-gonder', () => {
    if (cevrimici) void gonder('opucuk')
  })
  const opucukGeldi = () => {
    ses.opucuk()
    titret([20, 60, 30])
    const k = document.createElement('div')
    k.className = 'gelen-kalp'
    k.innerHTML = `<span class="gelen-opucuk">💋</span><p><b>${karsiAd}</b>: öptüm</p>`
    document.body.appendChild(k)
    gsap
      .timeline({ onComplete: () => k.remove() })
      .from(k, { autoAlpha: 0, duration: 0.35 })
      .fromTo(k.querySelector('.gelen-opucuk'), { scale: 0.3, rotate: -20 }, { scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(3)' }, 0)
      .to(k, { autoAlpha: 0, duration: 0.8, delay: 1.6 })
  }

  // ─── aynı anda aya bakmak ───
  const ayRandevusu = (gelen: boolean) => {
    document.querySelector('.ay-randevu')?.remove()
    const k = document.createElement('div')
    k.className = 'ay-randevu'
    k.innerHTML = /* html */ `
      <canvas width="360" height="360" aria-hidden="true"></canvas>
      <p class="etiket">${gelen ? `${karsiAd} seni aya çağırıyor` : 'Aynı anda'}</p>
      <p class="satir">Şimdi pencereden aya bak.<br/><em>${karsiAd} de şu an bakıyor.</em></p>
      <p class="dipnot">Ay bu gece %${Math.round(ayEvresi(simdi()).oran * 100)} dolu. Aynı ay, iki pencere, aynı dakika.</p>
      <button class="dugme hayalet" type="button">Baktım ☾</button>`
    document.body.appendChild(k)
    ayCiz(k.querySelector('canvas')!.getContext('2d')!, 180, 180, 120, ayEvresi(simdi()).evre)
    ses.cin()
    titret([30, 100, 30])
    const kapat = () => gsap.to(k, { autoAlpha: 0, duration: 0.8, onComplete: () => k.remove() })
    k.querySelector('button')!.addEventListener('click', kapat)
    window.setTimeout(kapat, 60_000)
    gsap.from(k, { autoAlpha: 0, duration: 1 })
    gsap.from(k.querySelector('canvas'), { scale: 0.6, duration: 2.4, ease: 'expo.out' })
  }
  ayDugme.addEventListener('click', () => {
    void gonder('ay')
    ayRandevusu(false)
  })

  kalpDugme.addEventListener('click', () => {
    void gonder('kalp')
    ses.kalp(0.7)
    titret(30)
    kalpDugme.classList.remove('gitti')
    void kalpDugme.offsetWidth
    kalpDugme.classList.add('gitti')
  })

  // ─── yaşam döngüsü ───
  const basla = () => {
    geldimBekliyor = true
    baglan()
  }
  basla()
  // 4 dakikada bir "hâlâ buradayım" (ntfy'yi yormadan)
  window.setInterval(() => {
    if (!document.hidden) void gonder('buradayim')
    durumYaz()
  }, 4 * 60_000)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      void gonder('gittim')
      kaynak?.close()
    } else basla()
  })
  window.addEventListener('pagehide', () => void gonder('gittim'))
}
