import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText)

export const azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches
export const dokunmatik = matchMedia('(pointer: coarse)').matches

export const $ = <T extends Element = HTMLElement>(s: string, k: ParentNode = document) => k.querySelector(s) as T
export const $$ = <T extends Element = HTMLElement>(s: string, k: ParentNode = document) => Array.from(k.querySelectorAll(s)) as T[]

/** Kullanıcının yazdığı metni HTML'e güvenle koymak için */
export const kacir = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export const ikon = (ad: string, sinif = '') => `<svg class="${sinif}" aria-hidden="true"><use href="#i-${ad}"/></svg>`

/**
 * Yapışkan (sticky) bir bölümde adımları kaydırmaya bağlar: her adım belirir, bekler, kaybolur.
 * sonKalsin: son adım ekranda kalsın mı
 */
export function adimZamani(bolum: HTMLElement, adimlar: HTMLElement[], sonKalsin = true) {
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: bolum, start: 'top top', end: 'bottom bottom', scrub: 0.9 },
  })
  adimlar.forEach((el, i) => {
    tl.fromTo(
      el,
      { autoAlpha: 0, y: 36, filter: 'blur(8px)' },
      { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power2.out' },
    )
    tl.to({}, { duration: 1.3 })
    if (i < adimlar.length - 1 || !sonKalsin) {
      tl.to(el, { autoAlpha: 0, y: -28, filter: 'blur(6px)', duration: 0.8, ease: 'power2.in' })
    }
  })
  return tl
}

/** Bir öğe ekrana girince satır satır belirsin. */
export function satirSatir(el: HTMLElement, gecikme = 0) {
  if (azHareket) return
  const b = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'satir-ic' })
  gsap.from(b.lines, {
    yPercent: 105,
    opacity: 0,
    duration: 1.25,
    ease: 'expo.out',
    stagger: 0.09,
    delay: gecikme,
    scrollTrigger: { trigger: el, start: 'top 85%', once: true },
  })
}

/** Ekrana girince sırayla yumuşakça belir. */
export function belir(el: Element | Element[], secenek: gsap.TweenVars = {}) {
  if (azHareket) return
  const hedef = Array.isArray(el) ? el : [el]
  gsap.from(hedef, {
    opacity: 0,
    y: 34,
    duration: 1.2,
    ease: 'expo.out',
    stagger: 0.1,
    scrollTrigger: { trigger: hedef[0], start: 'top 88%', once: true },
    ...secenek,
  })
}

/** Görünürken çalışan döngü (tuval animasyonları için) */
export function gorunurken(el: Element, f: (acik: boolean) => void, pay = '120px') {
  const io = new IntersectionObserver((k) => k.forEach((x) => f(x.isIntersecting)), { rootMargin: pay })
  io.observe(el)
  return io
}

/** Tuvali ekran yoğunluğuna göre boyutlandırır */
export function tuvalOlcu(c: HTMLCanvasElement, maxPx = 2) {
  const px = Math.min(window.devicePixelRatio || 1, maxPx)
  const r = c.getBoundingClientRect()
  c.width = Math.max(1, Math.round(r.width * px))
  c.height = Math.max(1, Math.round(r.height * px))
  const x = c.getContext('2d')!
  x.setTransform(px, 0, 0, px, 0, 0)
  return { x, w: r.width, h: r.height, px }
}

export function titret(desen: number | number[]) {
  try {
    navigator.vibrate?.(desen)
  } catch {
    /* desteklenmiyor */
  }
}

/** Bir görseli telefonda paylaş menüsüyle kaydettir; olmazsa indir. */
export async function paylasVeyaIndir(blob: Blob, ad: string, baslik: string) {
  const dosya = new File([blob], ad, { type: blob.type })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [dosya] })) {
    try {
      await navigator.share({ files: [dosya], title: baslik })
      return
    } catch {
      /* vazgeçildi ya da desteklenmiyor → indir */
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = ad
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

export { gsap, ScrollTrigger, SplitText }
