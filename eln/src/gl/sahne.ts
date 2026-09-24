import * as THREE from 'three'
import { gsap } from 'gsap'
import type { GLSahne } from './ortak'

/**
 * Tek bir WebGL tuvali — bütün 3D sahneler bunu paylaşır (telefonlarda hafif kalmak için).
 * Bölümler görünür oldukça ilgili sahne yumuşakça devreye girer.
 */
export class Sahne {
  readonly renderer: THREE.WebGLRenderer
  readonly px: number
  private kurucular = new Map<string, () => GLSahne>()
  private sahneler = new Map<string, GLSahne>()
  private aktifAd: string | null = null
  private hedefAd: string | null = null
  private onceki = performance.now()
  private gecen = 0
  private gecis: gsap.core.Tween | null = null
  private w = 0
  private h = 0
  /** Hedef sahne değiştiğinde (etiketler vb. için) */
  onDegis: ((ad: string | null) => void) | null = null

  constructor(readonly tuval: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas: tuval, antialias: true, alpha: false, powerPreference: 'high-performance' })
    const mobil = matchMedia('(pointer: coarse)').matches
    this.px = Math.min(window.devicePixelRatio || 1, mobil ? 1.6 : 1.8)
    this.renderer.setPixelRatio(this.px)
    this.renderer.setClearColor(0x05060c, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    // Özel gölgelendiricilerde renkleri doğrudan ekran rengi olarak yazıyoruz
    this.renderer.toneMapping = THREE.NoToneMapping
    tuval.style.opacity = '0'
    this.olc()
    window.addEventListener('resize', () => this.olc())
    // Dokunmalar içerik katmanının altından geçer; düğmelere/bağlantılara yapılanlar hariç
    window.addEventListener('click', (e) => {
      if ((e.target as Element | null)?.closest('button, a, input, textarea, label, [data-dom]')) return
      this.dokunma(e)
    })
    this.renderer.setAnimationLoop(() => this.kare())
  }

  kaydet(ad: string, kurucu: () => GLSahne) {
    this.kurucular.set(ad, kurucu)
  }

  /** Sahneyi önceden kur (bölüme yaklaşırken çağrılır, ilk girişte takılma olmasın). */
  hazirla(ad: string) {
    let s = this.sahneler.get(ad)
    if (!s) {
      const k = this.kurucular.get(ad)
      if (!k) return null
      s = k()
      s.boyut(this.w, this.h, this.px)
      this.sahneler.set(ad, s)
      // gölgelendiricileri önceden derle
      this.renderer.compile(s.scene, s.camera)
    }
    return s
  }

  al<T extends GLSahne>(ad: string) {
    return this.hazirla(ad) as T | null
  }

  /** ad = null → tuval kararır (sadece DOM bölümleri için). */
  goster(ad: string | null) {
    if (ad === this.hedefAd) return
    this.hedefAd = ad
    this.onDegis?.(ad)
    this.gecis?.kill()
    const tuval = this.tuval
    const opak = parseFloat(tuval.style.opacity || '0')
    if (ad && ad === this.aktifAd) {
      this.gecis = gsap.to(tuval, { opacity: 1, duration: 0.8, ease: 'power2.out' })
      return
    }
    const degis = () => {
      this.aktifAd = ad
      if (ad) {
        this.hazirla(ad)
        this.gecis = gsap.to(tuval, { opacity: 1, duration: 1.1, ease: 'power2.inOut' })
      }
    }
    if (opak < 0.02) {
      degis()
    } else {
      this.gecis = gsap.to(tuval, { opacity: 0, duration: 0.55, ease: 'power2.in', onComplete: degis })
    }
  }

  get aktif() {
    return this.aktifAd
  }

  private olc() {
    this.w = window.innerWidth
    this.h = window.innerHeight
    this.renderer.setSize(this.w, this.h, false)
    this.sahneler.forEach((s) => s.boyut(this.w, this.h, this.px))
  }

  private dokunma(e: MouseEvent) {
    if (!this.aktifAd) return
    const ndc = new THREE.Vector2((e.clientX / this.w) * 2 - 1, -(e.clientY / this.h) * 2 + 1)
    this.sahneler.get(this.aktifAd)?.dokun?.(ndc)
  }

  private kare() {
    const simdi = performance.now()
    const dt = Math.min((simdi - this.onceki) / 1000, 0.05)
    this.onceki = simdi
    this.gecen += dt
    const t = this.gecen
    if (!this.aktifAd || document.hidden) return
    if (parseFloat(this.tuval.style.opacity || '0') < 0.005) return
    const s = this.sahneler.get(this.aktifAd)
    if (!s) return
    s.guncelle(dt, t)
    this.renderer.render(s.scene, s.camera)
    s.sonra?.()
  }
}

export function webglVarMi() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
