import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import type { Anlik } from '../cekirdek/zaman'
import { $, $$, gsap, titret } from '../bolumler/yardimci'

const { dogumGunu, dogumYili } = ICERIK

/** Bugün kimin doğum günü? (Eln'in takvimiyle) */
export function dogumGunuMu(z: Anlik): 'sen' | 'ben' | null {
  const ag = z.bugun.slice(5)
  if (dogumGunu.sen && ag === dogumGunu.sen) return 'sen'
  if (dogumGunu.ben && ag === dogumGunu.ben) return 'ben'
  return null
}

const PASTA_SVG = /* html */ `
<svg class="pasta-svg" viewBox="0 0 300 210" aria-hidden="true">
  <defs>
    <linearGradient id="pk1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffe9ee"/><stop offset="1" stop-color="#f6c7d2"/></linearGradient>
    <linearGradient id="pk2" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff5ea"/><stop offset="1" stop-color="#f0d7c0"/></linearGradient>
    <linearGradient id="ptab" x1="0" x2="1"><stop offset="0" stop-color="#c9a36b"/><stop offset=".5" stop-color="#f3dcae"/><stop offset="1" stop-color="#b98f55"/></linearGradient>
  </defs>
  <ellipse cx="150" cy="196" rx="138" ry="12" fill="url(#ptab)"/>
  <rect x="34" y="112" width="232" height="80" rx="14" fill="url(#pk2)"/>
  <path d="M34 124 q0-12 14-12 h204 q14 0 14 12 v10 q-10 12-20 0 q-10 14-22 0 q-11 16-23 0 q-11 12-22 0 q-11 16-23 0 q-11 12-22 0 q-11 16-23 0 q-11 12-22 0 q-10 14-21 0 q-9 12-20 0z" fill="#f59fb4"/>
  <rect x="34" y="170" width="232" height="6" fill="#ec8f55" opacity=".55"/>
  <rect x="72" y="56" width="156" height="62" rx="12" fill="url(#pk1)"/>
  <path d="M72 66 q0-10 12-10 h132 q12 0 12 10 v8 q-9 10-18 0 q-9 12-19 0 q-10 12-20 0 q-9 10-19 0 q-10 12-20 0 q-9 10-19 0 q-9 12-19 0z" fill="#fff8f0"/>
  <g fill="#f3c47c">${Array.from({ length: 9 }, (_, i) => `<circle cx="${52 + i * 25}" cy="${150 + (i % 2) * 8}" r="3"/>`).join('')}</g>
  <g fill="#c9415c">${Array.from({ length: 6 }, (_, i) => `<circle cx="${88 + i * 25}" cy="${96 + (i % 2) * 6}" r="2.6"/>`).join('')}</g>
</svg>`

/** Mumları üst katın üzerine, perspektifli bir elips boyunca diz (pasta SVG'si 300×210) */
function mumKonumlari(n: number) {
  const liste = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.PI / 2 + 0.2
    const x = 150 + Math.cos(a) * (n > 1 ? 58 : 0)
    const y = 63 + Math.sin(a) * (n > 1 ? 10 : 0)
    return { x: (x / 300) * 100, y: (y / 210) * 100, z: Math.round(y * 10), o: 0.86 + ((Math.sin(a) + 1) / 2) * 0.14 }
  })
  return n <= 7 ? liste.map((m, i) => ({ ...m, x: 30 + (40 * (i + 0.5)) / n, y: 30, o: 1 })) : liste
}

