import { oku, yaz } from './depo'
import { ses } from './ses'
import { ICERIK } from '../icerik'

/**
 * Sırlar — sitenin içine saklanmış küçük sürprizler.
 * Bazıları dokunarak, bazıları sadece belirli bir gün ya da saatte bulunur.
 * Böylece site her ziyarette yeni bir şey saklıyor olur.
 */
export interface Sir {
  id: string
  ad: string
  ipucu: string
  mesaj: string
}

const { sen, arkadas } = ICERIK

export const SIRLAR: Sir[] = [
  {
    id: 'ay',
    ad: 'Ay’a söyledim',
    ipucu: 'Gökyüzünde, ikimizin de gördüğü şeye üç kez dokun.',
    mesaj: 'Ay’a söyledim: bu gece sen ona baktığında, benim de baktığımı sana iletecek. Sözünü tutuyor; her gece kontrol ediyorum.',
  },
  {
    id: 'nehir',
    ad: `${arkadas}’e teşekkür`,
    ipucu: 'Bizi buluşturan akıntıya üç kez dokun.',
    mesaj: `${arkadas}, bir gün bunu görürsen: teşekkürler. Hayatımın en güzel “gruba ekle” tuşuna sen bastın.`,
  },
  {
    id: 'dakika',
    ad: 'Bizim dakikamız',
    ipucu: 'Senin saatinle 21:05’te buraya bak.',
    mesaj: '21:05 — 21 Mayıs’ın dakikası. Her gün yalnızca bir kez gelir ve sadece bir dakika sürer. O dakika bizim.',
  },
  {
    id: 'gece',
    ad: 'Uyumayan gözler',
    ipucu: 'Gece yarısından sonra, herkes uyurken gel.',
    mesaj: 'Uyu artık, gözəlim… Ama madem buradasın, söyleyeyim: seni rüyamda da arıyorum. Genelde buluyorum.',
  },
  {
    id: 'ayin21i',
    ad: 'Ayın 21’i',
    ipucu: 'Her ay bir kez gelen o gün.',
    mesaj: 'Ayın 21’i. Takvimde sıradan bir gün; bizde küçük bir bayram. Bu ay da seni seçiyorum.',
  },
  {
    id: 'ayin6si',
    ad: 'Ayın 6’sı',
    ipucu: 'Her şeyin başladığı günün aylık dönümü.',
    mesaj: 'Her ayın 6’sında içimden Nehir’e bir teşekkür geçiyor. Sonra sana bir “iyi ki” geçiyor.',
  },
  {
    id: 'dolunay',
    ad: 'Dolunay',
    ipucu: 'Ay tamamen doluyken gel.',
    mesaj: 'Dolunay. Bu gece Bakü de İstanbul da aynı ışıkla yıkanıyor. Aramızdaki tek ortak lamba bu; ben ona bakıp sana el sallıyorum.',
  },
  {
    id: 'kule',
    ad: 'Kuleyi dürtme',
    ipucu: 'Benim şehrimin kulesine beş kez dokun.',
    mesaj: 'Kuleyi bu kadar dürtme, yıkılırsa İstanbul bana kızar. (Ama senin için yeniden yaparım. Taş taş.)',
  },
  {
    id: 'nus',
    ad: 'Nuş olsun',
    ipucu: 'İki bardağı arka arkaya çınlat.',
    mesaj: 'Nuş olsun! Biz “afiyet olsun” deriz, siz “nuş olsun”. Ben ikisini birden diyorum; çünkü seninle her şey iki kat.',
  },
  {
    id: 'seker',
    ad: 'İki şeker',
    ipucu: 'Benim bardağıma şeker at.',
    mesaj: 'İki şeker. Beni ezberlemişsin bile. (Ezberlemediysen de artık biliyorsun.)',
  },
  {
    id: 'bos',
    ad: 'Boş mektup',
    ipucu: 'Rüzgâra hiçbir şey yazmadan bir mektup bırak.',
    mesaj: 'Boş bir mektup gönderdin. Ama ben yine de okudum: “seni özledim” yazıyordu. Yanılıyor muyum?',
  },
  {
    id: 'sevirem',
    ad: 'Rüzgâr cevap verdi',
    ipucu: 'Rüzgâra o iki kelimeyi yaz.',
    mesaj: 'Rüzgâr, Arda adına cevap veriyor: “Ben de. Daha çok. Her gün biraz daha.”',
  },
  {
    id: 'kalp',
    ad: 'Bırakmadın',
    ipucu: 'Sonunda kalbi bırakma. Uzun süre.',
    mesaj: 'Hâlâ bırakmadın. Ben de bırakmayacağım. Hiç.',
  },
  {
    id: 'yildiz',
    ad: 'Kayan yıldız',
    ipucu: 'Gökyüzünde kayan bir yıldız yakala.',
    mesaj: 'Dilek tuttun mu? Benimki hep aynı. Tahmin et. (İpucu: 1.758 km ile ilgili ve sonunda sıfır oluyor.)',
  },
  {
    id: 'yuruyus',
    ad: 'On gün',
    ipucu: 'On farklı günde buraya uğra.',
    mesaj: `On gündür buradasın. Her gelişinde sana 21 km yaklaştım; şimdiden 210 km yol aldım. ${sen.sehir} yolunda, yorulmadan.`,
  },
  {
    id: 'nar',
    ad: 'Narın kalbi',
    ipucu: 'Adındaki narın tanelerine dokun.',
    mesaj: 'Taneler kalbe döndü. Her biri bir gün; hepsi birlikte tek bir şey söylüyor. Bunu sana söylememe gerek var mı?',
  },
  {
    id: 'aynian',
    ad: 'Aynı anda',
    ipucu: 'İkimiz aynı anda buradayken gel.',
    mesaj: 'Şu an ikimiz de buradaydık: aynı sayfa, aynı dakika, iki ayrı şehir. Aradaki 1.758 km bir anlığına hiç olmadı.',
  },
  {
    id: 'dogumgunu',
    ad: 'Dilek',
    ipucu: 'Yılda bir gün, pastanın mumlarını üfle.',
    mesaj: 'Mumları üfledin. Dileğini bilmiyorum ama benimkini söyleyeyim: bir sonraki doğum gününde mumları aynı masada, yan yana üfleyelim.',
  },
  {
    id: 'gulucuk',
    ad: '☺️',
    ipucu: 'En üstteki iki harfe beş kez dokun.',
    mesaj: 'Senin en çok kullandığın emoji. Bu yağmur senin için: her biri, bana gönderdiğin bir ☺️’ün cevabı.',
  },
  {
    id: 'bok',
    ad: 'Bizim kelimemiz',
    ipucu: 'Rüzgâra en sık kullandığımız kelimeyi yaz.',
    mesaj: 'Sitenin her yerini süsledim, bir tek bu kelimeyi saklamıştım. Buldun. Tabii ki buldun. ☺️',
  },
  {
    id: 'zarflar',
    ad: 'Bütün zarflar',
    ipucu: '“Olduğunda aç” mektuplarının hepsini aç (kilitliler hariç).',
    mesaj: 'Hepsini açtın. Ya hepsine ihtiyacın oldu, ya da sadece merak ettin. İkisi de olur. Yenilerini yazmaya başladım bile.',
  },
  {
    id: 'optum',
    ad: 'Ben de öptüm',
    ipucu: 'Kapatırken hep ne deriz? Onu rüzgâra yaz ya da en sondaki düğmeye bas.',
    mesaj: 'Kapatırken hep böyle deriz ya. Bu sefer ilk ben söylüyorum: öptüm. Ama kapatma.',
  },
  {
    id: 'posi',
    ad: 'Posi burada',
    ipucu: 'Bana taktığın adlardan birini rüzgâra yaz.',
    mesaj: 'Rüzgâr, o adı duyunca iki kat hızlı esmeye başladı. Posi, mosi, aşkişim, şirinim, kuzum… Hepsi buradayım.',
  },
  {
    id: 'lamba',
    ad: 'Lamba sönmez',
    ipucu: 'Kulede lambayı yak.',
    mesaj: 'Lamba yandı. Bundan sonra her gece yanacak; ben de her gece yüzmeye devam edeceğim.',
  },
]

type Dinleyici = (s: Sir, yeni: boolean) => void
const dinleyiciler = new Set<Dinleyici>()

export function bulunanlar(): string[] {
  return oku<string[]>('sirlar', [])
}

export function sirBul(id: string) {
  const sir = SIRLAR.find((s) => s.id === id)
  if (!sir) return
  const liste = bulunanlar()
  const yeni = !liste.includes(id)
  if (yeni) {
    liste.push(id)
    yaz('sirlar', liste)
    ses.cin()
  }
  dinleyiciler.forEach((f) => f(sir, yeni))
}

export function sirDinle(f: Dinleyici) {
  dinleyiciler.add(f)
}
