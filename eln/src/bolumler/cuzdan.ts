import { ICERIK } from '../icerik'
import { KUPONLAR, type Kupon } from '../kuponlar'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { kimim, ulastir } from '../cekirdek/posta'
import { type Anlik, tarihYazi } from '../cekirdek/zaman'
import { $, azHareket, belir, gsap, ikon, satirSatir, titret } from './yardimci'

const { ben, sen } = ICERIK

interface KuponKaydi {
  id: string
  /** kazındığı gün */
  tarih: string
  /** kullanıldığı gün */
  kullanildi?: string
}

const kayitlar = () => oku<KuponKaydi[]>('kuponlar', []).filter((k) => KUPONLAR.some((x) => x.id === k.id))
const no = (k: Kupon) => String(KUPONLAR.indexOf(k) + 1).padStart(2, '0')
/** Buluşma kuponları, ilk buluşma günü gelince açılır */
const bulusmaGeldi = (bugun: string) => !!ICERIK.ilkBulusma && bugun >= ICERIK.ilkBulusma.slice(0, 10)
const kullanilabilir = (k: Kupon, bugun: string) => k.ne === 'simdi' || bulusmaGeldi(bugun)

/** Bugün gösterilecek kupon: bugün kazınan ya da sıradaki (hepsi toplandıysa null) */
export function bugununKuponu(bugun: string) {
  const kayit = kayitlar()
  const bugunku = kayit.find((k) => k.tarih === bugun)
  if (bugunku) return { kupon: KUPONLAR.find((k) => k.id === bugunku.id)!, kazindi: true }
  const siradaki = KUPONLAR.find((k) => !kayit.some((x) => x.id === k.id))
  return siradaki ? { kupon: siradaki, kazindi: false } : null
}

function kuponHTML(k: Kupon) {
  return /* html */ `
    <div class="kupon-sol" aria-hidden="true">
      <span class="kupon-simge">${k.simge}</span>
      <small class="kupon-no">№ ${no(k)}</small>
    </div>
    <div class="kupon-sag">
      <small class="kupon-tur">${k.ne === 'simdi' ? 'Hemen geçerli' : 'İlk buluşmada geçerli'}</small>
      <b class="kupon-baslik">${k.baslik}</b>
      <span class="kupon-kosul">${k.kosul}</span>
      <span class="kupon-imza">— ${ben.ad}</span>
    </div>`
}

export function cuzdanHTML(z: Anlik) {
  const b = bugununKuponu(z.bugun)
  const sayi = kayitlar().length
  return /* html */ `
  <section id="cuzdan" class="bolum" data-bolum="" data-ad="Buluşma Cüzdanı">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Buluşma cüzdanı</p>
        <h2 class="baslik">Her gün bir kupon. <em>Biriktir.</em></h2>
        <p class="metin">Uğradığın her yeni gün sana kazıyınca açılan bir kupon bırakıyorum. Bazıları hemen geçerli; “Kullan”a bastığın an telefonuma düşer, gereğini yaparım. Bazıları ise ilk buluşmamızı bekliyor. Hiçbirinin son kullanma tarihi yok.</p>
      </div>
      <div class="kupon-sahne" data-dom>
        ${
          b
            ? `<div class="kupon-golge"><div class="kupon ${b.kupon.ne}${b.kazindi ? ' acik' : ''}" data-id="${b.kupon.id}">
                ${kuponHTML(b.kupon)}
                ${b.kazindi ? '' : '<canvas class="kazi" tabindex="0" role="button" aria-label="Kuponu kazı (ya da Enter’a bas)"></canvas>'}
              </div></div>`
            : `<div class="kupon-golge"><div class="kupon dolu acik">
                <div class="kupon-sol" aria-hidden="true"><span class="kupon-simge">🎟️</span><small class="kupon-no">№ ∞</small></div>
                <div class="kupon-sag"><small class="kupon-tur">Cüzdan doldu</small><b class="kupon-baslik">Bütün kuponları topladın</b><span class="kupon-kosul">Yenilerini yazıyorum. O zamana kadar cüzdanındakileri harca; ben borçlu kalmayı seviyorum.</span><span class="kupon-imza">— ${ben.ad}</span></div>
              </div></div>`
        }
        <p class="kupon-ipucu dipnot">${b && !b.kazindi ? 'Parmağınla kazı ✦' : ''}</p>
        <div class="kupon-alt">
          <button class="dugme kupon-kullan" type="button" hidden>${ikon('kalp')}<span>Şimdi kullan</span></button>
          <button class="dugme hayalet cuzdan-ac" type="button"><span class="bilet" aria-hidden="true">🎟️</span><span>Cüzdanım · <b class="cuzdan-sayi">${sayi}</b></span></button>
        </div>
        <p class="kupon-durum dipnot" aria-live="polite"></p>
      </div>
    </div>
  </section>`
}

