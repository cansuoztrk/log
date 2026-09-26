import { PERDELER, YENI_BOLUMLER } from '../perdeler'
import { oku, yaz } from '../cekirdek/depo'
import { $$, azHareket, gsap, SplitText } from '../bolumler/yardimci'

/**
 * Perde arası kartları + hangi bölümlerin görüldüğü.
 * Görülen bölümler menüde işaretlenir; bu sürümle gelen bölümler "yeni" diye çıkar.
 */
const GORULEN = 'gorulenBolumler'

export function gorulenler() {
  return new Set(oku<string[]>(GORULEN, []))
}

/** Bölüm id'lerinin sayfadaki sırasıyla hangi perdeye ait olduğu */
export function perdeHaritasi() {
  const harita: { perde: (typeof PERDELER)[number] | null; bolumler: HTMLElement[] }[] = [{ perde: null, bolumler: [] }]
  for (const el of $$('.perde-kart, [data-bolum]')) {
    if (el.classList.contains('perde-kart')) harita.push({ perde: PERDELER.find((p) => p.no === el.dataset.perde) ?? null, bolumler: [] })
    else harita[harita.length - 1].bolumler.push(el)
  }
  return harita
}

/** Kartları ilgili bölümlerin önüne koyar (main.ts, sayfa kurulduktan hemen sonra) */
export function perdeleriYerlestir() {
  PERDELER.forEach((p, i) => {
    const hedef = document.getElementById(p.ilk)
    if (!hedef) return
    hedef.insertAdjacentHTML(
      'beforebegin',
      /* html */ `
      <section class="perde-kart" id="perde-${i + 1}" data-perde="${p.no}" aria-label="${p.no}. Perde: ${p.ad}">
        <div class="pk-ic">
          <p class="pk-no">${p.no}. Perde</p>
          <h2 class="pk-ad">${p.ad}</h2>
          <p class="pk-soz el">${p.soz}</p>
          <div class="pk-noktalar" aria-hidden="true">${PERDELER.map((_, k) => `<i class="${k < i ? 'gecti' : k === i ? 'burada' : ''}"></i>`).join('<b></b>')}</div>
          <p class="pk-alt"></p>
        </div>
      </section>`,
    )
  })
  // ilk kez: şimdiye kadarki bölümleri görülmüş say (yalnızca bu sürümle gelenler "yeni" kalsın)
  if (oku<string[] | null>(GORULEN, null) === null && oku<{ toplam: number }>('ziyaret', { toplam: 0 }).toplam > 1)
    yaz(
      GORULEN,
      $$('[data-bolum]')
        .map((b) => b.id)
        .filter((id) => !YENI_BOLUMLER.includes(id)),
    )
  for (const { perde, bolumler } of perdeHaritasi()) {
    if (!perde) continue
    const kart = document.querySelector<HTMLElement>(`.perde-kart[data-perde="${perde.no}"]`)!
    kart.querySelector('.pk-alt')!.textContent = `${bolumler.length} bölüm`
  }
}

/** Kart ekrana girince yazılar sahne gibi belirir */
export function perdeleriCanlandir() {
  if (azHareket) return
  for (const kart of $$('.perde-kart')) {
    const ad = kart.querySelector<HTMLElement>('.pk-ad')!
    const harfler = SplitText.create(ad, { type: 'chars' }).chars
    const zaman = gsap.timeline({ scrollTrigger: { trigger: kart, start: 'top 65%', toggleActions: 'play none none none' } })
    zaman
      .from(kart.querySelector('.pk-no'), { autoAlpha: 0, letterSpacing: '0.6em', duration: 1.2, ease: 'power2.out' })
      .from(harfler, { yPercent: 110, autoAlpha: 0, rotate: 6, duration: 1, stagger: 0.05, ease: 'expo.out' }, '-=0.7')
      .from(kart.querySelector('.pk-soz'), { autoAlpha: 0, y: 14, duration: 1.2, ease: 'power2.out' }, '-=0.4')
      .from(kart.querySelectorAll('.pk-noktalar i, .pk-noktalar b'), { scale: 0, autoAlpha: 0, duration: 0.4, stagger: 0.05 }, '-=0.8')
      .from(kart.querySelector('.pk-alt'), { autoAlpha: 0, duration: 0.8 }, '-=0.3')
  }
}

/** Bir bölüm ekranda etkin olunca "görüldü" sayılır */
export function bolumGoruldu(id: string) {
  const g = gorulenler()
  if (g.has(id)) return
  g.add(id)
  yaz(GORULEN, [...g])
  window.dispatchEvent(new CustomEvent('bolum-goruldu', { detail: id }))
}
