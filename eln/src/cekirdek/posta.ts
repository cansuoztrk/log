import { ICERIK } from '../icerik'
import { oku, yaz } from './depo'
import { onizleme } from './zaman'

/**
 * Siteden Arda'nın telefonuna giden her şey buradan geçer (ntfy.sh, sunucu gerekmez).
 * Kimlik: Arda siteyi kendi telefonunda bir kez ?ben=arda ile açar; o cihaz artık "arda"dır.
 */
export type Kim = 'eln' | 'arda'

export function kimim(): Kim {
  const p = new URLSearchParams(location.search).get('ben')
  if (p === 'arda' || p === 'eln') {
    yaz('kim', p)
    return p
  }
  return oku<Kim>('kim', 'eln')
}

/** Arda'nın telefonuna bildirim. Yalnızca Eln'in cihazından gider (önizlemede asla). */
export async function ardayaYaz(baslik: string, mesaj: string, etiketler: string[] = []) {
  const konu = ICERIK.ruzgarPostasi.ntfyKonu
  if (!konu || onizleme || kimim() !== 'eln') return false
  try {
    const r = await fetch('https://ntfy.sh/', {
      method: 'POST',
      body: JSON.stringify({ topic: konu, title: baslik, message: mesaj, tags: etiketler }),
    })
    return r.ok
  } catch {
    return false
  }
}

/**
 * Bir mesajı ne pahasına olursa olsun Arda'ya ulaştırır:
 * ntfy → WhatsApp → paylaş menüsü → panoya kopyala.
 */
export async function ulastir(baslik: string, metin: string, etiketler: string[] = []): Promise<'ntfy' | 'wa' | 'paylas' | 'kopya' | 'yok'> {
  const { ntfyKonu, whatsapp } = ICERIK.ruzgarPostasi
  if (ntfyKonu && !onizleme) {
    try {
      const r = await fetch('https://ntfy.sh/', {
        method: 'POST',
        body: JSON.stringify({ topic: ntfyKonu, title: baslik, message: metin, tags: etiketler }),
      })
      if (r.ok) return 'ntfy'
    } catch {
      /* aşağıdaki yollara düş */
    }
  }
  if (whatsapp) {
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(metin)}`, '_blank', 'noopener')
    return 'wa'
  }
  if (navigator.share) {
    try {
      await navigator.share({ text: metin })
      return 'paylas'
    } catch {
      /* kullanıcı vazgeçti */
    }
  }
  try {
    await navigator.clipboard.writeText(metin)
    return 'kopya'
  } catch {
    return 'yok'
  }
}