/** Tuvali altın-pembe bir folyoyla kaplar; kazındıkça altındaki kupon görünür. */
function kaziKur(tuval: HTMLCanvasElement, bitince: () => void) {
  // kupon hafif eğik durduğu için ölçü dönüşümsüz (offset) boyutlardan alınır
  const px = Math.min(window.devicePixelRatio || 1, 2)
  const w = tuval.offsetWidth
  const h = tuval.offsetHeight
  tuval.width = Math.round(w * px)
  tuval.height = Math.round(h * px)
  const x = tuval.getContext('2d', { willReadFrequently: true })!
  x.setTransform(px, 0, 0, px, 0, 0)
  const g = x.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#d9a86c')
  g.addColorStop(0.3, '#f6dcae')
  g.addColorStop(0.55, '#eab0bd')
  g.addColorStop(0.8, '#f3cf9c')
  g.addColorStop(1, '#c98f9b')
  x.fillStyle = g
  x.fillRect(0, 0, w, h)
  // ince parıltı çizgileri
  x.strokeStyle = 'rgba(255,255,255,0.16)'
  x.lineWidth = 1
  for (let i = -h; i < w; i += 6) {
    x.beginPath()
    x.moveTo(i, 0)
    x.lineTo(i + h, h)
    x.stroke()
  }
  // serpiştirilmiş küçük kalpler
  x.font = '11px serif'
  x.textAlign = 'center'
  for (let i = 0; i < 26; i++) {
    const s = Math.sin(i * 91.7) * 43758.5
    const r = s - Math.floor(s)
    const s2 = Math.sin(i * 12.3) * 9631.1
    const r2 = s2 - Math.floor(s2)
    x.fillStyle = `rgba(120,50,70,${0.12 + r * 0.14})`
    x.fillText(i % 3 ? '♥' : '✦', r2 * w, 10 + r * (h - 14))
  }
  x.fillStyle = 'rgba(90,35,50,0.72)'
  x.font = '700 12px "Plus Jakarta Sans Variable", sans-serif'
  x.fillText('K  A  Z  I', w / 2, h / 2 - 2)
  x.font = '600 9.5px "Plus Jakarta Sans Variable", sans-serif'
  x.fillStyle = 'rgba(90,35,50,0.5)'
  x.fillText(`${sen.ad.toLocaleUpperCase('tr-TR')} İÇİN · ${ben.ad.toLocaleUpperCase('tr-TR')}’DAN`, w / 2, h / 2 + 16)

  x.globalCompositeOperation = 'destination-out'
  x.strokeStyle = '#000' // silgi tam opak olmalı, yoksa her geçişte folyonun ancak bir kısmı kalkar
  x.fillStyle = '#000'
  x.lineCap = 'round'
  x.lineJoin = 'round'
  x.lineWidth = Math.max(30, Math.min(w, h) * 0.22)

  let basili = false
  let onceki: { x: number; y: number } | null = null
  let sonSes = 0
  let sonOlcum = 0
  let bitti = false
  const nokta = (e: PointerEvent) => ({ x: e.offsetX, y: e.offsetY })
  const olc = () => {
    const v = x.getImageData(0, 0, tuval.width, tuval.height).data
    let bos = 0
    let toplam = 0
    for (let i = 3; i < v.length; i += 4 * 23) {
      toplam++
      if (v[i] < 40) bos++
    }
    return bos / toplam
  }
  const bitir = () => {
    if (bitti) return
    bitti = true
    basili = false
    bitince()
  }
  const kazi = (p: { x: number; y: number }) => {
    x.beginPath()
    if (onceki) {
      x.moveTo(onceki.x, onceki.y)
      x.lineTo(p.x, p.y)
      x.stroke()
    } else {
      x.arc(p.x, p.y, x.lineWidth / 2, 0, Math.PI * 2)
      x.fill()
    }
    onceki = p
    const t = performance.now()
    if (t - sonSes > 75) {
      sonSes = t
      ses.kazi()
      titret(3)
    }
    if (t - sonOlcum > 160) {
      sonOlcum = t
      if (olc() > 0.52) bitir()
    }
  }
  tuval.addEventListener('pointerdown', (e) => {
    if (bitti) return
    e.preventDefault()
    ses.baslat()
    basili = true
    onceki = null
    try {
      tuval.setPointerCapture(e.pointerId)
    } catch {
      /* yok */
    }
    kazi(nokta(e))
  })
  tuval.addEventListener('pointermove', (e) => basili && !bitti && kazi(nokta(e)))
  const birak = () => {
    basili = false
    onceki = null
    if (!bitti && olc() > 0.4) bitir()
  }
  tuval.addEventListener('pointerup', birak)
  tuval.addEventListener('pointercancel', birak)
  // klavye ya da kazıyamayanlar için
  tuval.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      ses.baslat()
      bitir()
    }
  })
}

