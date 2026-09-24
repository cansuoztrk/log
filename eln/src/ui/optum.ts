import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { type Anlik, ek, sayi } from '../cekirdek/zaman'
import { $, gsap, titret } from '../bolumler/yardimci'
import { ardayaYaz, kimim } from '../cekirdek/posta'

const { ben, sen } = ICERIK

/** Sitenin en sonu: kapatırken hep dediğimiz söz. Bir dokunuş, bir öpücük. */
export function optumHTML() {
  return /* html */ `
    <div class="optum">
      <p class="etiket">Kapatırken hep ne deriz?</p>
      <button class="optum-dugme" type="button"><span class="dudak" aria-hidden="true">💋</span><span>Öptüm</span></button>
      <p class="dipnot optum-durum" aria-live="polite"></p>
    </div>`
}

export function optumKur() {
  const dugme = $<HTMLButtonElement>('.optum-dugme')
  const durum = $('.optum-durum')
  const kim = kimim()
  const hedefSehir = kim === 'eln' ? ben.sehir : sen.sehir
  let sayac = oku<number>('opucuk', 0)
  const durumYaz = () =>
    (durum.textContent =
      sayac > 0
        ? `Bugüne kadar ${sayi(sayac)} öpücük yolladın. Her biri ${ek(hedefSehir, 'yonelme')} 6 milisaniyede vardı.`
        : `Bas; öpücüğün 6 milisaniyede ${ek(hedefSehir, 'bulunma')}.`)
  durumYaz()
  let sonGonderim = 0

  dugme.addEventListener('click', () => {
    ses.baslat()
    ses.opucuk()
    titret([15, 40, 25])
    sayac++
    yaz('opucuk', sayac)
    durumYaz()
    if (sayac === 1) window.setTimeout(() => sirBul('optum'), 1200)

    // ekranda: öpücük batıya (ya da doğuya) doğru uçar
    const r = dugme.getBoundingClientRect()
    const yon = kim === 'eln' ? -1 : 1
    const u = document.createElement('span')
    u.className = 'ucan-opucuk'
    u.textContent = '💋'
    u.style.left = `${r.left + r.width / 2}px`
    u.style.top = `${r.top}px`
    document.body.appendChild(u)
    gsap
      .timeline({ onComplete: () => u.remove() })
      .to(u, { y: -140, scale: 1.6, duration: 0.6, ease: 'power2.out' })
      .to(u, { x: yon * (innerWidth * 0.9), y: -innerHeight * 0.55, rotate: yon * -30, scale: 0.4, opacity: 0, duration: 1.4, ease: 'power2.in' })

    // karşı tarafa: aynı anda sitedeyse ekranında, değilse (Eln'den Arda'ya) telefonunda
    window.dispatchEvent(new Event('opucuk-gonder'))
    const simdi = Date.now()
    if (simdi - sonGonderim > 5000) {
      sonGonderim = simdi
      void ardayaYaz(`${sen.ad} · öptüm`, 'Öptüm. ☺️', ['kiss'])
    }
  })
}

