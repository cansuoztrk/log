import * as SunCalc from 'suncalc'
import { ICERIK, type Kisi } from '../icerik'

export const GUN_MS = 86_400_000

/**
 * Önizleme: adres çubuğuna ?tarih=2026-12-06 (ya da ?tarih=2026-12-06T21:05) eklenirse
 * site o gün ve saatteymiş gibi davranır (saat verilmezse Bakü'de 21:05).
 * Özel günleri önceden görmek için.
 */
const ONIZLEME = (() => {
  try {
    const t = new URLSearchParams(location.search).get('tarih')
    if (!t) return 0
    const hedef = new Date(`${t.length <= 10 ? `${t}T21:05` : t}:00+04:00`).getTime()
    return Number.isFinite(hedef) ? hedef - Date.now() : 0
  } catch {
    return 0
  }
})()
/** Şu an (önizleme varsa kaydırılmış) */
export const simdi = () => new Date(Date.now() + ONIZLEME)
export const simdiMs = () => Date.now() + ONIZLEME
export const onizleme = ONIZLEME !== 0
const DERECE = Math.PI / 180 // derece → radyan

export interface Tarih {
  yil: number
  ay: number
  gun: number
  saat: number
  dakika: number
  saniye: number
}

const bicimleyiciler = new Map<string, Intl.DateTimeFormat>()
function bicim(tz: string) {
  let f = bicimleyiciler.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
    bicimleyiciler.set(tz, f)
  }
  return f
}

/** Verilen anı, bir saat dilimindeki takvim/saat parçalarına ayırır. */
export function yerel(an: Date, tz: string): Tarih {
  const p: Record<string, string> = {}
  for (const x of bicim(tz).formatToParts(an)) p[x.type] = x.value
  return { yil: +p.year, ay: +p.month, gun: +p.day, saat: +p.hour % 24, dakika: +p.minute, saniye: +p.second }
}

export function isoGun(t: { yil: number; ay: number; gun: number }) {
  return `${t.yil}-${String(t.ay).padStart(2, '0')}-${String(t.gun).padStart(2, '0')}`
}

function utcGun(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** İki takvim günü arasındaki gün farkı (b - a). */
export function gunFarki(a: string, b: string) {
  return Math.round((utcGun(b) - utcGun(a)) / GUN_MS)
}

export function gunEkle(iso: string, n: number) {
  const d = new Date(utcGun(iso) + n * GUN_MS)
  return isoGun({ yil: d.getUTCFullYear(), ay: d.getUTCMonth() + 1, gun: d.getUTCDate() })
}

export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
export const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

export function tarihYazi(iso: string, haftaGunu = false) {
  const [y, m, d] = iso.split('-').map(Number)
  const g = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return `${d} ${AYLAR[m - 1]} ${y}${haftaGunu ? `, ${GUNLER[g]}` : ''}`
}

export const iki = (n: number) => String(n).padStart(2, '0')
export const saatYazi = (an: Date, tz: string) => {
  const t = yerel(an, tz)
  return `${iki(t.saat)}:${iki(t.dakika)}`
}

/** Türkçe ek: "İstanbul’a / İstanbul’da", "Bakü’ye / Bakü’de" */
export function ek(s: string, tur: 'yonelme' | 'bulunma' | 'belirtme' | 'ilgi') {
  const unlu = 'aeıioöuü'
  const k = s.toLocaleLowerCase('tr-TR')
  const son = [...k].reverse().find((c) => unlu.includes(c)) ?? 'a'
  const kalin = 'aıou'.includes(son)
  const sonHarf = k.slice(-1)
  const unluyle = unlu.includes(sonHarf)
  if (tur === 'yonelme') return `${s}’${unluyle ? 'y' : ''}${kalin ? 'a' : 'e'}`
  // "Arda’yı / Eln’i", "Arda’nın / Eln’in" (dar ünlü uyumu)
  const dar = { a: 'ı', ı: 'ı', o: 'u', u: 'u', e: 'i', i: 'i', ö: 'ü', ü: 'ü' }[son] ?? 'ı'
  if (tur === 'belirtme') return `${s}’${unluyle ? 'y' : ''}${dar}`
  if (tur === 'ilgi') return `${s}’${unluyle ? 'n' : ''}${dar}n`
  return `${s}’${'çfhkpsşt'.includes(sonHarf) ? 't' : 'd'}${kalin ? 'a' : 'e'}`
}

/** 1234567 → "1.234.567" */
export const sayi = (n: number, basamak = 0) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: basamak, maximumFractionDigits: basamak })

export function sureYazi(dk: number) {
  const s = Math.floor(dk / 60)
  const d = Math.round(dk % 60)
  if (s === 0) return `${d} dakika`
  if (d === 0) return `${s} saat`
  return `${s} saat ${d} dakika`
}

/* ─── Mesafe ─────────────────────────────────────────────────────────────── */

export function mesafeKm(a: Kisi, b: Kisi) {
  const R = 6371.0088
  const dphi = (b.enlem - a.enlem) * DERECE
  const dl = (b.boylam - a.boylam) * DERECE
  const h = Math.sin(dphi / 2) ** 2 + Math.cos(a.enlem * DERECE) * Math.cos(b.enlem * DERECE) * Math.sin(dl / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
export const MESAFE = mesafeKm(ICERIK.ben, ICERIK.sen)

/** "Biz" olduğumuz an (sevgiliSaat İstanbul saatiyle verilir; İstanbul yıl boyu UTC+3) */
export const sevgiliAni = () => new Date(`${ICERIK.sevgili}T${ICERIK.sevgiliSaat || '00:00'}:00+03:00`)

/* ─── Güneş & Ay ─────────────────────────────────────────────────────────── */

/** Güneşin tam tepede olduğu nokta (enlem/boylam, derece). */
export function gunesAltiNokta(an: Date) {
  const d = an.getTime() / GUN_MS + 2440587.5 - 2451545.0
  const L = (280.46 + 0.9856474 * d) % 360
  const g = ((357.528 + 0.9856003 * d) % 360) * DERECE
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DERECE
  const eps = (23.439 - 0.0000004 * d) * DERECE
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda))
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda))
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24
  let lon = (ra / DERECE / 15 - gmst) * 15
  lon = ((((lon + 180) % 360) + 360) % 360) - 180
  return { enlem: dec / DERECE, boylam: lon }
}

