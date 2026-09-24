import { oku, yaz } from './depo'

/**
 * Sitenin sesi — tamamı tarayıcıda, anlık üretilir (hiçbir ses dosyası yok):
 *  - yavaş değişen sıcak akorlar (pad)
 *  - rastgele çalan müzik kutusu notaları (her ziyarette farklı bir melodi)
 *  - dalga (deniz) ve rüzgâr dokusu
 *  - küçük efektler: bardak "şıng"ı, kalp atışı, pano tıkırtısı…
 */
export type Ruh = 'kure' | 'nehir' | 'kule' | 'cay' | 'final' | 'sakin'

const RUHLAR: Record<Ruh, { pad: number; deniz: number; ruzgar: number; zil: number; filtre: number }> = {
  kure: { pad: 1, deniz: 0.35, ruzgar: 0.5, zil: 1, filtre: 1100 },
  nehir: { pad: 1, deniz: 0.75, ruzgar: 0.25, zil: 1, filtre: 1300 },
  kule: { pad: 0.8, deniz: 1.25, ruzgar: 0.8, zil: 0.8, filtre: 900 },
  cay: { pad: 0.9, deniz: 0.12, ruzgar: 0.15, zil: 0.9, filtre: 1500 },
  final: { pad: 0.75, deniz: 0.3, ruzgar: 0.2, zil: 0.55, filtre: 800 },
  sakin: { pad: 0.9, deniz: 0.4, ruzgar: 0.35, zil: 0.9, filtre: 1100 },
}

const mf = (m: number) => 440 * 2 ** ((m - 69) / 12)

// D majör, sıcak ve açık akorlar
const AKORLAR = [
  [50, 57, 61, 64, 66], // Dmaj9
  [47, 54, 57, 61, 62], // Bm9
  [43, 50, 54, 57, 59], // Gmaj9
  [45, 52, 59, 61, 66], // A6/9
]
const PENTATONIK = [74, 76, 78, 81, 83, 86, 88, 90]

class SesMotoru {
  ctx: AudioContext | null = null
  acik = oku('ses', true)
  private ana!: GainNode
  private muzik!: GainNode
  private padBus!: GainNode
  private zilBus!: GainNode
  private efekt!: GainNode
  private yanki!: GainNode
  private deniz!: GainNode
  private ruzgar!: GainNode
  private padFiltre!: BiquadFilterNode
  private gurultu!: AudioBuffer
  private akorNo = 0
  private akorSesleri: { durdur: (t: number) => void }[] = []
  private sarki: HTMLAudioElement | null = null
  private dinleyiciler = new Set<(acik: boolean) => void>()

  get hazir() {
    return !!this.ctx
  }

