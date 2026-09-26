import { ICERIK } from '../icerik'
import { oku, yaz } from '../cekirdek/depo'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { ardayaYaz } from '../cekirdek/posta'
import { $, $$, belir, gsap, kacir, satirSatir, titret } from './yardimci'

/**
 * BİR GÜN BİZİM EVİMİZ — izometrik bir oda; Eln eşya eşya seçer (duvar, manzara, perde, çiçek, çay,
 * pikap, çerçeve, evin dostu, ışık). Her seçimin altında Arda'nın bir notu çıkar; hepsi seçilince
 * Arda'ya evin özeti gider. Çizim tamamen koddan (SVG), dosya yok.
 */
interface Secenek {
  id: string
  ad: string
  not: string
}
interface Yuva {
  id: string
  ad: string
  simge: string
  secenekler: Secenek[]
}

const YUVALAR: Yuva[] = [
  {
    id: 'duvar',
    ad: 'Duvar',
    simge: '🎨',
    secenekler: [
      { id: 'krem', ad: 'Krem', not: 'Sade olsun. Sen içerideyken zaten bütün renk sensin.' },
      { id: 'pembe', ad: 'Pembe', not: 'Tabii ki pembe. Bu bir soru bile değildi aslında.' },
      { id: 'gece', ad: 'Gece mavisi', not: 'Gece gibi olsun; yıldızları duvara sen asarsın.' },
    ],
  },
  {
    id: 'manzara',
    ad: 'Pencere',
    simge: '🪟',
    secenekler: [
      { id: 'bogaz', ad: 'Boğaz', not: 'Sabahları Kız Kulesi’ne bakıp çay içeriz. Martılar sana alışır.' },
      { id: 'hazar', ad: 'Hazar', not: 'Akşam olunca Alev Kuleleri yanar; sen “evdeyim” dersin, ben de.' },
      { id: 'ikisi', ad: 'İkisi', not: 'Bir yarısı İstanbul’a, bir yarısı Bakü’ye bakan bir pencere. Ev tam ortamızda olur.' },
    ],
  },
  {
    id: 'perde',
    ad: 'Perde',
    simge: '🎀',
    secenekler: [
      { id: 'pembe', ad: 'Pembe', not: 'Güneş içeri pembe süzülür. Sabahların rengi sen olursun.' },
      { id: 'tul', ad: 'Beyaz tül', not: 'Hafif bir tül; ışık önce sana uğrasın, sonra odaya.' },
      { id: 'yok', ad: 'Perdesiz', not: 'Perde olmasın; ay içeri girsin, ikimize de baksın.' },
    ],
  },
  {
    id: 'cicek',
    ad: 'Çiçek',
    simge: '🌸',
    secenekler: [
      { id: 'zambak', ad: 'Pembe zambak', not: 'Balkonda pembe zambaklar. Her ay bir tane eklerim; söz vermiştim.' },
      { id: 'aycicegi', ad: 'Ayçiçeği', not: 'Hep güneşe dönük dururlar. Sen de bana öyle bakıyorsun.' },
      { id: 'beyaz', ad: 'Beyaz zambak', not: 'Beyaz zambak: sessiz, sade, çok güzel kokar. Sen gibi.' },
    ],
  },
  {
    id: 'cay',
    ad: 'Çay',
    simge: '🍵',
    secenekler: [
      { id: 'ikisi', ad: 'İnce belli + armudu', not: 'Masada iki farklı bardak, aynı demlikten aynı çay. Biz gibi.' },
      { id: 'incebelli', ad: 'İki ince belli', not: 'İstanbul usulü. Sen de alışırsın, ben de sana alışkınım.' },
      { id: 'armudu', ad: 'İki armudu', not: 'Bakü usulü. Mürəbbəsi de senden olsun.' },
    ],
  },
  {
    id: 'pikap',
    ad: 'Pikap',
    simge: '🎶',
    secenekler: [
      { id: 'anilar', ad: 'Anılar', not: 'İlk şarkımız evde hep başta çalar. Anıları orada biriktiririz.' },
      { id: 'nelergizli', ad: 'neler gizli', not: 'Filmimizin jenerik şarkısı; ama bu evde film hiç bitmiyor.' },
      { id: 'sessiz', ad: 'Sessiz', not: 'Bazen hiçbir şey çalmasın. Senin sesin yeter.' },
    ],
  },
  {
    id: 'cerceve',
    ad: 'Çerçeve',
    simge: '🖼️',
    secenekler: [
      { id: 'harita', ad: 'İST–BAKI', not: 'İki şehir ve arasındaki yay. Duvarda bile yan yana dursunlar.' },
      { id: 'ae', ad: 'A+E', not: 'İki harf, bir artı. Evin en görünen duvarında dursun; soran olursa biz anlatırız.' },
      { id: 'bos', ad: 'Boş polaroid', not: 'İlk fotoğrafımız buraya. Şimdilik boş; sırasını bekliyor.' },
    ],
  },
  {
    id: 'dost',
    ad: 'Evin dostu',
    simge: '🐾',
    secenekler: [
      { id: 'kedi', ad: 'Bir kedi', not: 'Adını sen koyarsın. Şartım tek: kucağında uyuduğunda kıskanabilirim.' },
      { id: 'balik', ad: 'Bir balık', not: 'Sessiz bir tanık. Her şeyi görür, kimseye söylemez.' },
      { id: 'biz', ad: 'Sadece biz', not: 'Şimdilik iki minder, iki kişi. Gerisine sonra bakarız.' },
    ],
  },
  {
    id: 'isik',
    ad: 'Işık',
    simge: '💡',
    secenekler: [
      { id: 'sicak', ad: 'Sıcak', not: 'Akşamları sarı, sıcak bir ışık. Eve gelince “oh” dedirten cinsten.' },
      { id: 'pembe', ad: 'Pembe', not: 'Pembe bir abajur. Oda da senin gibi yanakları kızarmış görünür.' },
      { id: 'mum', ad: 'Mumlar', not: 'Masada iki mum. Elektrik kesilsin istiyorum resmen.' },
    ],
  },
]

