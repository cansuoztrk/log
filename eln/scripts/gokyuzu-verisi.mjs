// "O Gecenin Gökyüzü" için yıldız verisini üretir → src/veri/gok.ts
// Kaynak: d3-celestial (© Olaf Frohn, BSD-3-Clause) — Hipparcos yıldızları, takımyıldız çizgileri,
// Samanyolu sınırları. Paket büyük (~50 MB) olduğu için projeye bağımlılık olarak eklenmedi:
//   npm pack d3-celestial && tar xzf d3-celestial-*.tgz
//   node scripts/gokyuzu-verisi.mjs package/data
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const kaynak = process.argv[2]
if (!kaynak) {
  console.error('Kullanım: node scripts/gokyuzu-verisi.mjs <d3-celestial/data klasörü>')
  process.exit(1)
}
const oku = (ad) => JSON.parse(readFileSync(join(kaynak, ad), 'utf8'))
const ra = (lon) => (lon + 360) % 360 // d3-celestial: boylam = sağ açıklık (-180…180)
const y2 = (n) => Math.round(n * 100) / 100

/* ─── Yıldızlar (kadir ≤ 5) ─── */
const SINIR = 5
const yildizlar = oku('stars.6.json')
  .features.filter((f) => f.properties.mag <= SINIR)
  .sort((a, b) => a.properties.mag - b.properties.mag)
const duz = []
for (const f of yildizlar) {
  const [lon, lat] = f.geometry.coordinates
  duz.push(y2(ra(lon)), y2(lat), y2(f.properties.mag), y2(parseFloat(f.properties.bv) || 0.6))
}

/* ─── Parlak yıldızların adları ─── */
const TR = {
  Sirius: 'Akyıldız (Sirius)',
  Polaris: 'Kutup Yıldızı',
  Arcturus: 'Arktürüs',
  Capella: 'Kapella',
  Betelgeuse: 'Betelgöz',
  Spica: 'Spika',
  Pollux: 'Polluks',
  Castor: 'Kastor',
  Procyon: 'Prokyon',
}
const adlar = oku('starnames.json')
const yildizAdlari = {}
yildizlar.forEach((f, i) => {
  const a = adlar[f.id]
  if (f.properties.mag <= 2.6 && a?.name) yildizAdlari[i] = [TR[a.name] ?? a.name, a.c]
})

/* ─── Takımyıldızlar ─── */
const TAKIM_TR = {
  Cas: 'Kraliçe',
  Peg: 'Kanatlı At',
  CrB: 'Kuzey Tacı',
  CVn: 'Av Köpekleri',
}
const takimAdlari = {}
for (const f of oku('constellations.json').features) {
  const [lon, lat] = f.geometry.coordinates
  takimAdlari[f.id] = [TAKIM_TR[f.id] ?? f.properties.tr ?? f.properties.name, y2(ra(lon)), y2(lat), +f.properties.rank]
}
const cizgiler = []
for (const f of oku('constellations.lines.json').features) {
  for (const cizgi of f.geometry.coordinates) cizgiler.push(cizgi.flatMap(([lon, lat]) => [y2(ra(lon)), y2(lat)]))
}

/* ─── Samanyolu: 2°'lik ızgarada parlaklık seviyesi (0–5) ─── */
// Her seviye (ol1 en soluk … ol5 en parlak) için dikey ışın yöntemi: noktadan kuzeye giden ışın,
// sınırları tek sayıda kesiyorsa nokta içeridedir. Antimeridyen atlamaları (|Δboylam| > 180) sayılmaz.
const ADIM = 2
const SUTUN = 360 / ADIM
const SATIR = 180 / ADIM
const seviye = new Uint8Array(SUTUN * SATIR)
for (const f of oku('milkyway.json').features) {
  const kenarlar = []
  for (const halka of f.geometry.coordinates)
    for (let i = 0; i + 1 < halka.length; i++) {
      const [x0, y0] = halka[i]
      const [x1, y1] = halka[i + 1]
      if (Math.abs(x1 - x0) > 180) continue
      kenarlar.push([x0, y0, x1, y1])
    }
  for (let s = 0; s < SUTUN; s++) {
    // sütun merkezi (d3 boylamı olarak)
    let lon = (s + 0.5) * ADIM
    if (lon > 180) lon -= 360
    const kesisim = []
    for (const [x0, y0, x1, y1] of kenarlar) {
      if (x0 <= lon === x1 <= lon) continue
      kesisim.push(y0 + ((lon - x0) / (x1 - x0)) * (y1 - y0))
    }
    for (let r = 0; r < SATIR; r++) {
      const lat = 90 - (r + 0.5) * ADIM
      let n = 0
      for (const k of kesisim) if (k > lat) n++
      if (n % 2) seviye[r * SUTUN + s]++
    }
  }
}

const cikti = `// Bu dosya scripts/gokyuzu-verisi.mjs tarafından üretildi — elle düzenlemeyin.
// Kaynak: d3-celestial © 2015 Olaf Frohn (BSD-3-Clause), Hipparcos kataloğu.
// Koordinatlar J2000: sağ açıklık (0–360°), dik açıklık (°).

/** [sağAçıklık, dikAçıklık, kadir, B−V, …] — parlaklığa göre sıralı (${yildizlar.length} yıldız, kadir ≤ ${SINIR}) */
export const YILDIZLAR = [${duz.join(',')}]

/** yıldız sırası → [ad, takımyıldız kısaltması] */
export const YILDIZ_ADLARI: Record<number, [string, string]> = ${JSON.stringify(yildizAdlari)}

/** kısaltma → [Türkçe ad, sağAçıklık, dikAçıklık, önem (1 = en bilinen)] */
export const TAKIMYILDIZLAR: Record<string, [string, number, number, number]> = ${JSON.stringify(takimAdlari)}

/** takımyıldız çizgileri: her biri [sa, da, sa, da, …] */
export const CIZGILER: number[][] = ${JSON.stringify(cizgiler)}

/** Samanyolu: ${ADIM}° ızgara, satır satır kuzeyden güneye, her karakter bir hücrenin parlaklığı (0–5) */
export const SAMANYOLU = { adim: ${ADIM}, sutun: ${SUTUN}, satir: ${SATIR}, veri: '${Array.from(seviye).join('')}' }
`
writeFileSync(new URL('../src/veri/gok.ts', import.meta.url), cikti)
console.log(`${yildizlar.length} yıldız, ${Object.keys(yildizAdlari).length} ad, ${cizgiler.length} çizgi, ${(cikti.length / 1024).toFixed(0)} KB`)
