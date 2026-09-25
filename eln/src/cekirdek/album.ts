import { oku, yaz } from './depo'

/**
 * ŞİFRELİ ALBÜM — fotoğraflarımız ve yazışmalarımız public/album/ içinde şifreli durur.
 * İkimizin bildiği kelimeyle bir kez açılır; telefon kelimeyi hatırlar.
 * Anahtar türetme scripts/album.mjs ile birebir aynıdır.
 */

export interface Mesaj {
  k: 'a' | 'e' // a: Arda, e: Eln
  t: string
  y?: string // yanıtladığı mesaj
  yildiz?: boolean
  buyuk?: boolean // tek başına emoji
}
export interface Sohbet {
  id: string
  baslik: string
  mesajlar: Mesaj[]
  son?: string
}
export interface Foto {
  id: string
  not?: string
  alt?: string
}
export interface Yildiz {
  kaynak: 'yildiz' | 'ekran' | 'yok'
  metin: string
}
export interface Iz {
  id: string
  baslik: string
  not: string
  tarih?: string
}
export type Kucuk =
  | { tip: 'sarki'; sarki: string; sanatci: string; bildirim: string; not: string }
  | { tip: 'not'; metin: string; imza: string; not: string }
  | { tip: 'foto'; id: string; not: string }
export interface Album {
  v: number
  sohbetler: Sohbet[]
  fotolar: Foto[]
  yildizlar: Yildiz[]
  izler: Iz[]
  kucukler: Kucuk[]
  /** Arda'nın sesli mesajı (mektubun altında çalar) */
  ses?: { id: string; not?: string }
  dosyalar: Record<string, { dosya: string; tur: string; en?: number; boy?: number }>
}

const TUZ = 'once-sana-dogar:album:v1'
const TUR = 300_000
const KELIME = 'albumKelime'

export const temizle = (k: string) =>
  k
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüə]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', ə: 'e' })[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')

const yol = (ad: string) => new URL(`album/${ad}`, document.baseURI).href

let anahtar: CryptoKey | null = null
let icerik: Album | null = null
let yukleniyor: Promise<Album | null> | null = null
const urller = new Map<string, Promise<string | null>>()

async function anahtarUret(kelime: string) {
  const ham = await crypto.subtle.importKey('raw', new TextEncoder().encode(temizle(kelime)), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(TUZ), iterations: TUR }, ham, { name: 'AES-GCM', length: 256 }, false, [
    'decrypt',
  ])
}

async function getir(ad: string) {
  const r = await fetch(yol(ad), { cache: 'force-cache' })
  if (!r.ok) throw new Error(String(r.status))
  return new Uint8Array(await r.arrayBuffer())
}

async function coz(a: CryptoKey, veri: Uint8Array<ArrayBuffer>) {
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: veri.subarray(0, 12) }, a, veri.subarray(12)))
}

/** Albüm açık mı (bu oturumda çözüldü mü) */
export const albumAcik = () => !!icerik
export const albumIcerik = () => icerik
/** Bu telefonda daha önce doğru kelime yazılmış mı */
export const kelimeKayitli = () => !!oku<string>(KELIME, '')

/** Kelimeyle albümü açmayı dener; doğruysa kelimeyi hatırlar ve herkese haber verir */
export async function albumAc(kelime: string): Promise<'tamam' | 'yanlis' | 'hata'> {
  try {
    const a = await anahtarUret(kelime)
    const veri = await getir('icerik.bin')
    let ham: Uint8Array
    try {
      ham = await coz(a, veri)
    } catch {
      return 'yanlis'
    }
    anahtar = a
    icerik = JSON.parse(new TextDecoder().decode(ham)) as Album
    yaz(KELIME, temizle(kelime))
    window.dispatchEvent(new CustomEvent('album-acildi', { detail: icerik }))
    return 'tamam'
  } catch {
    return 'hata'
  }
}

/** Telefon kelimeyi hatırlıyorsa sessizce açar (sayfa açılışında bir kez) */
export function albumOtomatik() {
  const k = oku<string>(KELIME, '')
  if (!k || icerik) return Promise.resolve(icerik)
  yukleniyor ??= albumAc(k).then((s) => {
    if (s === 'yanlis') yaz(KELIME, '') // kelime değişmiş: yeniden sorulsun
    return icerik
  })
  return yukleniyor
}

/** Şifreli bir dosyayı çözüp tarayıcıda gösterilebilir bir adrese çevirir (bir kez) */
export function dosyaUrl(id: string): Promise<string | null> {
  const k = icerik?.dosyalar[id]
  if (!k || !anahtar) return Promise.resolve(null)
  let p = urller.get(id)
  if (!p) {
    const a = anahtar
    p = getir(k.dosya)
      .then((v) => coz(a, v))
      .then((b) => URL.createObjectURL(new Blob([b as BlobPart], { type: k.tur })))
      .catch(() => {
        urller.delete(id)
        return null
      })
    urller.set(id, p)
  }
  return p
}

export const dosyaOlcu = (id: string) => icerik?.dosyalar[id]
