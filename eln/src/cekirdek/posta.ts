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

/** Arda'nın telefonuna resimli bildirim (ntfy eki). Başlık/mesaj Türkçe karakterli olduğu için adreste gider. */
export async function ardayaResim(resim: Blob, dosyaAdi: string, baslik: string, mesaj: string, etiketler: string[] = []) {
  const konu = ICERIK.ruzgarPostasi.ntfyKonu
  if (!konu || onizleme || kimim() !== 'eln') return false
  const q = new URLSearchParams({ filename: dosyaAdi, title: baslik, message: mesaj, tags: etiketler.join(',') })
  try {
    const r = await fetch(`https://ntfy.sh/${konu}?${q}`, { method: 'PUT', body: resim })
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

/* ─── Ters yön: Arda'dan Eln'e ───────────────────────────────────────────── */
// Arda'nın sitede yazdığı notlar ayrı bir konuya gider; Eln'in sitesi açılınca oradan alır.
// ntfy.sh mesajları 12 saat saklar: Eln o süre içinde siteyi açarsa not ona ulaşır.
export interface Gelen {
  id: string
  zaman: number
  metin: string
  soru?: string
  okundu?: boolean
}

const elnKutusu = () => `${ICERIK.ruzgarPostasi.ntfyKonu}-eln`

export async function elneYaz(metin: string, soru = '') {
  if (!ICERIK.ruzgarPostasi.ntfyKonu || onizleme || kimim() !== 'arda') return false
  try {
    const r = await fetch('https://ntfy.sh/', {
      method: 'POST',
      body: JSON.stringify({ topic: elnKutusu(), title: ICERIK.ben.ad, message: JSON.stringify({ m: metin, s: soru }) }),
    })
    return r.ok
  } catch {
    return false
  }
}

/** Son 12 saatte Arda'nın bıraktığı notlar */
export async function gelenleriAl(): Promise<Gelen[]> {
  if (!ICERIK.ruzgarPostasi.ntfyKonu || onizleme) return []
  try {
    const r = await fetch(`https://ntfy.sh/${encodeURIComponent(elnKutusu())}/json?poll=1&since=12h`)
    if (!r.ok) return []
    const liste: Gelen[] = []
    for (const satir of (await r.text()).split('\n')) {
      if (!satir.trim()) continue
      try {
        const m = JSON.parse(satir) as { id: string; time: number; event: string; message?: string }
        if (m.event !== 'message' || !m.message) continue
        let govde: { m?: string; s?: string } = {}
        try {
          govde = JSON.parse(m.message)
        } catch {
          govde = { m: m.message }
        }
        if (govde.m) liste.push({ id: m.id, zaman: m.time * 1000, metin: govde.m, soru: govde.s || undefined })
      } catch {
        /* bozuk satır */
      }
    }
    return liste
  } catch {
    return []
  }
}