type Secim = Record<string, string>
const VARSAYILAN: Secim = { duvar: 'krem', manzara: 'ikisi', perde: 'tul', cicek: 'zambak', cay: 'ikisi', pikap: 'anilar', cerceve: 'harita', dost: 'biz', isik: 'sicak' }

// ─── izometrik geometri ───
const CX = 200
const CY = 118
const KX = 13.86
const KY = 8
const KZ = 16
const iso = (x: number, y: number, z = 0) => [CX + (x - y) * KX, CY + (x + y) * KY - z * KZ] as const
const nokta = (...p: [number, number, number?][]) => p.map(([x, y, z]) => iso(x, y, z ?? 0).map((v) => v.toFixed(1)).join(',')).join(' ')
/** yerel çizim düzlemleri: sağ duvar (y=0), sol duvar (x=0, u=-y), zemin/üst yüzey (z=h) */
const SAG = `matrix(${KX} ${KY} 0 ${-KZ} ${CX} ${CY})`
const SOL = `matrix(${KX} ${-KY} 0 ${-KZ} ${CX} ${CY})`
const YATAY = (h: number) => `matrix(${KX} ${KY} ${-KX} ${KY} ${CX} ${CY - h * KZ})`

const kutu = (x0: number, y0: number, x1: number, y1: number, h0: number, h1: number, ust: string, on: string, yan: string) => `
  <polygon points="${nokta([x1, y0, h0], [x1, y1, h0], [x1, y1, h1], [x1, y0, h1])}" fill="${on}"/>
  <polygon points="${nokta([x0, y1, h0], [x1, y1, h0], [x1, y1, h1], [x0, y1, h1])}" fill="${yan}"/>
  <polygon points="${nokta([x0, y0, h1], [x1, y0, h1], [x1, y1, h1], [x0, y1, h1])}" fill="${ust}"/>`