export function cuzdanKur(z: Anlik, cekmece: (html: string) => HTMLElement) {
  const bolum = $('#cuzdan')
  satirSatir($('.baslik', bolum))
  belir($('.bolum-bas .metin', bolum))
  belir($('.kupon-sahne', bolum))

  const kuponEl = bolum.querySelector<HTMLElement>('.kupon[data-id]')
  const kupon = KUPONLAR.find((k) => k.id === kuponEl?.dataset.id) ?? null
  const kullanD = $<HTMLButtonElement>('.kupon-kullan', bolum)
  const ipucu = $('.kupon-ipucu', bolum)
  const durum = $('.kupon-durum', bolum)
  const sayiEl = $('.cuzdan-sayi', bolum)

  const kullanDugmesi = () => {
    if (!kupon || !kuponEl?.classList.contains('acik')) return
    const kayit = kayitlar().find((k) => k.id === kupon.id)
    kullanD.hidden = !kullanilabilir(kupon, z.bugun) || !!kayit?.kullanildi
    ipucu.textContent = kayit?.kullanildi
      ? `Bu kuponu ${tarihYazi(kayit.kullanildi)} günü kullandın. Yarın yenisi gelir.`
      : kupon.ne === 'simdi'
        ? 'Hemen geçerli. İstediğin an kullan; ister bugün, ister bir ay sonra.'
        : bulusmaGeldi(z.bugun)
          ? 'Buluşma günü geldi. Bu kupon artık geçerli. ☺️'
          : 'Cüzdanına eklendi. İlk buluşmamızda geçerli. Yarın yenisi gelir.'
  }
  kullanDugmesi()

  const kullan = async (k: Kupon) => {
    const liste = oku<KuponKaydi[]>('kuponlar', [])
    const kayit = liste.find((x) => x.id === k.id)
    if (!kayit || kayit.kullanildi) return
    kayit.kullanildi = z.bugun
    yaz('kuponlar', liste)
    ses.cin()
    titret([20, 50, 20])
    window.dispatchEvent(new CustomEvent('kutla', { detail: 24 }))
    const sonuc =
      kimim() === 'eln'
        ? await ulastir(`${sen.ad} bir kupon kullandı 🎟️`, `${k.simge} ${k.baslik}\n${k.kosul}\n\nKuponun gereğini yap. ☺️`, ['ticket'])
        : 'yok'
    const mesaj =
      sonuc === 'ntfy'
        ? `Kupon ${ben.ad}’nın telefonuna düştü. Artık borçlu; gereğini yapacak. ☺️`
        : sonuc === 'wa' || sonuc === 'paylas'
          ? `Kupon hazır. Açılan pencereden ${ben.ad}’ya gönder.`
          : sonuc === 'kopya'
            ? `Kupon panoya kopyalandı. ${ben.ad}’ya yapıştırman yeter.`
            : `Kupon kullanıldı olarak işaretlendi.`
    return mesaj
  }

  kullanD.addEventListener('click', async () => {
    if (!kupon) return
    kullanD.disabled = true
    const m = await kullan(kupon)
    kullanD.disabled = false
    if (m) durum.textContent = m
    kullanDugmesi()
    if (kuponEl) gsap.fromTo(kuponEl, { rotate: 0 }, { rotate: -1.5, yoyo: true, repeat: 1, duration: 0.18 })
  })

  // Kazı
  const tuval = bolum.querySelector<HTMLCanvasElement>('canvas.kazi')
  if (tuval && kupon && kuponEl) {
    const kur = () => {
      kaziKur(tuval, () => {
        const liste = oku<KuponKaydi[]>('kuponlar', [])
        if (!liste.some((k) => k.id === kupon.id)) liste.push({ id: kupon.id, tarih: z.bugun })
        yaz('kuponlar', liste)
        sayiEl.textContent = String(liste.length)
        kuponEl.classList.add('acik')
        ses.cin()
        titret([20, 40, 20, 40, 60])
        window.dispatchEvent(new CustomEvent('kutla', { detail: 16 }))
        gsap.to(tuval, { autoAlpha: 0, duration: azHareket ? 0.2 : 0.7, ease: 'power2.out', onComplete: () => tuval.remove() })
        if (!azHareket) gsap.fromTo($('.kupon-sag', kuponEl), { scale: 0.96 }, { scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.5)' })
        kullanDugmesi()
        if (liste.length === 1) window.setTimeout(() => sirBul('kupon'), 1200)
      })
      kuponEl.classList.add('hazir')
    }
    // tuval ölçüsü doğru çıksın diye fontlar ve yerleşim oturduktan sonra
    void document.fonts.ready.then(() => requestAnimationFrame(kur))
  }

  // Cüzdan çekmecesi
  const cuzdanAc = () => {
    const c = cekmece(cuzdanCekmeceHTML(z.bugun))
    c.querySelectorAll<HTMLButtonElement>('.ck-kullan').forEach((d) =>
      d.addEventListener('click', async () => {
        const k = KUPONLAR.find((x) => x.id === d.dataset.id)
        if (!k) return
        d.disabled = true
        const m = await kullan(k)
        cuzdanAc()
        if (m) {
          const p = $('.ck-durum', c)
          p.textContent = m
        }
        if (k.id === kupon?.id) kullanDugmesi()
      }),
    )
  }
  $('.cuzdan-ac', bolum).addEventListener('click', cuzdanAc)
}

function cuzdanCekmeceHTML(bugun: string) {
  const kayit = kayitlar().slice().reverse()
  const hemen = kayit.filter((k) => KUPONLAR.find((x) => x.id === k.id)?.ne === 'simdi' && !k.kullanildi).length
  const bekleyen = kayit.filter((k) => KUPONLAR.find((x) => x.id === k.id)?.ne === 'bulusma' && !k.kullanildi).length
  const kalan = KUPONLAR.length - kayit.length
  return /* html */ `
    <div class="cekmece-bas"><h3>Cüzdanım</h3><button class="ikon-dugme kapat" type="button" aria-label="Kapat">${ikon('kapat')}</button></div>
    <div class="cekmece-govde" data-lenis-prevent>
      <p class="dipnot">${
        kayit.length
          ? `<b>${kayit.length}</b> kupon: <b>${hemen}</b> tanesi hemen kullanılabilir, <b>${bekleyen}</b> tanesi ilk buluşmamızı bekliyor.${kalan ? ` Daha ${kalan} kupon var; her gün bir tane.` : ''}`
          : 'Cüzdanın henüz boş. İlk kuponu kazıdığın an buraya düşer.'
      }</p>
      <p class="dipnot ck-durum" aria-live="polite"></p>
      <div class="cuzdan-liste">
        ${kayit
          .map((r) => {
            const k = KUPONLAR.find((x) => x.id === r.id)!
            const sag = r.kullanildi
              ? `<span class="ck-etiket kullanildi">Kullanıldı<br/>${tarihYazi(r.kullanildi)}</span>`
              : kullanilabilir(k, bugun)
                ? `<button class="ck-kullan" type="button" data-id="${k.id}">Kullan</button>`
                : `<span class="ck-etiket">Buluşmada</span>`
            return `<article class="ck ${k.ne}${r.kullanildi ? ' bitti' : ''}">
              <span class="ck-simge" aria-hidden="true">${k.simge}</span>
              <div><small>№ ${no(k)} · ${tarihYazi(r.tarih)}</small><b>${k.baslik}</b><p>${k.kosul}</p></div>
              ${sag}
            </article>`
          })
          .join('')}
      </div>
    </div>`
}