/** 23 Nisan: pasta, mumlar ve bir dilek */
export function pastaGoster(z: Anlik, kutla: (adet?: number) => void) {
  const anahtar = `mum-${z.bugun.slice(0, 4)}`
  if (oku(anahtar, false)) return
  const yas = dogumYili ? +z.bugun.slice(0, 4) - dogumYili : 0
  const N = yas > 0 && yas <= 40 ? yas : 7
  const el = document.createElement('div')
  el.id = 'pasta'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-label', 'Doğum günü pastası')
  el.innerHTML = /* html */ `
    <div class="pasta-ic">
      <p class="etiket">23 Nisan · Ad günün mübarək</p>
      <h2 class="pasta-baslik">İyi ki doğdun</h2>
      <p class="kapi-metin pasta-metin">Güneş her gün önce sana doğar. Bugün sen doğdun; güneş de biraz erken kalktı.</p>
      <div class="pasta">
        <div class="mumlar">
          ${mumKonumlari(N)
            .map(
              (m, i) =>
                `<button class="mum" type="button" aria-label="Mum ${i + 1}" style="left:${m.x}%;top:${m.y}%;z-index:${m.z};--o:${m.o};width:${N > 12 ? 6 : 8}px"><span class="alev"></span><span class="duman"></span></button>`,
            )
            .join('')}
        </div>
        ${PASTA_SVG}
      </div>
      <p class="pasta-ipucu">Gözlerini kapat, bir dilek tut ve mumları üfle.</p>
      <div class="pasta-dugmeler">
        <button class="dugme pasta-mikrofon" type="button">Mikrofona üfle</button>
        <button class="dugme hayalet pasta-dokun" type="button">Dokunarak söndür</button>
      </div>
      <button class="pasta-gec" type="button">Sonra</button>
    </div>`
  document.body.appendChild(el)
  gsap.from(el, { autoAlpha: 0, duration: 1 })
  gsap.from($('.pasta-ic', el), { y: 30, autoAlpha: 0, duration: 1.4, ease: 'expo.out', delay: 0.2 })

  const mumlar = $$<HTMLButtonElement>('.mum', el)
  const ipucu = $('.pasta-ipucu', el)
  let akis: MediaStream | null = null
  let bitti = false

  const kapat = () => {
    akis?.getTracks().forEach((t) => t.stop())
    gsap.to(el, { autoAlpha: 0, duration: 0.8, onComplete: () => el.remove() })
  }
  const sondur = (m: HTMLElement) => {
    if (m.classList.contains('sondu')) return
    m.classList.add('sondu')
    ses.vuus(0.5)
    if (mumlar.every((x) => x.classList.contains('sondu'))) tamam()
  }
  const tamam = () => {
    if (bitti) return
    bitti = true
    akis?.getTracks().forEach((t) => t.stop())
    yaz(anahtar, true)
    window.setTimeout(() => {
      ses.cin()
      kutla(130)
      titret([40, 80, 40, 80, 160])
      ipucu.innerHTML = 'Dileğin kabul olsun. Benimki çoktan oldu: <em>sen</em>.'
      $('.pasta-dugmeler', el).innerHTML = '<button class="dugme pasta-bitir" type="button">Siteye geç</button>'
      $('.pasta-bitir', el).addEventListener('click', kapat)
      $('.pasta-gec', el).remove()
      window.setTimeout(() => sirBul('dogumgunu'), 1200)
    }, 700)
  }

  mumlar.forEach((m) => m.addEventListener('click', () => sondur(m)))
  $('.pasta-gec', el).addEventListener('click', kapat)
  $('.pasta-dokun', el).addEventListener('click', () => {
    ses.baslat()
    const kalan = mumlar.filter((m) => !m.classList.contains('sondu'))
    kalan.forEach((m, i) => window.setTimeout(() => sondur(m), 140 * i))
  })

  // Mikrofonla üfleme: sesin gücü belli bir eşiği geçtikçe mumlar teker teker söner
  $('.pasta-mikrofon', el).addEventListener('click', async () => {
    ses.baslat()
    try {
      akis = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
    } catch {
      ipucu.textContent = 'Mikrofona izin verilmedi; mumlara dokunarak da söndürebilirsin.'
      return
    }
    const ctx = ses.ctx ?? new AudioContext()
    const kaynak = ctx.createMediaStreamSource(akis)
    const analiz = ctx.createAnalyser()
    analiz.fftSize = 1024
    kaynak.connect(analiz)
    const veri = new Float32Array(analiz.fftSize)
    ipucu.textContent = 'Şimdi üfle…'
    let birikim = 0
    let son = performance.now()
    const dinle = (t: number) => {
      if (bitti || !el.isConnected) return
      const dt = (t - son) / 1000
      son = t
      analiz.getFloatTimeDomainData(veri)
      let toplam = 0
      for (const v of veri) toplam += v * v
      const guc = Math.sqrt(toplam / veri.length)
      const esiyor = guc > 0.09
      el.classList.toggle('esiyor', esiyor)
      if (esiyor) {
        birikim += dt * Math.min(3, guc / 0.09)
        if (birikim > 0.11) {
          birikim = 0
          const kalan = mumlar.filter((m) => !m.classList.contains('sondu'))
          if (kalan.length) sondur(kalan[Math.floor(Math.random() * kalan.length)])
        }
      }
      requestAnimationFrame(dinle)
    }
    requestAnimationFrame(dinle)
  })
}
