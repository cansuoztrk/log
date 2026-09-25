import { ICERIK } from '../icerik'
import { ADIM_KM } from '../cekirdek/depo'
import { type Anlik, MESAFE, saatYazi, sayi, sureYazi } from '../cekirdek/zaman'
import type { Kure } from '../gl/kure'
import { $, $$, adimZamani, gsap, ScrollTrigger } from './yardimci'

const { ben, sen } = ICERIK

/* ─── I. Önce Sana Doğar ───────────────────────────────────────────────── */

export function acilisHTML(z: Anlik, dogumGunu = false) {
  const bakuDogus = saatYazi(z.zBaku.sunrise, sen.saatDilimi)
  const istDogus = saatYazi(z.zIst.sunrise, ben.saatDilimi)
  const istDogusBakuSaati = saatYazi(z.zIst.sunrise, sen.saatDilimi)
  const gecmis = z.an > z.zIst.sunrise
  return /* html */ `
  <section id="acilis" class="bolum uzun" data-gl="kure" data-ruh="kure" data-bolum="I" data-ad="Önce Sana Doğar">
    <div class="sabit">
      <div class="acilis-bas">
        <p class="etiket">${ben.yerelSehir} · ${sen.yerelSehir} &nbsp;—&nbsp; ${ben.enlem.toFixed(1).replace('.', ',')}°K · ${sen.enlem
          .toFixed(1)
          .replace('.', ',')}°K</p>
        ${
          dogumGunu
            ? `<h1 class="dev">İyi ki <em>Doğdun</em></h1>
        <p class="acilis-alt">Güneş her gün önce sana doğar. <span>Bugün sen doğdun ${sen.tamAd ?? sen.ad}; güneş de biraz erken kalktı.</span></p>`
            : `<h1 class="dev">Önce <em>Sana</em><br/>Doğar</h1>
        <p class="acilis-alt">${sen.ad} için. <span>${sayi(MESAFE)} km öteden, bir saat geriden.</span></p>`
        }
        <div class="kaydir-ipucu" aria-hidden="true"><span>kaydır</span><i></i></div>
      </div>
      <div class="acilis-adimlar">
        <p class="satir adim">Her sabah güneş önce <em>${sen.sehir}’ye</em> doğar.</p>
        <p class="satir adim">Önce senin pencerene, senin saçlarına, senin uykulu gözlerine dokunur.</p>
        <p class="satir adim">Sonra batıya yürür. Hazar’ı, Kafkasları, Karadeniz’i geçer…</p>
        <p class="satir adim">…ve tam <em>${sureYazi(z.isikDk)}</em> sonra beni bulur.</p>
        <p class="satir adim italik buyuk">Yani beni her sabah uyandıran ışık, seni çoktan <em>öpmüş</em> oluyor.</p>
      </div>
      <p class="acilis-bilgi">
        <span>Bugün</span>
        <span>${sen.yerelSehir} <b>☀ ${bakuDogus}</b></span>
        <span>${ben.yerelSehir} <b>☀ ${istDogus}</b> <small>(senin saatinle ${istDogusBakuSaati})</small></span>
        <span class="gizli-mobil">${gecmis ? 'ışık bugün de önce sana uğradı' : 'ışık birazdan önce sana uğrayacak'}</span>
      </p>
    </div>
  </section>`
}

/* ─── II. Aynı Çizgi ───────────────────────────────────────────────────── */

