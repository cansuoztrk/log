import type Lenis from 'lenis'
import { PERDELER, YENI_BOLUMLER } from '../perdeler'
import { gorulenler, perdeHaritasi } from './perde'
import { ICERIK } from '../icerik'
import { ses } from '../cekirdek/ses'
import { bulunanlar, SIRLAR, sirBul, sirDinle } from '../cekirdek/sirlar'
import { type Anlik, saatYazi, sayi, simdi } from '../cekirdek/zaman'
import { notlarCekmeceHTML } from '../bolumler/ruzgar'
import { uykuIsigi } from './uyku'
import { fisiltiAc } from './fisilti'
import { $, $$, gsap, ikon, ScrollTrigger } from '../bolumler/yardimci'

const { ben, sen, sarki } = ICERIK

/* ─── Bildirim (toast) — aynı anda tek bir tane, diğerleri sırada bekler ─── */
interface Bildirim {
  ust: string
  baslik: string
  metin?: string
  simge?: string
  sure?: number
  tik?: () => void
}
const sira: Bildirim[] = []
let gosteriliyor = false

export function bildir(o: Bildirim) {
  sira.push(o)
  if (!gosteriliyor) siradaki()
}

function siradaki() {
  const o = sira.shift()
  if (!o) {
    gosteriliyor = false
    return
  }
  gosteriliyor = true
  const kutu = $('#bildirimler')
  const el = document.createElement('div')
  el.className = 'bildirim'
  el.setAttribute('role', 'status')
  el.innerHTML = `<span class="ikon">${o.simge ?? '✦'}</span><div><small>${o.ust}</small><b>${o.baslik}</b>${o.metin ? `<p>${o.metin}</p>` : ''}</div>`
  kutu.appendChild(el)
  gsap.from(el, { y: -24, opacity: 0, scale: 0.96, duration: 0.8, ease: 'expo.out' })
  let kapandi = false
  const kapat = () => {
    if (kapandi) return
    kapandi = true
    gsap.to(el, {
      y: -16,
      opacity: 0,
      duration: 0.45,
      onComplete: () => {
        el.remove()
        window.setTimeout(siradaki, 450)
      },
    })
  }
  const zaman = window.setTimeout(kapat, o.sure ?? 8000)
  el.addEventListener('click', () => {
    window.clearTimeout(zaman)
    kapat()
    o.tik?.()
  })
}

