import type { Kisi } from '../icerik'

/**
 * Gerçek hava durumu — Open-Meteo (ücretsiz, anahtar gerektirmez).
 * Bağlantı yoksa sessizce null döner; site hava durumsuz da eksiksiz çalışır.
 */
export type HavaTur = 'acik' | 'bulutlu' | 'sisli' | 'yagmur' | 'kar' | 'firtina'

export interface Hava {
  sicaklik: number
  kod: number
  ruzgar: number
  bulut: number
  tur: HavaTur
  ad: string
}

function cozumle(kod: number, bulut: number): { tur: HavaTur; ad: string } {
  if (kod >= 95) return { tur: 'firtina', ad: 'Gök gürültülü' }
  if ((kod >= 71 && kod <= 77) || kod === 85 || kod === 86) return { tur: 'kar', ad: 'Karlı' }
  if ((kod >= 51 && kod <= 67) || (kod >= 80 && kod <= 82)) return { tur: 'yagmur', ad: kod <= 57 ? 'Çiseliyor' : kod >= 80 ? 'Sağanak' : 'Yağmurlu' }
  if (kod === 45 || kod === 48) return { tur: 'sisli', ad: 'Sisli' }
  if (kod === 3 || bulut > 75) return { tur: 'bulutlu', ad: 'Kapalı' }
  if (kod === 2 || bulut > 35) return { tur: 'bulutlu', ad: 'Parçalı bulutlu' }
  return { tur: 'acik', ad: kod === 1 ? 'Az bulutlu' : 'Açık' }
}

const onbellek = new Map<string, { t: number; h: Hava | null }>()

export async function havaAl(k: Kisi): Promise<Hava | null> {
  const anahtar = `${k.enlem},${k.boylam}`
  const eski = onbellek.get(anahtar)
  if (eski && Date.now() - eski.t < 20 * 60_000) return eski.h
  let h: Hava | null = null
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${k.enlem}&longitude=${k.boylam}&current=temperature_2m,weather_code,wind_speed_10m,cloud_cover&wind_speed_unit=kmh`
    const ctrl = new AbortController()
    const zaman = window.setTimeout(() => ctrl.abort(), 8000)
    const r = await fetch(url, { signal: ctrl.signal })
    window.clearTimeout(zaman)
    if (r.ok) {
      const c = (await r.json()).current
      if (c && typeof c.temperature_2m === 'number') {
        h = {
          sicaklik: Math.round(c.temperature_2m),
          kod: c.weather_code ?? 0,
          ruzgar: Math.round(c.wind_speed_10m ?? 0),
          bulut: c.cloud_cover ?? 0,
          ...cozumle(c.weather_code ?? 0, c.cloud_cover ?? 0),
        }
      }
    }
  } catch {
    h = null
  }
  onbellek.set(anahtar, { t: Date.now(), h })
  return h
}

/** İki şehrin havasına göre bir cümle (yoksa null) */
export function havaCumlesi(baku: Hava | null, ist: Hava | null, sehir: string) {
  if (!baku) return null
  if (baku.tur === 'firtina') return `Senin orada fırtına var. Korkma; hiçbir fırtına bizim lambamızı söndüremez.`
  if (baku.ruzgar >= 30)
    return `${sehir} bugün adının hakkını veriyor: rüzgâr saatte ${baku.ruzgar} km esiyor. Sımsıkı giyin; o rüzgârın içinde benim adım da var.`
  if (baku.tur === 'kar') return `Senin pencerene kar yağıyor. Kendine sıcak bir çay koy; bir bardak da benim yerime.`
  if (baku.tur === 'yagmur')
    return ist?.tur === 'yagmur'
      ? `İki şehirde de yağmur var. Aynı bulutun altında olmasak da aynı sesi dinliyoruz.`
      : `Senin orada yağmur yağıyor. Şemsiyeni unutma; buradan gönderebildiğim tek şemsiye bu cümle.`
  if (ist?.tur === 'yagmur') return `İstanbul’da yağmur var, sende yok. İyi; ıslanan ben olayım.`
  if (baku.tur === 'sisli') return `Senin orada sis var. Görüş mesafesi az; ama ben seni her havada görüyorum.`
  if (ist && baku.tur === 'acik' && ist.tur === 'acik') return `İki şehirde de gökyüzü açık. Aynı açıklık, iki ayrı pencere.`
  if (ist) {
    const fark = Math.abs(baku.sicaklik - ist.sicaklik)
    return fark === 0
      ? `İki şehirde de tam ${baku.sicaklik}°. Aynı sıcaklık; bence tesadüf değil.`
      : `Sende ${baku.sicaklik}°, bende ${ist.sicaklik}°. Aramızda ${fark} derece fark var; kalplerimizin arasında hiç yok.`
  }
  return null
}