function oda(s: Secim) {
  const duvar = { krem: ['#efe3d3', '#e2d3bf'], pembe: ['#eab9c5', '#dca3b2'], gece: ['#2f3a6e', '#27305c'] }[s.duvar] ?? ['#efe3d3', '#e2d3bf']
  const cizgi = s.duvar === 'gece' ? 'rgba(255,255,255,0.08)' : 'rgba(80,50,30,0.08)'
  // pencere manzarası (sağ duvar yerel düzleminde: x 5.2–8.8, z 3.1–6.5)
  const bogaz = (x0: number, x1: number) => `
    <rect x="${x0}" y="3.1" width="${x1 - x0}" height="3.4" fill="url(#ev-gok)"/>
    <rect x="${x0}" y="3.1" width="${x1 - x0}" height="0.9" fill="#3d6fa8"/>
    <path d="M${x0} 4 Q${(x0 + x1) / 2} 4.35 ${x1} 4 L${x1} 4.25 Q${(x0 + x1) / 2} 4.55 ${x0} 4.25Z" fill="#5c6f8f" opacity=".7"/>
    <g fill="#2a2440"><rect x="${x0 + (x1 - x0) * 0.55}" y="3.95" width="0.14" height="0.6"/><path d="M${x0 + (x1 - x0) * 0.55 - 0.03} 4.55 l0.1 0.28 l0.1 -0.28z"/><ellipse cx="${x0 + (x1 - x0) * 0.58}" cy="3.93" rx="0.35" ry="0.08"/></g>`
  const hazar = (x0: number, x1: number) => `
    <rect x="${x0}" y="3.1" width="${x1 - x0}" height="3.4" fill="url(#ev-gok2)"/>
    <rect x="${x0}" y="3.1" width="${x1 - x0}" height="0.9" fill="#2f5d7a"/>
    <g fill="#ff9b4a">${[0.3, 0.52, 0.72].map((k, i) => `<path d="M${x0 + (x1 - x0) * k} 4 q0.22 ${0.8 + i * 0.25} 0 ${1.2 + i * 0.3} q-0.22 ${-0.4 - i * 0.1} 0 ${-1.2 - i * 0.3}z"/>`).join('')}</g>
    <g fill="#ffd27a" opacity=".6">${[0.3, 0.52, 0.72].map((k, i) => `<path d="M${x0 + (x1 - x0) * k} 4.2 q0.1 ${0.6 + i * 0.2} 0 ${0.9 + i * 0.25} q-0.1 ${-0.3} 0 ${-0.9 - i * 0.25}z"/>`).join('')}</g>`
  const manzara = s.manzara === 'bogaz' ? bogaz(5.2, 8.8) : s.manzara === 'hazar' ? hazar(5.2, 8.8) : `${bogaz(5.2, 7)}${hazar(7, 8.8)}<rect x="6.95" y="3.1" width="0.1" height="3.4" fill="#f4ede2"/>`
  const perde =
    s.perde === 'pembe'
      ? `<path d="M4.7 6.8 L5.9 6.8 Q5.5 5 5.8 2.7 L4.7 2.7Z" fill="#e8577a" opacity=".92"/><path d="M8.1 6.8 L9.3 6.8 L9.3 2.7 L8.2 2.7 Q8.5 5 8.1 6.8Z" fill="#e8577a" opacity=".92"/>`
      : s.perde === 'tul'
        ? `<rect x="5.2" y="3.1" width="3.6" height="3.4" fill="#fff" opacity=".18"/><path d="M4.8 6.8 L5.7 6.8 Q5.4 5 5.6 2.8 L4.8 2.8Z" fill="#fff" opacity=".7"/><path d="M8.3 6.8 L9.2 6.8 L9.2 2.8 L8.4 2.8 Q8.6 5 8.3 6.8Z" fill="#fff" opacity=".7"/>`
        : ''
  // çerçeve (sol duvar yerel düzleminde: u -6.9…-4.5, z 4.1…6.3)
  const cerceveIc =
    s.cerceve === 'harita'
      ? `<rect x="-6.7" y="4.3" width="2" height="1.8" fill="#fbf6ea"/><path d="M-6.3 4.9 Q-5.7 5.9 -5.1 4.9" fill="none" stroke="#e8577a" stroke-width="0.07"/><circle cx="-6.3" cy="4.9" r="0.1" fill="#3d6fa8"/><circle cx="-5.1" cy="4.9" r="0.1" fill="#e8577a"/>`
      : s.cerceve === 'ae'
        ? `<rect x="-6.7" y="4.3" width="2" height="1.8" fill="#dfe6ef"/><g transform="translate(-5.7 5.05) scale(0.045 -0.045)"><text text-anchor="middle" font-family="Caveat, cursive" font-size="16" fill="#2c3f7a">A+E</text><text y="13" text-anchor="middle" font-size="11" fill="#e8577a">♡</text></g>`
        : `<rect x="-6.7" y="4.3" width="2" height="1.8" fill="#f8f2e8"/><rect x="-6.5" y="4.75" width="1.6" height="1.2" fill="#d9d2c6"/><g transform="translate(-5.7 5.2) scale(0.05 -0.05)"><text text-anchor="middle" font-size="14" fill="#9a8f80">?</text></g>`
  // pikaptaki plak rengi
  const plak = { anilar: '#e8577a', nelergizli: '#8a6fd1', sessiz: '#555' }[s.pikap] ?? '#e8577a'
  const donuyor = s.pikap !== 'sessiz'
  // çay bardakları masanın üstünde
  const bardak = (x: number, y: number, tur: 'ince' | 'armudu') => {
    const [bx, by] = iso(x, y, 2.35)
    const tabak = tur === 'ince' ? '#c9412f' : '#2f6fb0'
    const govde = tur === 'ince' ? `M${bx - 4} ${by - 13} Q${bx - 1.5} ${by - 7} ${bx - 3.5} ${by - 1} L${bx + 3.5} ${by - 1} Q${bx + 1.5} ${by - 7} ${bx + 4} ${by - 13}Z` : `M${bx - 3.5} ${by - 13} Q${bx - 1} ${by - 8} ${bx - 4.5} ${by - 3} Q${bx} ${by + 0.5} ${bx + 4.5} ${by - 3} Q${bx + 1} ${by - 8} ${bx + 3.5} ${by - 13}Z`
    return `<ellipse cx="${bx}" cy="${by}" rx="7" ry="2.6" fill="${tabak}"/><ellipse cx="${bx}" cy="${by - 0.4}" rx="5" ry="1.8" fill="#f4ede2"/><path d="${govde}" fill="#b8451f" opacity=".85"/><path d="${govde}" fill="none" stroke="rgba(255,255,255,.7)" stroke-width=".6"/>`
  }
  const cay =
    s.cay === 'ikisi' ? bardak(4.1, 5.5, 'ince') + bardak(5.3, 6.1, 'armudu') : s.cay === 'incebelli' ? bardak(4.1, 5.5, 'ince') + bardak(5.3, 6.1, 'ince') : bardak(4.1, 5.5, 'armudu') + bardak(5.3, 6.1, 'armudu')
  const mumlar =
    s.isik === 'mum'
      ? [[3.7, 6.6], [5.7, 5.2]]
          .map(([x, y]) => {
            const [mx, my] = iso(x, y, 2.35)
            return `<rect x="${mx - 1.6}" y="${my - 9}" width="3.2" height="9" fill="#f7ede0"/><path class="ev-alev" d="M${mx} ${my - 15} q2.4 3.4 0 5.6 q-2.4 -2.2 0 -5.6z" fill="#ffc15e"/>`
          })
          .join('')
      : ''
  // çiçekler (saksı: pencerenin önünde, sağ ön köşe)
  const [px, py] = iso(9.3, 1, 1.3)
  const cicekRenk = { zambak: '#f59fb4', aycicegi: '#f3c233', beyaz: '#fbf6ea' }[s.cicek] ?? '#f59fb4'
  const cicekler = [
    [-9, -30],
    [0, -38],
    [9, -28],
    [-4, -22],
  ]
    .map(([dx, dy], i) => {
      const x = px + dx
      const y = py + dy
      const yap =
        s.cicek === 'aycicegi'
          ? `<circle cx="${x}" cy="${y}" r="5" fill="${cicekRenk}"/><circle cx="${x}" cy="${y}" r="2.2" fill="#6b4020"/>`
          : `<g transform="translate(${x} ${y}) rotate(${i * 17})">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse rx="1.6" ry="4.6" cy="-3.6" fill="${cicekRenk}" transform="rotate(${a})"/>`).join('')}<circle r="1.1" fill="#e8a13a"/></g>`
      return `<path d="M${px} ${py - 4} Q${(px + x) / 2} ${y + 8} ${x} ${y + 3}" fill="none" stroke="#4f8a4a" stroke-width="1.2"/>${yap}`
    })
    .join('')
  // evin dostu (halının yanında)
  const [dx, dy] = iso(7.6, 7.4, 0)
  const dost =
    s.dost === 'kedi'
      ? `<g class="ev-kedi"><ellipse cx="${dx}" cy="${dy - 7}" rx="8" ry="7.5" fill="#e6893a"/><circle cx="${dx - 1}" cy="${dy - 17}" r="5.4" fill="#e6893a"/><path d="M${dx - 5.6} ${dy - 20} l1.3 -5 l3.3 3.2z M${dx + 3.6} ${dy - 20} l-1.3 -5 l-3.3 3.2z" fill="#e6893a"/><path class="ev-kuyruk" d="M${dx + 7} ${dy - 3} q9 -1 7 -12" fill="none" stroke="#e6893a" stroke-width="2.6" stroke-linecap="round"/><circle cx="${dx - 3}" cy="${dy - 17.5}" r=".8" fill="#2a1a14"/><circle cx="${dx + 1}" cy="${dy - 17.5}" r=".8" fill="#2a1a14"/></g>`
      : s.dost === 'balik'
        ? `<ellipse cx="${dx}" cy="${dy - 1}" rx="9" ry="3" fill="rgba(0,0,0,.15)"/><circle cx="${dx}" cy="${dy - 10}" r="10" fill="rgba(160,210,240,.45)" stroke="rgba(255,255,255,.6)" stroke-width=".8"/><g class="ev-balik"><path d="M${dx - 4} ${dy - 10} q3 -3 6 0 q-3 3 -6 0z M${dx + 2} ${dy - 10} l3 -2 l0 4z" fill="#ff8a3d"/></g>`
        : `<ellipse cx="${dx - 6}" cy="${dy - 3}" rx="8" ry="4" fill="#e8577a"/><ellipse cx="${dx + 8}" cy="${dy + 3}" rx="8" ry="4" fill="#5b7fc9"/>`
  const isikRenk = { sicak: 'rgba(255,196,120,', pembe: 'rgba(255,150,180,', mum: 'rgba(255,170,90,' }[s.isik] ?? 'rgba(255,196,120,'
  const [lx, ly] = iso(1.2, 8.6, 0)
  return /* html */ `
    <svg class="ev-svg" viewBox="0 0 400 330" role="img" aria-label="Gelecekteki evimizin odası">
      <defs>
        <linearGradient id="ev-gok" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffb38a"/><stop offset=".55" stop-color="#e8839a"/><stop offset="1" stop-color="#5b4a8f"/></linearGradient>
        <linearGradient id="ev-gok2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff9a6b"/><stop offset=".5" stop-color="#8a4f7f"/><stop offset="1" stop-color="#2a2a5a"/></linearGradient>
        <clipPath id="ev-kirp"><polygon points="${nokta([0, 0], [10, 0], [10, 10], [0, 10])}"/><polygon points="${nokta([0, 0, 0], [0, 10, 0], [0, 10, 8], [0, 0, 8])}"/><polygon points="${nokta([0, 0, 0], [10, 0, 0], [10, 0, 8], [0, 0, 8])}"/></clipPath>
        <radialGradient id="ev-isik" cx="${lx}" cy="${ly - 60}" r="260" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${isikRenk}0.45)"/><stop offset="1" stop-color="${isikRenk}0)"/></radialGradient>
      </defs>
      <!-- zemin -->
      <polygon points="${nokta([0, 0], [10, 0], [10, 10], [0, 10])}" fill="#b98a5e"/>
      <g transform="${YATAY(0)}" stroke="rgba(70,40,20,.18)" stroke-width=".05">${Array.from({ length: 9 }, (_, i) => `<line x1="${i + 1}" y1="0" x2="${i + 1}" y2="10"/>`).join('')}</g>
      <!-- duvarlar -->
      <polygon points="${nokta([0, 0, 0], [0, 10, 0], [0, 10, 8], [0, 0, 8])}" fill="${duvar[1]}"/>
      <polygon points="${nokta([0, 0, 0], [10, 0, 0], [10, 0, 8], [0, 0, 8])}" fill="${duvar[0]}"/>
      <g transform="${SAG}" stroke="${cizgi}" stroke-width=".05">${Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${i + 1}" x2="10" y2="${i + 1}"/>`).join('')}</g>
      <!-- pencere -->
      <g transform="${SAG}">
        <rect x="5" y="2.9" width="4" height="3.8" fill="#f4ede2"/>
        ${manzara}
        <rect x="5.2" y="4.75" width="3.6" height="0.08" fill="#f4ede2"/>
        ${perde}
      </g>
      <!-- çerçeve -->
      <g transform="${SOL}"><rect x="-6.9" y="4.1" width="2.4" height="2.2" fill="#6b4a2f"/>${cerceveIc}</g>
      <!-- halı -->
      <g transform="${YATAY(0)}"><ellipse cx="6" cy="6.2" rx="3.2" ry="2.6" fill="#e9b7c3" opacity=".75"/><ellipse cx="6" cy="6.2" rx="2.5" ry="1.95" fill="none" stroke="#fbf6ea" stroke-width=".08" opacity=".7"/></g>
      <!-- dolap + pikap -->
      ${kutu(0, 1, 1.9, 4.2, 0, 2.4, '#8a5a3a', '#6b4a2f', '#5a3d27')}
      ${kutu(0.2, 1.6, 1.6, 3.6, 2.4, 2.8, '#3a2a22', '#2a1f19', '#231914')}
      <g transform="${YATAY(2.8)}">
        <circle cx="0.9" cy="2.6" r="0.85" fill="#111"/>
        <g class="${donuyor ? 'ev-plak' : ''}"><circle cx="0.9" cy="2.6" r="0.3" fill="${plak}"/><rect x="0.85" y="2.35" width="0.1" height="0.12" fill="#fff" opacity=".7"/></g>
      </g>
      <!-- masa -->
      ${kutu(3.4, 4.8, 3.6, 5, 0, 2.2, '#6b4a2f', '#5a3d27', '#4d3422')}${kutu(5.8, 4.8, 6, 5, 0, 2.2, '#6b4a2f', '#5a3d27', '#4d3422')}${kutu(3.4, 6.8, 3.6, 7, 0, 2.2, '#6b4a2f', '#5a3d27', '#4d3422')}${kutu(5.8, 6.8, 6, 7, 0, 2.2, '#6b4a2f', '#5a3d27', '#4d3422')}
      ${kutu(3.2, 4.6, 6.2, 7.2, 2.1, 2.35, '#c79a6b', '#a57a52', '#936b46')}
      ${cay}${mumlar}
      <!-- saksı ve çiçekler -->
      ${kutu(8.8, 0.5, 9.8, 1.5, 0, 1.3, '#c96f4a', '#b35d3b', '#9e5032')}
      ${cicekler}
      <!-- abajur -->
      <line x1="${lx}" y1="${ly}" x2="${lx}" y2="${ly - 58}" stroke="#3a2a22" stroke-width="1.6"/>
      <path d="M${lx - 11} ${ly - 56} L${lx + 11} ${ly - 56} L${lx + 7} ${ly - 72} L${lx - 7} ${ly - 72}Z" fill="${s.isik === 'pembe' ? '#f59fb4' : '#f7e3b0'}"/>
      <ellipse cx="${lx}" cy="${ly}" rx="7" ry="2.4" fill="#3a2a22"/>
      ${dost}
      <!-- ışık -->
      <rect x="0" y="0" width="400" height="330" fill="url(#ev-isik)" clip-path="url(#ev-kirp)" style="mix-blend-mode:screen" pointer-events="none"/>
    </svg>`
}

export function evimizHTML() {
  return /* html */ `
  <section id="evimiz" class="bolum" data-bolum="" data-ad="Bir Gün Bizim Evimiz">
    <div class="icerik-sutun">
      <div class="bolum-bas">
        <p class="etiket"><span class="no"></span>Bir gün bizim evimiz</p>
        <h2 class="baslik">Anahtarı henüz yok. <em>Ama odası hazır.</em></h2>
        <p class="metin">Bir gün aynı evde uyanacağız. O güne kadar burada kuralım: duvarın rengini, pencereden ne göreceğimizi, masadaki bardakları, pikapta dönen plağı sen seç. Her seçiminin altına bir not bıraktım.</p>
      </div>
      <div class="ev" data-dom>
        <div class="ev-oda"></div>
        <div class="ev-yuvalar" role="tablist" aria-label="Evin parçaları" data-lenis-prevent>
          ${YUVALAR.map((y, i) => `<button type="button" role="tab" data-y="${i}"><span aria-hidden="true">${y.simge}</span>${y.ad}</button>`).join('')}
        </div>
        <div class="ev-secenekler" role="radiogroup"></div>
        <p class="ev-not el" aria-live="polite"></p>
        <p class="ev-ilerleme"></p>
      </div>
    </div>
  </section>`
}

export function evimizKur() {
  const bolum = $('#evimiz')
  satirSatir($('.baslik', bolum))
  belir([$('.bolum-bas .metin', bolum), $('.ev', bolum)])
  const odaEl = $('.ev-oda', bolum)
  const secenekEl = $('.ev-secenekler', bolum)
  const notEl = $('.ev-not', bolum)
  const ilerleme = $('.ev-ilerleme', bolum)
  const sekmeler = $$<HTMLButtonElement>('.ev-yuvalar button', bolum)
  const kayitli = oku<Secim>('evimiz', {})
  let secim: Secim = { ...VARSAYILAN, ...kayitli }
  // (kayıt eski/bozuksa bilinmeyen parçalar sayılmasın)
  const secilenler = new Set(Object.keys(kayitli).filter((id) => YUVALAR.some((y) => y.id === id && y.secenekler.some((s) => s.id === kayitli[id]))))
  for (const y of YUVALAR) if (!secilenler.has(y.id)) secim[y.id] = VARSAYILAN[y.id]
  let aktif = 0
  let haberZaman = 0
  let ilerleZaman = 0

  const ozet = () => YUVALAR.map((y) => `${y.ad.toLocaleLowerCase('tr')}: ${y.secenekler.find((s) => s.id === secim[y.id])?.ad ?? ''}`).join(', ')
  const odaCiz = (canli = false) => {
    odaEl.innerHTML = oda(secim)
    if (canli) gsap.fromTo(odaEl, { scale: 0.985 }, { scale: 1, duration: 0.5, ease: 'back.out(2)' })
  }
  const ilerlemeYaz = () => {
    ilerleme.textContent = secilenler.size >= YUVALAR.length ? 'Evimiz hazır. Şimdi sadece anahtar lazım 🗝️' : `${secilenler.size} / ${YUVALAR.length} seçildi`
    sekmeler.forEach((b, i) => b.classList.toggle('secildi', secilenler.has(YUVALAR[i].id)))
  }
  const yuvaAc = (i: number) => {
    aktif = i
    const y = YUVALAR[i]
    sekmeler.forEach((b, k) => b.setAttribute('aria-selected', String(k === i)))
    const serit = sekmeler[i].parentElement!
    serit.scrollTo({ left: sekmeler[i].offsetLeft - serit.clientWidth / 2 + sekmeler[i].offsetWidth / 2, behavior: 'smooth' })
    secenekEl.setAttribute('aria-label', y.ad)
    secenekEl.innerHTML = y.secenekler
      .map((s) => `<button type="button" role="radio" data-s="${s.id}" aria-checked="${secilenler.has(y.id) && secim[y.id] === s.id}">${kacir(s.ad)}</button>`)
      .join('')
    const s = y.secenekler.find((x) => x.id === secim[y.id])
    notEl.textContent = secilenler.has(y.id) && s ? s.not : `${y.ad}: hangisi olsun?`
  }
  const sec = (sid: string) => {
    window.clearTimeout(ilerleZaman)
    const y = YUVALAR[aktif]
    const s = y.secenekler.find((x) => x.id === sid)!
    secim = { ...secim, [y.id]: sid }
    const ilkTamam = !secilenler.has(y.id) && secilenler.size === YUVALAR.length - 1
    secilenler.add(y.id)
    const kayit: Secim = {}
    for (const id of secilenler) kayit[id] = secim[id]
    yaz('evimiz', kayit)
    odaCiz(true)
    secenekEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.s === sid)))
    notEl.textContent = s.not
    gsap.fromTo(notEl, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'power2.out' })
    ses.tik()
    titret(10)
    ilerlemeYaz()
    if (ilkTamam) {
      ses.cin()
      window.dispatchEvent(new CustomEvent('kutla', { detail: 60 }))
      window.setTimeout(() => sirBul('evimiz'), 1200)
      void ardayaYaz(`${ICERIK.sen.ad} evimizi döşedi 🏠`, `${ozet()}. Anahtarı sen getir.`, ['house'])
    } else if (secilenler.size >= YUVALAR.length) {
      // sonradan değiştirirse: bir dakika içindeki değişiklikler tek haberde
      window.clearTimeout(haberZaman)
      haberZaman = window.setTimeout(() => void ardayaYaz(`${ICERIK.sen.ad} evimizde bir şeyleri değiştirdi 🏠`, `${ozet()}.`, ['house']), 60_000)
    } else {
      // sıradaki seçilmemiş parçaya geç
      const sonraki = YUVALAR.findIndex((x) => !secilenler.has(x.id))
      if (sonraki >= 0) ilerleZaman = window.setTimeout(() => yuvaAc(sonraki), 1400)
    }
  }

  odaCiz()
  ilerlemeYaz()
  yuvaAc(Math.max(0, YUVALAR.findIndex((x) => !secilenler.has(x.id))))
  $('.ev-yuvalar', bolum).addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-y]')
    if (b) {
      window.clearTimeout(ilerleZaman)
      ses.tik()
      yuvaAc(+b.dataset.y!)
    }
  })
  secenekEl.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-s]')
    if (b) sec(b.dataset.s!)
  })
}
