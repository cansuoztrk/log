import { oku, yaz, type Ziyaret } from '../cekirdek/depo'
import { kimim } from '../cekirdek/posta'
import { onizleme } from '../cekirdek/zaman'
import { bildir } from './ust'

/**
 * Site, telefonda ana ekrana eklenince bir uygulama gibi açılır ve internet yokken de çalışır.
 * İkinci gelişinden itibaren Eln'e bir kez "ana ekrana ekle" önerilir.
 */
export function uygulamaKur(ziyaret: Ziyaret) {
  if (import.meta.env.PROD && 'serviceWorker' in navigator && !onizleme) {
    const kaydet = () => void navigator.serviceWorker.register('./sw.js').catch(() => undefined)
    if (document.readyState === 'complete') kaydet()
    else window.addEventListener('load', kaydet)
  }

  const nav = navigator as Navigator & { standalone?: boolean }
  const uygulamada = matchMedia('(display-mode: standalone)').matches || nav.standalone === true
  const telefon = matchMedia('(pointer: coarse)').matches
  if (uygulamada || !telefon || kimim() !== 'eln' || onizleme) return
  if (ziyaret.gunler.length < 2 || oku<boolean>('anaEkranOnerildi', false)) return

  // Android/Chrome: tarayıcının kendi "yükle" penceresi
  let istem: (Event & { prompt: () => Promise<void> }) | null = null
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    istem = e as typeof istem
  })

  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  window.setTimeout(() => {
    yaz('anaEkranOnerildi', true)
    bildir({
      ust: 'Küçük bir öneri',
      baslik: 'Beni ana ekranına ekle',
      metin: ios
        ? 'Safari’de alttaki Paylaş düğmesine (□↑) dokun, sonra “Ana Ekrana Ekle”. Bir uygulama gibi açılır; internet yokken bile.'
        : istem
          ? 'Buna dokun; bir uygulama gibi açılır, internet yokken bile.'
          : 'Tarayıcının menüsünden (⋮) “Ana ekrana ekle”yi seç. Bir uygulama gibi açılır; internet yokken bile.',
      simge: '📱',
      sure: 14000,
      tik: () => void istem?.prompt().catch(() => undefined),
    })
  }, 9000)
}
