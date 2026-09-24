import { onizleme } from './zaman'

/** localStorage'a güvenli erişim. Gizli sekmede ya da kapalıysa sessizce bellekte tutar. */
const ONEK = 'osd:'
const bellek = new Map<string, string>()

export function oku<T>(anahtar: string, varsayilan: T): T {
  const b = bellek.get(anahtar)
  if (b != null) return JSON.parse(b) as T
  try {
    const v = localStorage.getItem(ONEK + anahtar)
    if (v != null) return JSON.parse(v) as T
  } catch {
    /* depolama kapalı: varsayılan */
  }
  return varsayilan
}

export function yaz<T>(anahtar: string, deger: T) {
  const s = JSON.stringify(deger)
  bellek.set(anahtar, s)
  if (onizleme) return // ?tarih= önizlemesi gerçek kayıtları bozmasın
  try {
    localStorage.setItem(ONEK + anahtar, s)
  } catch {
    /* depolama yoksa bellekte kalsın */
  }
}

/* ─── Ziyaretler ─────────────────────────────────────────────────────────── */

export interface Ziyaret {
  gunler: string[] // ziyaret edilen farklı günler (Bakü takvimi)
  toplam: number // toplam açılış
  ilk: string | null
}

/** Her farklı ziyaret günü, Arda'yı Eln'e 21 km yaklaştırır (21 Mayıs'ın 21'i). */
export const ADIM_KM = 21

export function ziyaretKaydet(bugun: string): Ziyaret & { yeniGun: boolean } {
  const z = oku<Ziyaret>('ziyaret', { gunler: [], toplam: 0, ilk: null })
  const yeniGun = !z.gunler.includes(bugun)
  if (yeniGun) z.gunler.push(bugun)
  z.toplam++
  z.ilk ??= bugun
  yaz('ziyaret', z)
  return { ...z, yeniGun }
}