/** Kilit ekranı için duvar kâğıdı: iki ışık, aradaki yay, gün sayısı */
export async function duvarKagidi(z: Anlik) {
  await document.fonts.load('italic 300 120px "Cormorant Garamond"')
  await document.fonts.load('120px "Great Vibes"')
  const W = 1179
  const H = 2556
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#04050b')
  g.addColorStop(0.55, '#0e1231')
  g.addColorStop(0.82, '#2a1838')
  g.addColorStop(1, '#3a1a34')
  x.fillStyle = g
  x.fillRect(0, 0, W, H)
  // yıldızlar
  for (let i = 0; i < 420; i++) {
    const s = Math.sin(i * 12.9898) * 43758.5453
    const r = s - Math.floor(s)
    const s2 = Math.sin(i * 78.233) * 12543.1
    const r2 = s2 - Math.floor(s2)
    x.fillStyle = `rgba(255,${240 - (i % 3) * 10},${225 + (i % 2) * 20},${0.25 + r * 0.6})`
    x.beginPath()
    x.arc(r2 * W, r * H * 0.8, 0.8 + (i % 7 === 0 ? 1.8 : r * 1.2), 0, Math.PI * 2)
    x.fill()
  }
  // dünyanın kıvrımı ve atmosfer
  const cx = W / 2
  const cy = H * 1.62
  const R = H * 0.8
  const atm = x.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.08)
  atm.addColorStop(0, 'rgba(140,170,255,0.55)')
  atm.addColorStop(0.35, 'rgba(245,159,180,0.25)')
  atm.addColorStop(1, 'rgba(245,159,180,0)')
  x.fillStyle = atm
  x.beginPath()
  x.arc(cx, cy, R * 1.08, 0, Math.PI * 2)
  x.fill()
  x.fillStyle = '#05060f'
  x.beginPath()
  x.arc(cx, cy, R, 0, Math.PI * 2)
  x.fill()
  // iki ışık ve aradaki yay
  const ya = -Math.PI / 2 - 0.14
  const yb = -Math.PI / 2 + 0.14
  const A = { x: cx + Math.cos(ya) * R, y: cy + Math.sin(ya) * R }
  const B = { x: cx + Math.cos(yb) * R, y: cy + Math.sin(yb) * R }
  const yay = x.createLinearGradient(A.x, 0, B.x, 0)
  yay.addColorStop(0, '#ffdfae')
  yay.addColorStop(1, '#f59fb4')
  x.strokeStyle = yay
  x.lineWidth = 3
  x.setLineDash([2, 14])
  x.lineCap = 'round'
  x.beginPath()
  x.moveTo(A.x, A.y)
  x.quadraticCurveTo(cx, A.y - 230, B.x, B.y)
  x.stroke()
  x.setLineDash([])
  for (const [p, renk, ad] of [
    [A, '255,210,150', ben.yerelSehir],
    [B, '255,170,190', sen.yerelSehir],
  ] as const) {
    const h = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, 70)
    h.addColorStop(0, `rgba(${renk},1)`)
    h.addColorStop(0.2, `rgba(${renk},0.5)`)
    h.addColorStop(1, `rgba(${renk},0)`)
    x.fillStyle = h
    x.beginPath()
    x.arc(p.x, p.y, 70, 0, Math.PI * 2)
    x.fill()
    x.fillStyle = '#fff'
    x.beginPath()
    x.arc(p.x, p.y, 7, 0, Math.PI * 2)
    x.fill()
    x.font = '600 26px "Plus Jakarta Sans Variable", sans-serif'
    x.fillStyle = 'rgba(247,237,224,0.75)'
    x.textAlign = 'center'
    x.fillText(ad.toLocaleUpperCase('tr-TR').split('').join(' '), p.x, p.y + 70)
  }
  // yazılar (kilit ekranı saatinin altında kalsın diye aşağıda)
  x.textAlign = 'center'
  const baslik = x.createLinearGradient(W * 0.2, 0, W * 0.8, 0)
  baslik.addColorStop(0, '#ffdfae')
  baslik.addColorStop(0.5, '#ec8f55')
  baslik.addColorStop(1, '#f59fb4')
  x.fillStyle = '#f7ede0'
  x.font = 'italic 300 150px "Cormorant Garamond", serif'
  x.fillText('Önce Sana', W / 2, H * 0.6)
  x.fillStyle = baslik
  x.fillText('Doğar', W / 2, H * 0.6 + 150)
  x.fillStyle = 'rgba(247,237,224,0.85)'
  x.font = '110px "Great Vibes", cursive'
  x.fillText(`${sen.ad} & ${ben.ad}`, W / 2, H * 0.6 + 330)
  x.font = '500 30px "JetBrains Mono Variable", monospace'
  x.fillStyle = 'rgba(243,196,124,0.9)'
  const nokta = (iso: string) => iso.split('-').reverse().join('.')
  x.fillText(`GÜN ${sayi(z.gunNo)}  ·  ${nokta(ICERIK.tanisma)}  ·  ${nokta(ICERIK.sevgili)}`, W / 2, H * 0.6 + 420)

  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'))
  if (!blob) return
  const dosya = new File([blob], `once-sana-dogar-gun-${z.gunNo}.png`, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [dosya] })) {
    try {
      await navigator.share({ files: [dosya], title: 'Önce Sana Doğar' })
      return
    } catch {
      /* vazgeçildi ya da desteklenmiyor → indir */
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = dosya.name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}
