import { ICERIK } from '../icerik'
import { oku, yaz } from './depo'
import { kimim } from './posta'
import { onizleme } from './zaman'

/**
 * ORTAK DURUM — iki telefonun da bilmesi gereken küçük şeyler (yıldızımız, "İkimizden hangisi?"
 * cevapları…). Her anahtar son yazanın değeriyle kalır.
 *
 * Nasıl ulaşır: her cihaz kendi durumunun tamamını ntfy'de "-ortak" konusuna bırakır (12 saat saklanır);
 * site açılınca öbürünün son 12 saatteki kaydı okunur. İkimiz aynı anda sitedeysek nabız bağlantısıyla
 * anında da gider. Siteyi en az 12 saatte bir açan iki kişi için yeterince güvenilir.
 */
interface Kayit {
  d: unknown
  z: number
}
type Durum = Record<string, Kayit>

const DEPO = 'ortakDurum'
const kanal = () => `${ICERIK.ruzgarPostasi.ntfyKonu}-ortak`
const durum = (): Durum => oku<Durum>(DEPO, {})

export const ortakHepsi = durum

export function ortakOku<T>(anahtar: string, varsayilan: T): T {
  const k = durum()[anahtar]
  return k ? (k.d as T) : varsayilan
}

/** Karşıdan gelen durumu birleştirir; değişen anahtarları duyurur */
export function ortakBirlestir(gelen: unknown) {
  if (!gelen || typeof gelen !== 'object') return
  const d = durum()
  const degisen: string[] = []
  for (const [a, k] of Object.entries(gelen as Durum)) {
    if (!k || typeof k !== 'object' || typeof k.z !== 'number') continue
    if (!d[a] || k.z > d[a].z) {
      d[a] = { d: k.d, z: k.z }
      degisen.push(a)
    }
  }
  if (!degisen.length) return
  yaz(DEPO, d)
  window.dispatchEvent(new CustomEvent('ortak-degisti', { detail: degisen }))
}

/**
 * ntfy bir mesajda en fazla 4 KB kabul eder (fazlası dosyaya dönüşür). Durum büyürse
 * anahtarları birkaç mesaja bölerek gönderiyoruz; alan taraf her birini ayrı birleştirir.
 */
export function ortakParcala(d: Durum, sinir = 3300): Durum[] {
  const parcalar: Durum[] = []
  let p: Durum = {}
  let boy = 0
  for (const [a, k] of Object.entries(d)) {
    const b = new TextEncoder().encode(JSON.stringify({ [a]: k })).length
    if (boy && boy + b > sinir) {
      parcalar.push(p)
      p = {}
      boy = 0
    }
    p[a] = k
    boy += b
  }
  if (boy) parcalar.push(p)
  return parcalar
}

let yayinZaman = 0
/** Kendi durumunu yayınlar (arka arkaya değişiklikler tek mesajda) */
function yayinla(gecikme = 1500) {
  window.clearTimeout(yayinZaman)
  yayinZaman = window.setTimeout(async () => {
    const d = durum()
    // nabız bağlantısı açıksa karşı taraf hemen alsın
    window.dispatchEvent(new CustomEvent('ortak-yayin', { detail: d }))
    if (!ICERIK.ruzgarPostasi.ntfyKonu || onizleme) return
    try {
      for (const p of ortakParcala(d)) await fetch(`https://ntfy.sh/${encodeURIComponent(kanal())}`, { method: 'POST', body: JSON.stringify({ kim: kimim(), d: p }) })
      yaz('ortakYayin', Date.now())
    } catch {
      /* bir dahaki açılışta yine denenir */
    }
  }, gecikme)
}

export function ortakYaz(anahtar: string, deger: unknown) {
  const d = durum()
  d[anahtar] = { d: deger, z: Date.now() }
  yaz(DEPO, d)
  window.dispatchEvent(new CustomEvent('ortak-degisti', { detail: [anahtar] }))
  yayinla()
}

/** Site açılınca: karşının son kaydını al, kendi kaydını tazele (en fazla 6 saatte bir) */
export async function ortakKur() {
  if (!ICERIK.ruzgarPostasi.ntfyKonu || onizleme) return
  const ben = kimim()
  try {
    const r = await fetch(`https://ntfy.sh/${encodeURIComponent(kanal())}/json?poll=1&since=12h`)
    if (r.ok) {
      for (const satir of (await r.text()).split('\n')) {
        if (!satir.trim()) continue
        try {
          const m = JSON.parse(satir) as { event: string; message?: string }
          if (m.event !== 'message' || !m.message) continue
          const g = JSON.parse(m.message) as { kim?: string; d?: unknown }
          if (g.kim && g.kim !== ben) ortakBirlestir(g.d)
        } catch {
          /* bozuk satır */
        }
      }
    }
  } catch {
    /* bağlantı yok */
  }
  if (Object.keys(durum()).length && Date.now() - oku<number>('ortakYayin', 0) > 6 * 3_600_000) yayinla(0)
}
