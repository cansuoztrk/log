import { BOLGE, DUNYA } from './kara'

interface Izgara {
  lon0: number
  lat0: number
  lon1: number
  lat1: number
  step: number
  cols: number
  rows: number
  rle: string
}

function coz(k: Izgara) {
  const ham = atob(k.rle)
  const b = new Uint8Array(ham.length)
  for (let i = 0; i < ham.length; i++) b[i] = ham.charCodeAt(i)
  const izgara = new Uint8Array(k.cols * k.rows)
  let p = 0
  const oku = () => {
    let n = 0
    let s = 0
    let x: number
    do {
      x = b[p++]
      n |= (x & 127) << s
      s += 7
    } while (x & 128)
    return n
  }
  for (let r = 0; r < k.rows; r++) {
    const kosu = oku()
    let onceki = 0
    for (let i = 0; i < kosu; i++) {
      const bas = onceki + oku()
      const uz = oku()
      izgara.fill(1, r * k.cols + bas, r * k.cols + bas + uz)
      onceki = bas + uz
    }
  }
  return izgara
}

let dunya: Uint8Array | null = null
let bolge: Uint8Array | null = null

/** Bu enlem/boylam kara mı? (bölgede ince, dünyada kaba ızgara) */
export function karaMi(enlem: number, boylam: number) {
  dunya ??= coz(DUNYA)
  bolge ??= coz(BOLGE)
  if (enlem > BOLGE.lat0 && enlem < BOLGE.lat1 && boylam > BOLGE.lon0 && boylam < BOLGE.lon1) {
    const r = Math.floor((BOLGE.lat1 - enlem) / BOLGE.step)
    const c = Math.floor((boylam - BOLGE.lon0) / BOLGE.step)
    return bolge[r * BOLGE.cols + c] === 1
  }
  const r = Math.min(DUNYA.rows - 1, Math.floor((DUNYA.lat1 - enlem) / DUNYA.step))
  const c = Math.min(DUNYA.cols - 1, Math.floor((boylam - DUNYA.lon0) / DUNYA.step))
  return dunya[r * DUNYA.cols + c] === 1
}
