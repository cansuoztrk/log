/**
 * Gök bilimi: yıldız zamanı, ekvatoral → yatay koordinat, gezegen konumları.
 * Gezegenler için JPL'in yaklaşık Kepler öğeleri (1800–2050, birkaç yay dakikası doğruluk):
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html
 */
const D = Math.PI / 180

export const julyenGunu = (t: Date) => t.getTime() / 86_400_000 + 2440587.5

/** Yerel yıldız zamanı (derece): o an, o boylamda tam tepedeki sağ açıklık */
export function yildizZamani(t: Date, boylam: number) {
  const d = julyenGunu(t) - 2451545
  const T = d / 36525
  const g = 280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - (T * T * T) / 38_710_000
  return (((g + boylam) % 360) + 360) % 360
}

/** Sağ açıklık / dik açıklık → yükseklik / azimut (azimut kuzeyden doğuya, derece) */
export function yatay(ra: number, dec: number, yz: number, enlem: number) {
  const H = (yz - ra) * D
  const d = dec * D
  const f = enlem * D
  const alt = Math.asin(Math.sin(f) * Math.sin(d) + Math.cos(f) * Math.cos(d) * Math.cos(H))
  const az = Math.atan2(-Math.cos(d) * Math.sin(H), Math.sin(d) * Math.cos(f) - Math.cos(d) * Math.cos(H) * Math.sin(f))
  return { alt: alt / D, az: (az / D + 360) % 360 }
}

/* ─── Gezegenler ─── */
// [a, e, i, L, ϖ, Ω] ve yüzyıllık değişimleri
type Oge = [number, number, number, number, number, number]
const GEZEGENLER: Record<string, { ad: string; o: Oge; d: Oge; renk: string; boy: number }> = {
  merkur: {
    ad: 'Merkür',
    o: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
    d: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    renk: '255,236,210',
    boy: 1.6,
  },
  venus: {
    ad: 'Venüs',
    o: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
    d: [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
    renk: '255,248,232',
    boy: 3.4,
  },
  mars: {
    ad: 'Mars',
    o: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    d: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    renk: '255,160,120',
    boy: 2.3,
  },
  jupiter: {
    ad: 'Jüpiter',
    o: [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    d: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    renk: '255,240,215',
    boy: 3,
  },
  saturn: {
    ad: 'Satürn',
    o: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    d: [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
    renk: '255,226,170',
    boy: 2.4,
  },
}
const DUNYA: { o: Oge; d: Oge } = {
  o: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
  d: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
}

/** Güneş merkezli ekliptik konum (AU) */
function konum(o: Oge, d: Oge, T: number) {
  const [a, e, i, L, pi, N] = o.map((v, k) => v + d[k] * T)
  const w = (pi - N) * D
  const M = (((L - pi) % 360) + 360) % 360
  let E = M * D + e * Math.sin(M * D)
  for (let k = 0; k < 6; k++) E -= (E - e * Math.sin(E) - M * D) / (1 - e * Math.cos(E))
  const xp = a * (Math.cos(E) - e)
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E)
  const Nr = N * D
  const ir = i * D
  return {
    x:
      (Math.cos(w) * Math.cos(Nr) - Math.sin(w) * Math.sin(Nr) * Math.cos(ir)) * xp +
      (-Math.sin(w) * Math.cos(Nr) - Math.cos(w) * Math.sin(Nr) * Math.cos(ir)) * yp,
    y:
      (Math.cos(w) * Math.sin(Nr) + Math.sin(w) * Math.cos(Nr) * Math.cos(ir)) * xp +
      (-Math.sin(w) * Math.sin(Nr) + Math.cos(w) * Math.cos(Nr) * Math.cos(ir)) * yp,
    z: Math.sin(w) * Math.sin(ir) * xp + Math.cos(w) * Math.sin(ir) * yp,
  }
}

export interface Gezegen {
  id: string
  ad: string
  ra: number
  dec: number
  renk: string
  boy: number
}

/** O anda gezegenlerin gökyüzündeki yeri (sağ açıklık / dik açıklık, derece) */
export function gezegenler(t: Date): Gezegen[] {
  const T = (julyenGunu(t) - 2451545) / 36525
  const dunya = konum(DUNYA.o, DUNYA.d, T)
  const eps = 23.43928 * D
  return Object.entries(GEZEGENLER).map(([id, g]) => {
    const p = konum(g.o, g.d, T)
    const x = p.x - dunya.x
    const y = p.y - dunya.y
    const z = p.z - dunya.z
    const ye = y * Math.cos(eps) - z * Math.sin(eps)
    const ze = y * Math.sin(eps) + z * Math.cos(eps)
    return {
      id,
      ad: g.ad,
      ra: (Math.atan2(ye, x) / D + 360) % 360,
      dec: Math.atan2(ze, Math.hypot(x, ye)) / D,
      renk: g.renk,
      boy: g.boy,
    }
  })
}

/** Azimuttan Türkçe yön: "kuzeydoğuda" */
export function yonBulunma(az: number) {
  return ['kuzeyde', 'kuzeydoğuda', 'doğuda', 'güneydoğuda', 'güneyde', 'güneybatıda', 'batıda', 'kuzeybatıda'][Math.round(az / 45) % 8]
}
