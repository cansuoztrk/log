import { ICERIK } from '../icerik'
import { ILKLER, type Ilk } from '../ilkler'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { ardayaYaz } from '../cekirdek/posta'
import { type Anlik, tarihYazi } from '../cekirdek/zaman'
import { $, $$, belir, gsap, kacir, satirSatir, titret } from './yardimci'

const { sen } = ICERIK
type Yazilan = Record<string, { tarih: string; not: string }>

const yazilanlar = () => oku<Yazilan>('ilkler', {})
/** İçerikte yazılı olan ya da Eln'in sitede yazdığı */
const kayit = (i: Ilk, y: Yazilan) => (i.tarih ? { tarih: i.tarih, not: i.not ?? '', sabit: true } : y[i.id] ? { ...y[i.id], sabit: false } : null)

function satirHTML(i: Ilk, y: Yazilan) {
  const k = kayit(i, y)
  const durum = k ? 'dolu' : i.gelecek ? 'gelecek' : 'bos'
  return /* html */ `
    <li class="ilk ${durum}${k?.sabit ? ' basili' : ''}" data-id="${i.id}">
      <button class="ilk-satir" type="button" ${k?.sabit ? 'disabled' : ''}>
        <span class="ilk-simge" aria-hidden="true">${i.simge}</span>
        <span class="ilk-ad">${i.ad}</span>
        <span class="ilk-tarih">${k ? tarihYazi(k.tarih) : i.gelecek ? 'henüz değil ⏳' : '__ . __ . ____'}</span>
        <span class="ilk-not">${k ? kacir(k.not) : i.gelecek ? 'O gün geldiğinde buraya yaz.' : 'Hatırlıyor musun? Dokun, yaz.'}</span>
      </button>
    </li>`
}

export function ilklerHTML(z: Anlik) {
  const y = yazilanlar()
  const yasanan = ILKLER.filter((i) => kayit(i, y)).length
  return /* html */ `
  <section id="ilkler" class="bolum" data-bolum="" data-ad="İlklerimiz">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>İlklerimiz defteri</p>
        <h2 class="baslik">Yaşadığımız ilkler, <em>bekleyenler</em>.</h2>
        <p class="metin">Bazı tarihleri ben unuttum; belki sen hatırlarsın. Boş satırlara dokun, yaz: deftere işlenir, bana da haber gelir. Henüz yaşamadıklarımız da burada, sırasını bekliyor. Her biri yaşandığı gün buraya yazılacak.</p>
      </div>
      <div class="defter">
        <p class="defter-bas"><span>Yaşadıklarımız: <b class="d-yasanan">${yasanan}</b></span><span>Bekleyenler: <b class="d-bekleyen">${ILKLER.length - yasanan}</b></span><span class="defter-tarih">${tarihYazi(z.bugun)}</span></p>
        <ol class="ilk-liste">${ILKLER.map((i) => satirHTML(i, y)).join('')}</ol>
      </div>
    </div>
  </section>`
}

export function ilklerKur(z: Anlik) {
  const bolum = $('#ilkler')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('.defter', bolum)])
  const liste = $('.ilk-liste', bolum)

  const sayaclar = () => {
    const y = yazilanlar()
    const yasanan = ILKLER.filter((i) => kayit(i, y)).length
    $('.d-yasanan', bolum).textContent = String(yasanan)
    $('.d-bekleyen', bolum).textContent = String(ILKLER.length - yasanan)
  }

  const kapat = () => {
    for (const f of $$('.ilk-yaz', liste)) f.remove()
    for (const li of $$('.ilk.yaziliyor', liste)) li.classList.remove('yaziliyor')
  }

  // tek dinleyici: satırlar yeniden çizilse de çalışır
  liste.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('.ilk-satir')
    if (!b) return
    const li = b.closest<HTMLElement>('.ilk')!
    if (li.classList.contains('basili')) return
    const zatenAcik = li.classList.contains('yaziliyor')
    kapat()
    if (zatenAcik) return
    li.classList.add('yaziliyor')
    const i = ILKLER.find((x) => x.id === li.dataset.id)!
    const eski = yazilanlar()[i.id]
    li.insertAdjacentHTML(
      'beforeend',
      /* html */ `
      <form class="ilk-yaz" autocomplete="off">
        <label><span>Ne zaman?</span><input type="date" name="tarih" required value="${eski?.tarih ?? (i.gelecek ? z.bugun : '')}" max="${z.bugun}" min="2025-01-01" /></label>
        <label><span>Küçük bir not</span><input type="text" name="not" maxlength="140" placeholder="${i.gelecek ? 'O an nasıldı?' : 'Ne olmuştu, ne demiştik?'}" value="${kacir(eski?.not ?? '')}" /></label>
        <button class="dugme" type="submit"><span>Deftere yaz</span></button>
      </form>`,
    )
    gsap.from($('.ilk-yaz', li), { autoAlpha: 0, y: -6, duration: 0.45, ease: 'power2.out' })
    ses.tik()
  })

  liste.addEventListener('submit', (e) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const li = form.closest<HTMLElement>('.ilk')!
    const i = ILKLER.find((x) => x.id === li.dataset.id)!
    const v = new FormData(form)
    const tarih = String(v.get('tarih') ?? '')
    const not = String(v.get('not') ?? '').trim()
    if (!tarih) return
    const y = yazilanlar()
    const ilkKez = !y[i.id]
    y[i.id] = { tarih, not }
    yaz('ilkler', y)
    // satırı yeniden yaz: mürekkep soldan sağa akar
    const kap = document.createElement('div')
    kap.innerHTML = satirHTML(i, y)
    const yeniLi = kap.firstElementChild as HTMLElement
    li.replaceWith(yeniLi)
    gsap.fromTo(yeniLi.querySelectorAll('.ilk-tarih, .ilk-not'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.2, stagger: 0.25, ease: 'power2.out' })
    sayaclar()
    ses.cin()
    titret([15, 30, 15])
    if (i.gelecek && ilkKez) window.dispatchEvent(new CustomEvent('kutla', { detail: 70 }))
    void ardayaYaz(`${sen.ad} ilklerimize yazdı ✍️`, `${i.simge} ${i.ad}: ${tarihYazi(tarih)}${not ? ` · ${not}` : ''}`, ['writing_hand'])
    window.setTimeout(() => sirBul('ilk'), 1000)
  })
}
