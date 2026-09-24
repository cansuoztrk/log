import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { ayEvresi, gokyuzu, onizleme, simdi } from '../cekirdek/zaman'
import { ayCiz } from '../cekirdek/ay-ciz'
import { gsap, titret } from '../bolumler/yardimci'
import { bildir } from './ust'

/**
 * Aynı anda — ikiniz de sitedeyken birbirinizi görür, birbirinize kalp atışı gönderirsiniz.
 * ntfy.sh üzerinden çalışır (sunucu gerekmez). Kimlik: Arda siteyi bir kez ?ben=arda ile açar.
 */
type Kim = 'eln' | 'arda'
interface Mesaj {
  tip: 'geldim' | 'buradayim' | 'gittim' | 'kalp' | 'ay'
  kim: Kim
  oturum: string
}

export function kimim(): Kim {
  const p = new URLSearchParams(location.search).get('ben')
  if (p === 'arda' || p === 'eln') {
    yaz('kim', p)
    return p
  }
  return oku<Kim>('kim', 'eln')
}

export function nabizKur(onKalp: () => void) {
  const konu = ICERIK.ruzgarPostasi.ntfyKonu
  if (!konu || onizleme || typeof EventSource === 'undefined') return
  const kanal = `${konu}-nabiz`
  const ben = kimim()
  const karsi: Kim = ben === 'eln' ? 'arda' : 'eln'
  const karsiAd = karsi === 'arda' ? ICERIK.ben.ad : ICERIK.sen.ad
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

  const gonder = (tip: Mesaj['tip']) => {
    const m: Mesaj = { tip, kim: ben, oturum }
    return fetch(`https://ntfy.sh/${encodeURIComponent(kanal)}`, { method: 'POST', body: JSON.stringify(m), keepalive: tip === 'gittim' }).catch(() => undefined)
  }

  const durumYaz = () => {
    const simdi = Date.now()
    const acik = simdi - sonGorulme < 7 * 60_000
    if (acik !== cevrimici) {
      cevrimici = acik
      el.classList.toggle('acik', acik)
      if (acik) {
        ses.bildirim()
        bildir({ ust: 'Aynı anda', baslik: `${karsiAd} şu an burada`, metin: 'İkimiz aynı sayfadayız. Köşedeki kalbe dokunursan kalbin ona ulaşır.', simge: '●' })
        sirBul('aynian')
      }
    }
  }

  // ─── dinle ───
  let kaynak: EventSource | null = null
  let hata = 0
  let yenidenZaman = 0
  const baglan = () => {
    kaynak?.close()
    window.clearTimeout(yenidenZaman)
    kaynak = new EventSource(`https://ntfy.sh/${encodeURIComponent(kanal)}/sse`)
    kaynak.onopen = () => (hata = 0)
    // bağlantı yoksa sonsuza dek denemesin: giderek seyrelen birkaç deneme
    kaynak.onerror = () => {
      kaynak?.close()
      if (++hata <= 5 && !document.hidden) yenidenZaman = window.setTimeout(baglan, 4000 * 2 ** hata)
    }
    kaynak.onmessage = (e) => {
      let m: Mesaj
      try {
        const zarf = JSON.parse(e.data)
        if (zarf.event && zarf.event !== 'message') return
        m = JSON.parse(zarf.message)
      } catch {
        return
      }
      if (m.kim === ben || m.oturum === oturum) return
      if (m.tip === 'gittim') {
        sonGorulme = 0
        durumYaz()
        return
      }
      const yeniGeldi = Date.now() - sonGorulme > 7 * 60_000
      sonGorulme = Date.now()
      durumYaz()
      if (m.tip === 'geldim' && yeniGeldi) void gonder('buradayim')
      if (m.tip === 'kalp') kalpGeldi()
      if (m.tip === 'ay') ayRandevusu(true)
    }
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
    baglan()
    void gonder('geldim')
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
