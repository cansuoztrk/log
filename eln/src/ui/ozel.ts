import { ICERIK } from '../icerik'
import { sirBul } from '../cekirdek/sirlar'
import { anlik, ayEvresi, type Anlik } from '../cekirdek/zaman'
import type { Ziyaret } from '../cekirdek/depo'
import type { GununNotu } from '../bolumler/ruzgar'
import { bildir } from './ust'
import { uykuIsigi } from './uyku'

const { sevgili, tanisma } = ICERIK

/** Zamana bağlı sırlar: belli dakikalar, geceler, günler, dolunay… */
export function zamanSirlari(ziyaret: Ziyaret) {
  const kontrol = () => {
    const z = anlik()
    const { saat, dakika, gun } = z.bakuT
    if (saat === 21 && dakika === 5) sirBul('dakika')
    if ((saat === 0 && dakika >= 30) || (saat >= 1 && saat < 5)) sirBul('gece')
    if (gun === +sevgili.slice(8) && z.bugun > sevgili) sirBul('ayin21i')
    if (gun === +tanisma.slice(8) && z.bugun > tanisma) sirBul('ayin6si')
    if (ayEvresi(z.an).oran > 0.975) sirBul('dolunay')
    if (ziyaret.gunler.length >= 10) sirBul('yuruyus')
  }
  kontrol()
  window.setInterval(kontrol, 20000)
}

/** Siteye girer girmez: özel günse kutlama, değilse küçük bir selam */
export function karsila(z: Anlik, not: GununNotu, ziyaret: Ziyaret & { yeniGun: boolean }, kutla: () => void, notaGit: () => void, dogum: 'sen' | 'ben' | null = null) {
  if (dogum === 'ben') {
    kutla()
    const alan = document.querySelector<HTMLTextAreaElement>('#ruzgar-metin')
    if (alan) alan.placeholder = `Bugün ${ICERIK.ben.ad}’nın doğum günü… Rüzgâr ona götürür.`
    bildir({ ust: '7 Kasım', baslik: `Bugün ${ICERIK.ben.ad}’nın doğum günü`, metin: 'Rüzgâra ona bir not bırakır mısın? En güzel hediyesi o olur.', simge: '🎂', tik: notaGit, sure: 12000 })
    return
  }
  if (not.ozel) {
    kutla()
    bildir({ ust: 'Bugün özel bir gün', baslik: not.baslik, metin: 'Rüzgâr sana bugün özel bir not getirdi.', simge: '♥', tik: notaGit, sure: 10000 })
    return
  }
  const { saat } = z.bakuT
  if (saat >= 23 || saat < 5)
    window.setTimeout(
      () =>
        bildir({
          ust: 'Gecə',
          baslik: 'Uyuyamıyor musun?',
          metin: 'Buna dokun: ay ekranında nefes alacak, sen de onunla. Sekiz dakika sonra ışık kendiliğinden kararır.',
          simge: '☾',
          tik: () => uykuIsigi(),
          sure: 12000,
        }),
      2500,
    )
  const selam =
    saat < 5 ? 'Bu saatte mi buradasın?' : saat < 11 ? 'Sabahın xeyir, günəşim' : saat < 17 ? 'Günün aydın, gözəlim' : saat < 22 ? 'Axşamın xeyir, canım' : 'Gecən xeyrə qalsın'
  if (ziyaret.yeniGun && ziyaret.gunler.length > 1)
    bildir({
      ust: `${ziyaret.gunler.length}. gün buradasın`,
      baslik: `${selam}.`,
      metin: `Bugünün notu seni bekliyor. Ben de sana 21 km daha yaklaştım.`,
      simge: '✉',
      tik: notaGit,
    })
}
