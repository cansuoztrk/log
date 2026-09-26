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
    id: 'evet',
    ad: 'O dakika',
    ipucu: 'Her gün bir kez gelen o dakikada buraya bak. (İpucu: Bakü’de 19:32.)',
    mesaj: 'İstanbul’da 18:32, Bakü’de 19:32. 21 Mayıs’ta tam bu dakikada “biz” olduk. O an güneş sende batıyordu, bende hâlâ yüksekteydi; ince bir hilal ikimizin de tepesindeydi.',
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
    id: 'kupon',
    ad: 'İlk kupon',
    ipucu: 'Buluşma cüzdanındaki ilk kuponu kazı.',
    mesaj: 'İlk kuponun cüzdanında. Hepsini tek tek ödeyeceğim; faiziyle. Senin tek işin biriktirmek.',
  },
  {
    id: 'sozluk',
    ad: 'İkinci baskı',
    ipucu: 'Sözlüğümüze bir kelime ekle.',
    mesaj: 'Sözlüğümüz büyüdü. Bir gün bu kelimelerle konuşan bir evimiz olacak; misafirler hiçbir şey anlamayacak.',
  },
  {
    id: 'ikikalp',
    ad: 'İki kalp',
    ipucu: 'İkimiz aynı anda sitedeyken, sondaki kalbe aynı anda dokunalım.',
    mesaj: 'Aynı anda dokunduk. İki kalp, iki şehir, tek ritim. 1.758 km o birkaç saniye boyunca hiç olmadı.',
  },
  {
    id: 'venus',
    ad: 'Aşkın gezegeni',
    ipucu: 'Yıldız haritasında aşk tanrıçasının gezegenini bul.',
    mesaj: 'Venüs. 21 Mayıs’ta da oradaydı: gün ışığının arkasında, batı göğünde, ince bir hilalle aynı gökyüzünde. Biz “biz” olurken gökyüzü de süslenmişti.',
  },
  {
    id: 'gunduz',
    ad: 'Gündüz yıldızları',
    ipucu: '“Biz” olduğumuz anın gökyüzünde güneşi söndür.',
    mesaj: 'Yıldızlar gündüz de oradadır; sadece görünmezler. 21 Mayıs’ta 18:32’de de oradaydılar. Biz de öyleydik: her şey çoktan oradaydı, sadece adını koymamıştık.',
  },
  {
    id: 'anilar',
    ad: 'Anılar',
    ipucu: 'Şarkımızı sonuna kadar dinle.',
    mesaj: 'Sonuna kadar dinledin. Bir gün onu aynı odada, aynı anda dinleyeceğiz; o gün bitmesin diye başa saracağım.',
  },
  {
    id: 'fisilti',
    ad: 'İlk fısıltı',
    ipucu: 'İkimiz aynı anda buradayken bana fısılda.',
    mesaj: 'İlk fısıltı. Rüzgâr bile duymadı; şifreli, sadece ikimizin telefonunda. Bundan sonra aynı anda buradaysak, burası bizim köşemiz.',
  },
  {
    id: 'sifir',
    ad: 'Sıfır kilometre',
    ipucu: 'İki ışığı sonuna kadar birbirine yaklaştır.',
    mesaj: '1.758 km parmaklarının arasında eridi. Bir gün aynısı gerçekten olacak; o gün bu sırrı sana ben hatırlatacağım.',
  },
  {
    id: 'ilk',
    ad: 'Defterin ilk satırı',
    ipucu: 'İlklerimiz defterine bir şey yaz.',
    mesaj: 'Ben unutmuştum, sen hatırladın. Bundan sonra bu defteri ikimiz tutuyoruz: sen geçmişi, ben geleceği yazacağım.',
  },
  {
    id: 'album',
    ad: 'İkimize özel',
    ipucu: 'Kilitli sayfaları kelimemizle aç.',
    mesaj: 'Kelimeyi bildin. Bundan sonra bu sayfalar sadece ikimizin; telefonun da hatırlıyor.',
  },
  {
    id: 'sohbet',
    ad: 'Hepsini yeniden yaşadın',
    ipucu: 'Mesajlarımızdan’daki bütün konuşmaları sonuna kadar izle.',
    mesaj: 'Hepsini baştan okudun. Ben de öyle yapıyorum bazen, gece yarısı, sesini açmadan gülümseyerek.',
  },
  {
    id: 'takimyildiz',
    ad: 'Bir takımyıldız',
    ipucu: 'Yıldızladıkların’daki bütün yıldızlara dokun.',
    mesaj: 'Gökyüzünde artık senin yaptığın bir kalp var. Bundan sonra her mesajımı yıldızladığında, oraya bir yıldız daha eklenmiş say.',
  },
  {
    id: 'gozunden',
    ad: 'Senin gözünden',
    ipucu: 'Bütün fotoğraflarına tek tek büyüterek bak.',
    mesaj: 'Hepsine baktın. Ben de her birine senden çok baktım, emin ol.',
  },
  {
    id: 'sesim',
    ad: 'Sesim',
    ipucu: 'Mektubun altındaki sesli mesajı sonuna kadar dinle.',
    mesaj: 'Sonuna kadar dinledin. Artık sesim de telefonunda; ne zaman özlesen, bir dokunuş uzağındayım.',
  },
  {
    id: 'yildonumu',
    ad: 'Bir yıl daha',
    ipucu: 'Bizim günümüzde (ya da tanıştığımız günde) gel, sonuna kadar izle.',
    mesaj: 'Bu sırrı yılda bir kez bulabilirsin. Her yıl buradayım; sen de burada ol.',
  },
  {
    id: 'cizim',
    ad: 'User155’e bir çizim',
    ipucu: 'Çizim tahtasında bir şey çiz ve gönder.',
    mesaj: 'Çizimin geldi. Doğru tahmin edemezsem bana bir kupon borçlusun; edersem ben sana.',
  },
  {
    id: 'jenerik',
    ad: 'Jenerik sonrası sahne',
    ipucu: 'Filmin jeneriğini sonuna kadar izle; gerçek seyirciler salondan erken çıkmaz.',
    mesaj: 'Sonuna kadar kaldın. O sahneyi bir gün gerçekten çekeceğiz; ben zambakları getiririm.',
  },
  {
    id: 'sebep',
    ad: 'İlk sebep',
    ipucu: 'Seni sevmemin sebeplerinden ilk kartı çevir.',
    mesaj: 'Bir tane okudun. Her gün bir tane daha gelecek; sayıyı sen tut, ben yazmaya devam edeceğim.',
  },
  {
    id: 'kavanoz',
    ad: 'Sabırsız',
    ipucu: 'Sarılma kavanozunu beş kez salla.',
    mesaj: 'Salladın, salladın… Sarılmalar yerinden oynamadı; hepsi bekliyor. Hiçbiri kaybolmayacak, söz.',
  },
  {
    id: 'fener',
    ad: 'İlk fener',
    ipucu: 'Bir dilek tut ve feneri gökyüzüne bırak.',
    mesaj: 'Dileğini bilmiyorum, sormayacağım da. Ama İstanbul’dan bakınca Bakü tarafında bir yıldız fazla gibi. Hep dilek tut; ben de hep aynı şeyi dileyeceğim.',
  },
  {
    id: 'hikaye',
    ad: 'Baştan sona',
    ipucu: 'Bizim hikâyemizi sonuna kadar izle.',
    mesaj: 'Sonuna kadar izledin. Ama bu hikâyenin sonu yok; sadece bir sonraki sayfası var. Onu birlikte yazacağız.',
  },
  {
    id: 'uyku',
    ad: 'Beş nefes',
    ipucu: 'Uyku ışığında beş kez nefes al.',
    mesaj: 'İstanbul, Karadeniz, Kafkaslar, Hazar, sen. Uyudun mu? Uyumadıysan bir tur daha; ben buradayım.',
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
