// Kara (land) maskesini üretir: Natural Earth 1:50m verisini iki ızgaraya tarar
// ve satır-uzunluk (RLE) kodlamasıyla src/veri/kara.ts dosyasına yazar.
//  - dunya:  tüm dünya, 0.25° çözünürlük  → küre üzerindeki genel noktalar
//  - bolge:  İstanbul–Bakü bölgesi, 0.05° → yakınlaşınca görünen yoğun noktalar
// Çalıştırma: npm run kara
import { readFileSync, writeFileSync } from 'node:fs'
import { feature } from 'topojson-client'

const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/land-50m.json', import.meta.url)))
const land = feature(topo, topo.objects.land)
const geoms = land.type === 'FeatureCollection' ? land.features.map((f) => f.geometry) : [land.geometry]

// Tüm halkaların kenarlarını topla
const edges = []
for (const g of geoms) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  for (const poly of polys) {
    for (const ring of poly) {
      for (let i = 0; i < ring.length - 1; i++) edges.push([ring[i][0], ring[i][1], ring[i + 1][0], ring[i + 1][1]])
    }
  }
}

function rasterize({ lon0, lat0, lon1, lat1, step }) {
  const cols = Math.round((lon1 - lon0) / step)
  const rows = Math.round((lat1 - lat0) / step)
  const grid = new Uint8Array(cols * rows)
  // satır bazlı kenar kovaları (hız için)
  for (let r = 0; r < rows; r++) {
    const lat = lat1 - (r + 0.5) * step
    const xs = []
    for (const [x0, y0, x1, y1] of edges) {
      if ((y0 > lat) !== (y1 > lat)) xs.push(x0 + ((lat - y0) / (y1 - y0)) * (x1 - x0))
    }
    xs.sort((a, b) => a - b)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      let c0 = Math.ceil((xs[k] - lon0) / step - 0.5)
      let c1 = Math.floor((xs[k + 1] - lon0) / step - 0.5)
      c0 = Math.max(0, c0)
      c1 = Math.min(cols - 1, c1)
      for (let c = c0; c <= c1; c++) grid[r * cols + c] = 1
    }
  }
  return { cols, rows, grid }
}

// Satır başına: [koşu sayısı, (başlangıç, uzunluk)...] — hepsi varint
function encode({ cols, rows, grid }) {
  const out = []
  const varint = (n) => {
    while (n >= 128) {
      out.push((n & 127) | 128)
      n >>>= 7
    }
    out.push(n)
  }
  for (let r = 0; r < rows; r++) {
    const runs = []
    let c = 0
    while (c < cols) {
      if (grid[r * cols + c]) {
        const s = c
        while (c < cols && grid[r * cols + c]) c++
        runs.push(s, c - s)
      } else c++
    }
    varint(runs.length / 2)
    let prev = 0
    for (let i = 0; i < runs.length; i += 2) {
      varint(runs[i] - prev) // önceki koşunun bitişine göre fark
      varint(runs[i + 1])
      prev = runs[i] + runs[i + 1]
    }
  }
  return Buffer.from(out).toString('base64')
}

const dunyaKutu = { lon0: -180, lat0: -90, lon1: 180, lat1: 90, step: 0.25 }
const bolgeKutu = { lon0: 18, lat0: 32, lon1: 60, lat1: 50, step: 0.05 }
const dunya = rasterize(dunyaKutu)
const bolge = rasterize(bolgeKutu)

const test = (k, r, lon, lat) => r.grid[Math.floor((k.lat1 - lat) / k.step) * r.cols + Math.floor((lon - k.lon0) / k.step)]
console.log('İstanbul kara mı?', test(bolgeKutu, bolge, 28.9784, 41.0082), '— Bakü kara mı?', test(bolgeKutu, bolge, 49.8671, 40.4093))
console.log('Hazar (su olmalı):', test(bolgeKutu, bolge, 51, 41), '— Karadeniz (su olmalı):', test(bolgeKutu, bolge, 34, 43))

const js = `// Bu dosya scripts/kara-haritasi.mjs tarafından üretildi — elle düzenlemeyin.
// Kaynak: Natural Earth (kamu malı), world-atlas land-50m.
export const DUNYA = { ...${JSON.stringify(dunyaKutu)}, cols: ${dunya.cols}, rows: ${dunya.rows}, rle: '${encode(dunya)}' }
export const BOLGE = { ...${JSON.stringify(bolgeKutu)}, cols: ${bolge.cols}, rows: ${bolge.rows}, rle: '${encode(bolge)}' }
`
writeFileSync(new URL('../src/veri/kara.ts', import.meta.url), js)
console.log('yazıldı: src/veri/kara.ts', (js.length / 1024).toFixed(1) + ' KB')