/* ─── Üst çubuk, menü, çekmeceler ─── */
export function ustKur(z: Anlik, lenis: Lenis | null) {
  const git = (hedef: string | HTMLElement) => {
    const el = typeof hedef === 'string' ? $(hedef) : hedef
    if (lenis) lenis.scrollTo(el, { duration: 2.2 })
    else el.scrollIntoView({ behavior: 'smooth' })
  }

  const ust = $('#ust')
  const menu = $('#menu')
  ust.innerHTML = /* html */ `
    <a class="marka" href="#acilis" aria-label="Başa dön"><span class="marka-isaret">${sen.ad[0]}·${ben.ad[0]}</span><span class="marka-ad">Önce Sana Doğar</span></a>
    <div class="ust-yol" aria-hidden="true"><span>İST</span><div class="yol-cizgi"><div class="yol-dolu"></div><svg class="yol-kalp"><use href="#i-kalp"/></svg></div><span>BAKI</span></div>
    <div class="saatler"><span>İST <b class="s-ist">--:--</b></span><span>BAKI <b class="s-baku">--:--</b></span></div>
    <div class="ust-dugmeler">
      <button class="ikon-dugme not-dugme" type="button" aria-label="Bugünün notu">${ikon('zarf')}<span class="nokta"></span></button>
      <button class="ikon-dugme sir-dugme" type="button" aria-label="Sırlar">${ikon('yildiz')}<span class="rozet">0</span></button>
      <button class="ikon-dugme ses-dugme" type="button" aria-label="Sesi aç/kapat"><span class="ses-dalga"><i></i><i></i><i></i><i></i></span></button>
      <button class="ikon-dugme menu-dugme" type="button" aria-label="Bölümler" aria-expanded="false">${ikon('menu')}</button>
    </div>`

  // saatler
  const saatler = () => {
    const an = simdi()
    $('.s-ist', ust).textContent = saatYazi(an, ben.saatDilimi)
    $('.s-baku', ust).textContent = saatYazi(an, sen.saatDilimi)
  }
  saatler()
  window.setInterval(saatler, 15000)

  // yol çubuğu: İstanbul'dan Bakü'ye
  const dolu = $('.yol-dolu', ust)
  const kalp = $<SVGElement>('.yol-kalp', ust)
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (s) => {
      dolu.style.transform = `scaleX(${s.progress})`
      kalp.style.left = `${s.progress * 100}%`
      // aşağı kayarken gizlen, yukarı çıkarken görün
      ust.classList.toggle('saklan', s.direction === 1 && s.scroll() > 400 && !menu.classList.contains('acik'))
    },
  })

  // ses
  const sesD = $('.ses-dugme', ust)
  ses.dinle((acik) => sesD.classList.toggle('ses-kapali', !acik))
  sesD.addEventListener('click', () => ses.degistir())

  // not
  $('.not-dugme', ust).addEventListener('click', () => {
    $('.nokta', ust).remove()
    git('#ruzgar')
  })

  // menü
  // perdelere göre gruplanmış bölümler; görülenler ve bu sürümle gelenler işaretli
  const gorulen = gorulenler()
  const isaret = (id: string) =>
    YENI_BOLUMLER.includes(id) && !gorulen.has(id) ? '<i class="mp-yeni">yeni</i>' : `<i class="mp-nokta${gorulen.has(id) ? ' goruldu' : ''}" aria-hidden="true"></i>`
  let sira = 0
  menu.innerHTML = /* html */ `
    <p class="etiket">Bölümler <small class="mp-toplam"></small></p>
    <div class="menu-perdeler">
      ${perdeHaritasi()
        .filter((g) => g.bolumler.length)
        .map(
          (g, i) => `<div class="menu-perde">
            <a class="mp-bas" href="#${g.perde ? `perde-${PERDELER.indexOf(g.perde) + 1}` : 'acilis'}"><span>${g.perde ? `${g.perde.no}. Perde` : 'Açılış'}</span><b>${g.perde?.ad ?? 'Önce Sana Doğar'}</b><small data-grup="${i}"></small></a>
            <ol class="menu-liste">${g.bolumler
              .map((b) => `<li style="transition-delay:${0.025 * sira++}s"><a href="#${b.id}" data-id="${b.id}"><span>${b.dataset.bolum}</span>${b.dataset.ad}${isaret(b.id)}</a></li>`)
              .join('')}</ol>
          </div>`,
        )
        .join('')}
    </div>
    <div class="menu-alt">
      <span>Tanışmamızın <b>${sayi(z.gunNo)}.</b> günü · birlikte <b>${sayi(z.sevgiliGun)}</b> gün</span>
      <span class="menu-dugmeler">
        <button class="dugme hayalet bugun-menu" type="button"><span aria-hidden="true">✦</span><span>Bugün</span></button>
        <button class="dugme hayalet uyku-ac" type="button"><span aria-hidden="true">☾</span><span>Uyku ışığı</span></button>
        <button class="dugme hayalet fisilti-menu" type="button"><span aria-hidden="true">💬</span><span>Fısıltılar</span></button>
        ${sarki.spotify || sarki.youtube ? `<a class="dugme hayalet" href="${sarki.spotify || sarki.youtube}" target="_blank" rel="noopener">${ikon('muzik')}<span>${sarki.baslik || 'Şarkımız'}${sarki.sanatci ? ` · ${sarki.sanatci}` : ''}</span></a>` : ''}
      </span>
    </div>`
  const sayaclar = () => {
    const g = gorulenler()
    const gruplar = perdeHaritasi().filter((x) => x.bolumler.length)
    gruplar.forEach((x, i) => {
      const el = menu.querySelector(`[data-grup="${i}"]`)
      if (el) el.textContent = `${x.bolumler.filter((b) => g.has(b.id)).length}/${x.bolumler.length}`
    })
    const hepsi = gruplar.flatMap((x) => x.bolumler)
    $('.mp-toplam', menu).textContent = `· ${hepsi.filter((b) => g.has(b.id)).length}/${hepsi.length} gördün`
  }
  sayaclar()
  window.addEventListener('bolum-goruldu', (e) => {
    const id = (e as CustomEvent<string>).detail
    const i = menu.querySelector(`a[data-id="${id}"] i`)
    if (i) i.outerHTML = '<i class="mp-nokta goruldu" aria-hidden="true"></i>'
    sayaclar()
  })
  const menuD = $('.menu-dugme', ust)
  const menuAc = (ac: boolean) => {
    menu.classList.toggle('acik', ac)
    menuD.setAttribute('aria-expanded', String(ac))
    menuD.innerHTML = ikon(ac ? 'kapat' : 'menu')
    if (ac) lenis?.stop()
    else lenis?.start()
  }
  menuD.addEventListener('click', () => menuAc(!menu.classList.contains('acik')))
  $('.bugun-menu', menu).addEventListener('click', () => {
    menuAc(false)
    window.dispatchEvent(new Event('bugun-ac'))
  })
  $('.uyku-ac', menu).addEventListener('click', () => {
    menuAc(false)
    uykuIsigi()
  })
  $('.fisilti-menu', menu).addEventListener('click', () => {
    menuAc(false)
    fisiltiAc()
  })
  for (const a of $$<HTMLAnchorElement>('a[href^="#"]', menu)) {
    a.addEventListener('click', (e) => {
      e.preventDefault()
      menuAc(false)
      git(a.getAttribute('href')!)
    })
  }
  // İki harfe beş kez art arda dokunmak: ☺️ yağmuru (sır)
  let markaSayac = 0
  let markaZaman = 0
  $('.marka', ust).addEventListener('click', (e) => {
    e.preventDefault()
    markaSayac++
    window.clearTimeout(markaZaman)
    markaZaman = window.setTimeout(() => {
      if (markaSayac < 5) git('#acilis')
      markaSayac = 0
    }, 700)
    if (markaSayac === 5) {
      window.dispatchEvent(new Event('gulucuk'))
      ses.cin()
      sirBul('gulucuk')
    }
  })

  // çekmeceler
  const perde = $('.perde')
  const sirC = $('#sirlar-cekmece')
  const notC = $('#notlar-cekmece')
  const genelC = $('#genel-cekmece')
  const kapatHepsi = () => {
    for (const c of [sirC, notC, genelC]) c.classList.remove('acik')
    perde.classList.remove('acik')
    lenis?.start()
  }
  const cekmeceAc = (c: HTMLElement, html: string) => {
    c.innerHTML = html
    $('.kapat', c).addEventListener('click', kapatHepsi)
    c.classList.add('acik')
    perde.classList.add('acik')
    lenis?.stop()
    return c
  }
  perde.addEventListener('click', kapatHepsi)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      kapatHepsi()
      menuAc(false)
    }
  })

  const sirlarAc = () => cekmeceAc(sirC, sirlarHTML())
  $('.sir-dugme', ust).addEventListener('click', sirlarAc)
  const rozet = $('.rozet', ust)
  const rozetYaz = () => (rozet.textContent = String(bulunanlar().length))
  rozetYaz()
  sirDinle((sir, yeni) => {
    rozetYaz()
    if (yeni) bildir({ ust: 'Bir sır buldun', baslik: sir.ad, metin: sir.mesaj, tik: sirlarAc, sure: 11000 })
  })

  return {
    notlarAc: () => cekmeceAc(notC, notlarCekmeceHTML()),
    sirlarAc,
    git,
    /** Herhangi bir bölüm kendi çekmecesini açabilsin (ör. cüzdan) */
    cekmece: (html: string) => cekmeceAc(genelC, html),
  }
}

function sirlarHTML() {
  const b = new Set(bulunanlar())
  return /* html */ `
    <div class="cekmece-bas"><h3>Sırlar</h3><button class="ikon-dugme kapat" type="button" aria-label="Kapat">${ikon('kapat')}</button></div>
    <div class="cekmece-govde" data-lenis-prevent>
      <div class="sir-ilerleme"><span>${b.size} / ${SIRLAR.length}</span><div class="cubuk"><i style="width:${(b.size / SIRLAR.length) * 100}%"></i></div></div>
      <p class="dipnot">Bu sitenin içine küçük sürprizler sakladım. Bazıları bir dokunuşla bulunur, bazıları yalnızca belli bir günde ya da saatte açılır. Acele yok; her gün biraz.</p>
      ${SIRLAR.map((s) =>
        b.has(s.id)
          ? `<div class="sir bulundu"><span class="sir-ikon">✦</span><div><h4>${s.ad}</h4><p>${s.mesaj}</p></div></div>`
          : `<div class="sir"><span class="sir-ikon">?</span><div><h4>Kilitli</h4><p>${s.ipucu}</p></div></div>`,
      ).join('')}
    </div>`
}