  /** Yalnızca bir dokunuş/tıklama içinde çağrılmalı (tarayıcı kuralı). */
  baslat() {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    // iOS'ta sessiz moddayken de çalsın
    const nav = navigator as Navigator & { audioSession?: { type: string } }
    if (nav.audioSession) nav.audioSession.type = 'playback'
    const ctx = new AC()
    this.ctx = ctx
    void ctx.resume()

    const sikistir = ctx.createDynamicsCompressor()
    sikistir.threshold.value = -18
    sikistir.ratio.value = 3
    sikistir.connect(ctx.destination)
    this.ana = ctx.createGain()
    this.ana.gain.value = 0
    this.ana.connect(sikistir)

    // yankı (kendi ürettiğimiz dürtü yanıtı)
    const conv = ctx.createConvolver()
    conv.buffer = this.durtu(3.6, 2.4)
    this.yanki = ctx.createGain()
    this.yanki.gain.value = 0.9
    this.yanki.connect(conv).connect(this.ana)

    this.muzik = this.kanal(this.ana, 1)
    this.efekt = this.kanal(this.ana, 0.9)
    this.padFiltre = ctx.createBiquadFilter()
    this.padFiltre.type = 'lowpass'
    this.padFiltre.frequency.value = 1100
    this.padFiltre.Q.value = 0.4
    this.padBus = this.kanal(this.padFiltre, 1)
    this.padFiltre.connect(this.muzik)
    this.padFiltre.connect(this.gonder(0.6))
    this.zilBus = this.kanal(this.muzik, 1)

    this.gurultu = this.kahverengiGurultu(6)
    this.deniz = this.kanal(this.ana, 0)
    this.ruzgar = this.kanal(this.ana, 0)
    this.denizKur()
    this.ruzgarKur()

    this.akorCal()
    this.zilCal()

    this.ruh('kure')
    this.ana.gain.setTargetAtTime(this.acik ? 0.85 : 0, ctx.currentTime, 1.2)

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return
      if (document.hidden) {
        void this.ctx.suspend()
        this.sarki?.pause()
      } else if (this.acik) {
        void this.ctx.resume()
      }
    })
  }

  dinle(f: (acik: boolean) => void) {
    this.dinleyiciler.add(f)
    f(this.acik)
  }

  degistir() {
    this.acik = !this.acik
    yaz('ses', this.acik)
    if (!this.ctx) this.baslat()
    if (this.ctx) {
      void this.ctx.resume()
      this.ana.gain.setTargetAtTime(this.acik ? 0.85 : 0, this.ctx.currentTime, 0.4)
    }
    if (!this.acik) this.sarki?.pause()
    this.dinleyiciler.forEach((f) => f(this.acik))
  }

  /** Bizim şarkımız (public/ içindeki dosya): çalarken üretilen müzik susar */
  sarkiCal(dosya: string, bitince: () => void) {
    this.baslat()
    if (!this.sarki) {
      this.sarki = new Audio(dosya)
      this.sarki.addEventListener('ended', () => {
        this.muzikGeri()
        bitince()
      })
    }
    this.sarki.volume = 0.85
    if (this.ctx) this.muzik.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6)
    return this.sarki.play().then(
      () => true,
      () => false,
    )
  }

  sarkiDur() {
    this.sarki?.pause()
    this.muzikGeri()
  }

  private muzikGeri() {
    if (this.ctx) this.muzik.gain.setTargetAtTime(1, this.ctx.currentTime, 1.2)
  }

  ruh(r: Ruh) {
    const c = this.ctx
    if (!c) return
    const h = RUHLAR[r]
    const t = c.currentTime
    this.padBus.gain.setTargetAtTime(0.9 * h.pad, t, 1.5)
    this.deniz.gain.setTargetAtTime(h.deniz, t, 1.8)
    this.ruzgar.gain.setTargetAtTime(h.ruzgar, t, 1.8)
    this.zilBus.gain.setTargetAtTime(h.zil, t, 1.5)
    this.padFiltre.frequency.setTargetAtTime(h.filtre, t, 2)
  }

  /* ─── yapı taşları ─── */

  private kanal(hedef: AudioNode, kazanc: number) {
    const g = this.ctx!.createGain()
    g.gain.value = kazanc
    g.connect(hedef)
    return g
  }

  private gonder(miktar: number) {
    const g = this.ctx!.createGain()
    g.gain.value = miktar
    g.connect(this.yanki)
    return g
  }

  private durtu(sure: number, sonum: number) {
    const c = this.ctx!
    const n = Math.floor(c.sampleRate * sure)
    const b = c.createBuffer(2, n, c.sampleRate)
    for (let k = 0; k < 2; k++) {
      const d = b.getChannelData(k)
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** sonum
    }
    return b
  }

  private kahverengiGurultu(sure: number) {
    const c = this.ctx!
    const n = Math.floor(c.sampleRate * sure)
    const b = c.createBuffer(2, n, c.sampleRate)
    for (let k = 0; k < 2; k++) {
      const d = b.getChannelData(k)
      let son = 0
      for (let i = 0; i < n; i++) {
        son = (son + 0.02 * (Math.random() * 2 - 1)) / 1.02
        d[i] = son * 3.5
      }
    }
    return b
  }

  private gurultuKaynagi() {
    const s = this.ctx!.createBufferSource()
    s.buffer = this.gurultu
    s.loop = true
    s.loopStart = Math.random() * 2
    return s
  }

  private lfo(frekans: number, derinlik: number, hedef: AudioParam) {
    const c = this.ctx!
    const o = c.createOscillator()
    o.frequency.value = frekans
    const g = c.createGain()
    g.gain.value = derinlik
    o.connect(g).connect(hedef)
    o.start()
  }

  private denizKur() {
    const c = this.ctx!
    const kaynak = this.gurultuKaynagi()
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 420
    const dalga = c.createGain()
    dalga.gain.value = 0.05
    this.lfo(0.075, 0.035, dalga.gain)
    this.lfo(0.075, 180, f.frequency)
    kaynak.connect(f).connect(dalga).connect(this.deniz)
    dalga.connect(this.gonder(0.25))
    kaynak.start()
  }

  private ruzgarKur() {
    const c = this.ctx!
    const kaynak = this.gurultuKaynagi()
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 650
    f.Q.value = 0.9
    this.lfo(0.045, 320, f.frequency)
    const g = c.createGain()
    g.gain.value = 0.02
    this.lfo(0.031, 0.012, g.gain)
    kaynak.connect(f).connect(g).connect(this.ruzgar)
    kaynak.start()
  }

  private akorCal() {
    const c = this.ctx!
    const t = c.currentTime
    this.akorSesleri.forEach((s) => s.durdur(t))
    const notalar = AKORLAR[this.akorNo++ % AKORLAR.length]
    this.akorSesleri = notalar.map((m, i) => {
      const g = c.createGain()
      g.gain.value = 0
      g.gain.setTargetAtTime(0.028 - i * 0.002, t, 1.6)
      const o1 = c.createOscillator()
      o1.type = 'triangle'
      o1.frequency.value = mf(m)
      const o2 = c.createOscillator()
      o2.type = 'sawtooth'
      o2.frequency.value = mf(m) * 1.004
      const g2 = c.createGain()
      g2.gain.value = 0.22
      o1.connect(g)
      o2.connect(g2).connect(g)
      g.connect(this.padBus)
      o1.start(t)
      o2.start(t)
      return {
        durdur: (an: number) => {
          g.gain.cancelScheduledValues(an)
          g.gain.setTargetAtTime(0, an, 1.8)
          o1.stop(an + 9)
          o2.stop(an + 9)
        },
      }
    })
    window.setTimeout(() => this.akorCal(), 9000)
  }

  private sonNota = -1
  private zilCal() {
    if (this.acik && !document.hidden) {
      let m = PENTATONIK[Math.floor(Math.random() * PENTATONIK.length)]
      if (m === this.sonNota) m = PENTATONIK[(PENTATONIK.indexOf(m) + 2) % PENTATONIK.length]
      this.sonNota = m
      this.zil(mf(m), 0.045, this.zilBus, (Math.random() - 0.5) * 0.9)
      // bazen küçük bir ikinci nota (cevap gibi)
      if (Math.random() < 0.35) {
        const m2 = PENTATONIK[Math.max(0, PENTATONIK.indexOf(m) - 2)]
        window.setTimeout(() => this.zil(mf(m2), 0.03, this.zilBus, (Math.random() - 0.5) * 0.9), 380)
      }
    }
    window.setTimeout(() => this.zilCal(), 1800 + Math.random() * 3800)
  }

  /** Müzik kutusu / çan sesi (FM) */
  private zil(f: number, kazanc: number, hedef: AudioNode, pan = 0, sure = 2.6) {
    const c = this.ctx!
    const t = c.currentTime + 0.01
    const tas = c.createOscillator()
    tas.frequency.value = f
    const mod = c.createOscillator()
    mod.frequency.value = f * 3.5
    const modG = c.createGain()
    modG.gain.setValueAtTime(f * 1.2, t)
    modG.gain.exponentialRampToValueAtTime(f * 0.01, t + 0.6)
    mod.connect(modG).connect(tas.frequency)
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(kazanc, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + sure)
    const p = c.createStereoPanner()
    p.pan.value = pan
    tas.connect(g).connect(p)
    p.connect(hedef)
    p.connect(this.gonder(0.55))
    tas.start(t)
    mod.start(t)
    tas.stop(t + sure + 0.1)
    mod.stop(t + sure + 0.1)
  }

  /* ─── efektler ─── */

  private hazirMi() {
    return !!this.ctx && this.acik
  }

  cin() {
    if (!this.hazirMi()) return
    ;[86, 90, 93, 98].forEach((m, i) => window.setTimeout(() => this.zil(mf(m), 0.05, this.efekt, (i - 1.5) * 0.3, 2.2), i * 90))
  }

  nota(m: number, kazanc = 0.04) {
    if (!this.hazirMi()) return
    this.zil(mf(m), kazanc, this.efekt, 0, 2)
  }

  bildirim() {
    if (!this.hazirMi()) return
    this.zil(mf(81), 0.035, this.efekt, 0, 0.8)
    window.setTimeout(() => this.zil(mf(88), 0.03, this.efekt, 0, 1), 110)
  }

  /** Cam bardak "şıng" */
  sing(parlaklik = 1) {
    if (!this.hazirMi()) return
    const c = this.ctx!
    const t = c.currentTime
    const temel = 2480 * parlaklik
    ;[1, 1.59, 2.14, 2.81].forEach((oran, i) => {
      const o = c.createOscillator()
      o.frequency.value = temel * oran
      const g = c.createGain()
      g.gain.setValueAtTime(0.045 / (i + 1), t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1 - i * 0.2)
      o.connect(g)
      g.connect(this.efekt)
      g.connect(this.gonder(0.3))
      o.start(t)
      o.stop(t + 1.2)
    })
  }

  damla() {
    if (!this.hazirMi()) return
    const c = this.ctx!
    const t = c.currentTime
    const o = c.createOscillator()
    o.frequency.setValueAtTime(1100, t)
    o.frequency.exponentialRampToValueAtTime(260, t + 0.09)
    const g = c.createGain()
    g.gain.setValueAtTime(0.12, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    o.connect(g).connect(this.efekt)
    g.connect(this.gonder(0.4))
    o.start(t)
    o.stop(t + 0.2)
  }

  tik() {
    if (!this.hazirMi()) return
    const c = this.ctx!
    const t = c.currentTime
    const s = this.gurultuKaynagi()
    const f = c.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 2500
    const g = c.createGain()
    g.gain.setValueAtTime(0.35, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025)
    s.connect(f).connect(g).connect(this.efekt)
    s.start(t)
    s.stop(t + 0.03)
  }

  vuus(sure = 1.6) {
    if (!this.hazirMi()) return
    const c = this.ctx!
    const t = c.currentTime
    const s = this.gurultuKaynagi()
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 1.4
    f.frequency.setValueAtTime(300, t)
    f.frequency.exponentialRampToValueAtTime(2400, t + sure * 0.45)
    f.frequency.exponentialRampToValueAtTime(350, t + sure)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.5, t + sure * 0.4)
    g.gain.exponentialRampToValueAtTime(0.0001, t + sure)
    s.connect(f).connect(g).connect(this.efekt)
    g.connect(this.gonder(0.5))
    s.start(t)
    s.stop(t + sure + 0.05)
  }

  /** "Lub-dub" */
  kalp(guc = 1) {
    if (!this.hazirMi()) return
    const c = this.ctx!
    const vur = (t: number, g0: number) => {
      const o = c.createOscillator()
      o.frequency.setValueAtTime(95, t)
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14)
      const o2 = c.createOscillator()
      o2.frequency.setValueAtTime(190, t)
      o2.frequency.exponentialRampToValueAtTime(84, t + 0.1)
      const g = c.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(g0, t + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
      const g2 = c.createGain()
      g2.gain.value = 0.25
      o.connect(g)
      o2.connect(g2).connect(g)
      g.connect(this.efekt)
      o.start(t)
      o2.start(t)
      o.stop(t + 0.25)
      o2.stop(t + 0.25)
    }
    const t = c.currentTime + 0.005
    vur(t, 0.55 * guc)
    vur(t + 0.26, 0.38 * guc)
  }
}

export const ses = new SesMotoru()
