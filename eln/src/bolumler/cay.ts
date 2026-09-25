import { ICERIK } from '../icerik'
import { ses } from '../cekirdek/ses'
import { sirBul } from '../cekirdek/sirlar'
import { tarihYazi } from '../cekirdek/zaman'
import type { Cay } from '../gl/cay'
import { $, $$, adimZamani, ScrollTrigger, titret } from './yardimci'

const { sevgili } = ICERIK

export function cayHTML() {
  return /* html */ `
  <section id="cay" class="bolum uzun" data-gl="cay" data-ruh="cay" data-bolum="VI" data-ad="Çay Günü">
    <div class="sabit">
      <div class="cay-adimlar">
        <div class="adim">
          <p class="etiket"><span class="no">VI</span>${tarihYazi(sevgili)} · Dünya Çay Günü</p>
          <p class="satir">Sevgili olduğumuz gün <em>Dünya Çay Günü</em>’ymüş.</p>
        </div>
        <div class="adim">
          <p class="satir">Sonradan öğrendim ve güldüm. Başka hangi gün olabilirdi ki?</p>
        </div>
        <div class="adim">
          <p class="satir">Sen <em>armudu stəkanında</em>, ben <em>ince belli</em> bardağımda. Aynı kıvrım, iki isim.</p>
        </div>
        <div class="adim">
          <p class="satir">Bizim masada simit olur, sizinkinde mürəbbə. Bir gün aynı masada ikisi de olacak.</p>
        </div>
        <div class="adim">
          <p class="satir italik">Çay demlenmeyi bekler, acele etmez. <em>Güzel şeyler de öyle.</em></p>
          <p class="dipnot cay-ipucu">Bardaklara dokunabilirsin. Şekerlere de.</p>
        </div>
      </div>
    </div>
  </section>`
}

export function cayKur(cay: () => Cay | null) {
  const bolum = $('#cay')
  adimZamani(bolum, $$('.cay-adimlar .adim', bolum))
  ScrollTrigger.create({
    trigger: bolum,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (s) => {
      const c = cay()
      if (c) c.ilerleme = s.progress
    },
  })
  const bagla = () => {
    const c = cay()
    if (!c) return window.setTimeout(bagla, 500)
    c.onSing = (kim) => {
      ses.sing(kim === 'sen' ? 1.12 : 1)
      titret(12)
    }
    c.onNus = () => sirBul('nus')
    c.onSeker = (n) => {
      ses.damla()
      if (n >= 2) window.setTimeout(() => sirBul('seker'), 500)
    }
  }
  ScrollTrigger.create({ trigger: bolum, start: 'top 150%', once: true, onEnter: bagla })
}
