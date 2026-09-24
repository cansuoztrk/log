/* ───────────────────────────────────────────────────────────────────────────
   Önce Sana Doğar — Eln için, Arda'dan.
   Kişisel içerik: src/icerik.ts ve src/notlar.ts
   ─────────────────────────────────────────────────────────────────────────── */
import '@fontsource/cormorant-garamond/300.css'
import '@fontsource/cormorant-garamond/300-italic.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/caveat'
import '@fontsource/great-vibes'
import '@fontsource-variable/jetbrains-mono'
import './stil/temel.css'
import './stil/arayuz.css'
import './stil/bolumler.css'

import Lenis from 'lenis'
import { anlik } from './cekirdek/zaman'
import { ziyaretKaydet } from './cekirdek/depo'
import { ses, type Ruh } from './cekirdek/ses'
import { Sahne, webglVarMi } from './gl/sahne'
import { Kure } from './gl/kure'
import { Kuleler } from './gl/kuleler'
import { Cay } from './gl/cay'
import { Yildizlar } from './gl/yildizlar'
import { acilisHTML, acilisKur, cizgiHTML } from './bolumler/acilis'
import { nehirHTML, nehirKur } from './bolumler/nehir'
import { gunlerHTML, gunlerKur } from './bolumler/gunler'
import { kulelerHTML, kulelerKur } from './bolumler/kuleler'
import { cayHTML, cayKur } from './bolumler/cay'
import { dillerHTML, dillerKur } from './bolumler/diller'
import { simdiHTML, simdiKur } from './bolumler/simdi'
import { gununNotu, ruzgarHTML, ruzgarKur } from './bolumler/ruzgar'
import { ucusHTML, ucusKur } from './bolumler/ucus'
import { mektupHTML, mektupKur } from './bolumler/mektup'
import { finalHTML, finalKur } from './bolumler/final'
import { $, $$, azHareket, gsap, ScrollTrigger } from './bolumler/yardimci'
import { kapiAc } from './ui/kapi'
import { ustKur } from './ui/ust'
import { imlecKur } from './ui/imlec'
import { mevsimKur } from './ui/mevsim'
import { karsila, zamanSirlari } from './ui/ozel'

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
window.scrollTo(0, 0)

const parametre = new URLSearchParams(location.search)
const z = anlik()
document.documentElement.dataset.vakit = z.vakit
const ziyaret = ziyaretKaydet(z.bugun)
const not = gununNotu(z)

// ─── Sayfa ───
$('#icerik').innerHTML = [
  acilisHTML(z),
  cizgiHTML(z, ziyaret.gunler.length),
  nehirHTML(),
  gunlerHTML(z),
  kulelerHTML(z),
  cayHTML(),
  dillerHTML(),
  simdiHTML(),
  ruzgarHTML(z, not),
  ucusHTML(z),
  mektupHTML(z),
  finalHTML(ziyaret),
].join('')

// ─── WebGL: tek tuval, dört sahne ───
let sahne: Sahne | null = null
let kure: Kure | null = null
if (webglVarMi()) {
  try {
    sahne = new Sahne($<HTMLCanvasElement>('#gl'))
    sahne.kaydet('kure', () => new Kure($('#kure-etiketler')))
    sahne.kaydet('kule', () => new Kuleler())
    sahne.kaydet('cay', () => new Cay())
    sahne.kaydet('final', () => new Yildizlar())
    kure = sahne.al<Kure>('kure')
  } catch (e) {
    console.warn('WebGL başlatılamadı', e)
    sahne = null
  }
}
if (!sahne) document.documentElement.classList.add('gl-yok')
const al =
  <T,>(ad: string) =>
  () =>
    (sahne?.al(ad) ?? null) as T | null

// ─── Yumuşak kaydırma ───
const lenis = azHareket ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 })
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  lenis.stop()
}
ScrollTrigger.config({ ignoreMobileResize: true })

// ─── Arayüz ───
const mevsim = mevsimKur($<HTMLCanvasElement>('#mevsim'))
const ust = ustKur(z, lenis)
imlecKur()

// ─── Bölümler ───
acilisKur(kure, ziyaret.gunler.length)
nehirKur()
gunlerKur(z)
kulelerKur(al<Kuleler>('kule'))
cayKur(al<Cay>('cay'))
dillerKur()
simdiKur()
ruzgarKur(not, ust.notlarAc)
ucusKur()
mektupKur()
finalKur(al<Yildizlar>('final'))

// Bölüm görünür oldukça: doğru 3D sahne + doğru ses dokusu
for (const b of $$('[data-bolum]')) {
  ScrollTrigger.create({
    trigger: b,
    start: 'top 55%',
    end: 'bottom 45%',
    onToggle: (s) => {
      if (!s.isActive) return
      sahne?.goster(b.dataset.gl || null)
      ses.ruh((b.dataset.ruh as Ruh) || 'sakin')
      mevsim.silik(b.dataset.gl && b.dataset.gl !== 'kure' ? 0.35 : 1)
    },
  })
}
// 3D sahneleri bölüme yaklaşırken önceden kur (girişte takılmasın)
for (const b of $$('[data-gl]')) {
  ScrollTrigger.create({ trigger: b, start: 'top 300%', once: true, onEnter: () => sahne?.hazirla(b.dataset.gl!) })
}
if (sahne) sahne.onDegis = (ad) => kure?.gizleEtiketler(ad !== 'kure')

void document.fonts.ready.then(() => ScrollTrigger.refresh())

// ─── Kapı ───
const basla = () => {
  document.body.classList.remove('kilitli')
  lenis?.start()
  ScrollTrigger.refresh()
  sahne?.goster('kure')
  window.setTimeout(() => {
    karsila(z, not, ziyaret, () => mevsim.kutla(), () => ust.git('#ruzgar'))
    zamanSirlari(ziyaret)
  }, 1400)
}
if (parametre.get('kapi') === '0') {
  $('#kapi').remove()
  basla()
} else {
  // küre, ışık patladığı anda belirir; kapı açıkken arkada boşuna çizilmesin
  void kapiAc(z, ziyaret.toplam === 1, () => sahne?.goster('kure')).then(basla)
}