/** O kişinin şehrindeki "bugün" öğlesi (gün doğumu hesapları için güvenli an). */
function yerelOgle(an: Date, k: Kisi) {
  const t = yerel(an, k.saatDilimi)
  const ofset = (Date.UTC(t.yil, t.ay - 1, t.gun, t.saat, t.dakika) - Math.floor(an.getTime() / 60000) * 60000) / 3600000
  return new Date(Date.UTC(t.yil, t.ay - 1, t.gun, 12) - ofset * 3600000)
}

export function gunesZamanlari(an: Date, k: Kisi) {
  const ogle = yerelOgle(an, k)
  const t = SunCalc.getTimes(ogle, k.enlem, k.boylam)
  // Bizim enlemlerimizde her gün doğum/batım var; yine de tip güvenliği için yedek
  const yedek = (saat: number) => new Date(ogle.getTime() + saat * 3600000)
  return {
    sunrise: t.sunrise ?? yedek(-6),
    sunset: t.sunset ?? yedek(6),
    dawn: t.dawn ?? yedek(-6.5),
    dusk: t.dusk ?? yedek(6.5),
    solarNoon: t.solarNoon ?? ogle,
  }
}

export function gokyuzu(an: Date, k: Kisi) {
  // suncalc v2: bütün açılar derece; azimut kuzeyden saat yönünde (0=K, 90=D)
  const gunes = SunCalc.getPosition(an, k.enlem, k.boylam)
  const ay = SunCalc.getMoonPosition(an, k.enlem, k.boylam)
  return {
    gunesYukseklik: gunes.altitude,
    gunesAzimut: gunes.azimuth,
    ayYukseklik: ay.altitude,
    ayAzimut: ay.azimuth,
    ayAci: ay.parallacticAngle,
  }
}

export function ayEvresi(an: Date) {
  const a = SunCalc.getMoonIllumination(an)
  const p = a.phase
  let ad = 'Yeni Ay'
  if (p < 0.03 || p > 0.97) ad = 'Yeni Ay'
  else if (p < 0.22) ad = 'Hilal'
  else if (p < 0.28) ad = 'İlk Dördün'
  else if (p < 0.47) ad = 'Şişkin Ay'
  else if (p < 0.53) ad = 'Dolunay'
  else if (p < 0.72) ad = 'Şişkin Ay'
  else if (p < 0.78) ad = 'Son Dördün'
  else ad = 'Hilal'
  const buyuyen = p < 0.5
  // bir sonraki dolunaya kalan gün
  const dolunayaGun = ((0.5 - p + 1) % 1) * 29.53
  return { oran: a.fraction, evre: p, aci: a.angle, ad, buyuyen, dolunayaGun }
}

/** İki tarih arasında kaç dolunay yaşandı? */
export function dolunaySayisi(bas: Date, son: Date) {
  let n = 0
  let onceki = SunCalc.getMoonIllumination(bas).phase
  for (let t = bas.getTime() + GUN_MS / 4; t <= son.getTime(); t += GUN_MS / 4) {
    const p = SunCalc.getMoonIllumination(new Date(t)).phase
    if (onceki < 0.5 && p >= 0.5) n++
    onceki = p
  }
  return n
}

export type Vakit = 'safak' | 'gunduz' | 'aksam' | 'gece'

export function vakit(an: Date, k: Kisi): Vakit {
  const g = gokyuzu(an, k)
  const t = yerel(an, k.saatDilimi)
  if (g.gunesYukseklik > 8) return 'gunduz'
  if (g.gunesYukseklik > -8) return t.saat < 12 ? 'safak' : 'aksam'
  return 'gece'
}

/* ─── Bizim sayılarımız ─────────────────────────────────────────────────── */

export function anlik(an = simdi()) {
  const { ben, sen } = ICERIK
  const bakuT = yerel(an, sen.saatDilimi)
  const istT = yerel(an, ben.saatDilimi)
  const bugun = isoGun(bakuT)
  const tanisalGun = gunFarki(ICERIK.tanisma, bugun)
  const sevgiliGun = gunFarki(ICERIK.sevgili, bugun)
  const zBaku = gunesZamanlari(an, sen)
  const zIst = gunesZamanlari(an, ben)
  // Işığın yolculuğu: Bakü'de doğduktan kaç dakika sonra İstanbul'da doğuyor
  const isikDk = (zIst.sunrise.getTime() - zBaku.sunrise.getTime()) / 60000
  const saatFarki = (Date.UTC(bakuT.yil, bakuT.ay - 1, bakuT.gun, bakuT.saat, bakuT.dakika) -
    Date.UTC(istT.yil, istT.ay - 1, istT.gun, istT.saat, istT.dakika)) / 3600000
  return {
    an,
    bugun,
    bakuT,
    istT,
    tanisalGun,
    gunNo: tanisalGun + 1,
    sevgiliGun,
    zBaku,
    zIst,
    isikDk,
    saatFarki,
    vakit: vakit(an, sen),
  }
}
export type Anlik = ReturnType<typeof anlik>