export function cizgiHTML(z: Anlik, yurunenGun: number) {
  const km = Math.min(MESAFE, yurunenGun * ADIM_KM)
  const kalan = Math.max(0, MESAFE - km)
  const fark = Math.abs(ben.enlem - sen.enlem) * 111.2
  const isikMs = (MESAFE / 299_792.458) * 1000
  const vardi = kalan <= 0
  return /* html */ `
  <section id="cizgi" class="bolum uzun" data-gl="kure" data-ruh="kure" data-bolum="II" data-ad="Aynı Çizgi">
    <div class="sabit">
      <div class="cizgi-adimlar">
        <div class="adim">
          <p class="etiket"><span class="no">II</span>Aynı çizgi</p>
          <p class="satir">Bir şey fark ettim.</p>
        </div>
        <div class="adim">
          <p class="satir">${ben.sehir} <b class="derece">${ben.enlem.toFixed(2).replace('.', ',')}° K</b><br/>${sen.sehir} <b class="derece">${sen.enlem
            .toFixed(2)
            .replace('.', ',')}° K</b></p>
        </div>
        <div class="adim">
          <p class="satir">Dünyanın etrafına bir kurdele bağlasam, ikimizin de <em>kapısından</em> geçer.</p>
        </div>
        <div class="adim">
          <p class="satir italik">Aynı çizginin üstünde yaşıyoruz, ${sen.ad}. Evren bizi yan yana koymuş; sadece biraz… <em>uzağa</em>.</p>
        </div>
        <div class="adim sayilar">
          <div><b>${sayi(MESAFE)}</b><small>km</small><span>kuş uçuşu aramız</span></div>
          <div><b>${sayi(fark)}</b><small>km</small><span>kuzey–güney farkımız; dünyanın çevresinde bir hiç</span></div>
          <div><b>${sayi(isikMs, 1)}</b><small>ms</small><span>bir mesajın ışık hızıyla sana varışı</span></div>
          <div><b>${z.saatFarki}</b><small>saat</small><span>sen hep benden ileridesin</span></div>
        </div>
        <div class="adim">
          <p class="satir">Sen hep bir saat ileridesin. Yani <em>yarın</em>, her gece önce sana geliyor.</p>
          <p class="metin">Ben de her gece, yarından bana yazan birine âşığım.</p>
        </div>
        <div class="adim yuruyus">
          <p class="etiket">Sana yürüyorum</p>
          <p class="satir">${
            vardi
              ? 'Vardım. <em>Burada</em>, en azından. Şimdi sıra gerçekte.'
              : `Bu siteye uğradığın her gün, ben sana <em>${ADIM_KM} km</em> yaklaşıyorum.`
          }</p>
          <div class="yuruyus-cubuk" style="--oran:${(km / MESAFE).toFixed(4)}">
            <span>${ben.yerelSehir}</span><div><i></i><b></b></div><span>${sen.yerelSehir}</span>
          </div>
          <p class="dipnot">Şu ana kadar <b>${sayi(km)} km</b> yol aldım${vardi ? '.' : ` · kalan <b>${sayi(kalan)} km</b> · yarın gelirsen biraz daha yakınım.`}</p>
        </div>
      </div>
    </div>
  </section>`
}

export function acilisKur(kure: Kure | null, yurunenGun: number) {
  const acilis = $('#acilis')
  const cizgi = $('#cizgi')
  if (kure) kure.yuruyus = Math.min(1, (yurunenGun * ADIM_KM) / MESAFE)

  // Başlık kartı, ilk kaydırmada yukarı doğru çözülür
  adimZamani(acilis, $$('.acilis-adimlar .adim', acilis))
  ScrollTrigger.create({
    trigger: acilis,
    start: 'top top',
    end: '12% top',
    scrub: 0.6,
    animation: gsapBaslik(acilis),
  })

  const yolBagla = (bolum: HTMLElement, ofset: number) =>
    ScrollTrigger.create({
      trigger: bolum,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (s) => {
        if (kure) kure.yol = ofset + s.progress
      },
      onLeaveBack: () => {
        if (kure && ofset > 0) kure.yol = ofset
      },
    })
  yolBagla(acilis, 0)
  yolBagla(cizgi, 1)
  adimZamani(cizgi, $$('.cizgi-adimlar .adim', cizgi))
}

function gsapBaslik(bolum: HTMLElement) {
  return gsap
    .timeline()
    .to($('.acilis-bas', bolum), { autoAlpha: 0, y: -60, filter: 'blur(10px)', ease: 'power1.in' }, 0)
    .to($('.acilis-bilgi', bolum), { autoAlpha: 0, ease: 'power1.in' }, 0)
}
