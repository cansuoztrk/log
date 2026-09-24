/* ───────────────────────────────────────────────────────────────────────────
   BULUŞMA CÜZDANI — Eln siteye uğradığı her yeni gün bir kupon kazır.
   · ne: 'simdi'   → hemen kullanılabilir; "Kullan"a basınca Arda'nın telefonuna düşer.
   · ne: 'bulusma' → ilk buluşmada geçerli (icerik.ts'te ilkBulusma tarihi gelince açılır).
   Sıra önemli: kuponlar bu sırayla çıkar. İstediğin kadar ekleyebilirsin.
   ─────────────────────────────────────────────────────────────────────────── */

export interface Kupon {
  id: string
  ne: 'simdi' | 'bulusma'
  simge: string
  baslik: string
  kosul: string
}

export const KUPONLAR: Kupon[] = [
  { id: 'sarilma', ne: 'bulusma', simge: '🫂', baslik: 'Bir adet havalimanı sarılması', kosul: 'Süresiz. Bırakma kısmı sana kalmış; ben bırakmayacağım.' },
  { id: 'sesli', ne: 'simdi', simge: '📞', baslik: 'Bir sesli arama, istediğin an', kosul: 'Utanmak yasak. Kapatırken “öptüm” zorunlu.' },
  { id: 'cay', ne: 'bulusma', simge: '🍵', baslik: 'İlk çay benden', kosul: 'İnce belli ya da armudu; seçim senin, demlemek benim.' },
  { id: 'bok-iptal', ne: 'simdi', simge: '🌧️', baslik: 'Bir “bok gibi gün” iptali', kosul: 'Gösterildiği an gün düzelir. Düzelmezse Arda düzeltir.' },
  { id: 'zambak', ne: 'bulusma', simge: '🌸', baslik: 'Bir buket pembe zambak', kosul: 'Elden teslim. Kokusu merdivenlere kadar gelecek.' },
  { id: 'haklisin', ne: 'simdi', simge: '⚖️', baslik: 'Bir tartışmayı sebepsiz kazanma hakkı', kosul: '“Çünkü ben öyle dedim” yeterli gerekçedir.' },
  { id: 'bakisma', ne: 'bulusma', simge: '👀', baslik: '10 dakika kesintisiz bakışma', kosul: 'Utanmak yasak. Gülmek serbest. (İkimiz de güleceğiz.)' },
  { id: 'sarki', ne: 'simdi', simge: '🎧', baslik: 'Bir şarkı isteği', kosul: 'Sen seçersin, ben baştan sona dinleyip sana yorumunu yazarım.' },
  { id: 'gulucuk', ne: 'bulusma', simge: '☺️', baslik: 'Sınırsız ☺️, yüz yüze', kosul: 'Artık ekrandan değil; canlı yayın.' },
  { id: 'guldur', ne: 'simdi', simge: '😂', baslik: 'Bir “beni şimdi güldür” talebi', kosul: 'Arda’nın en saçma şakası beş dakika içinde teslim edilir.' },
  { id: 'optum', ne: 'bulusma', simge: '💋', baslik: 'Bir gerçek “öptüm”', kosul: 'Telefonsuz. 1.758 kilometresi çıkarılmış hâli.' },
  { id: 'iltifat', ne: 'simdi', simge: '💌', baslik: 'Art arda on iltifat', kosul: 'Hiçbiri tekrar etmeyecek. Kontrol edebilirsin.' },
  { id: 'yuruyus', ne: 'bulusma', simge: '🌊', baslik: 'El ele bir sahil yürüyüşü', kosul: 'Hazar ya da Boğaz; ikisi de olur, ikisi de olacak.' },
  { id: 'sesli-mesaj', ne: 'simdi', simge: '🎙️', baslik: 'Bir uzun sesli mesaj', kosul: 'En az bir dakika. Konusu serbest; sesi Arda’nın.' },
  { id: 'karar', ne: 'bulusma', simge: '👑', baslik: 'Bir gün boyunca bütün kararlar senin', kosul: 'Yemek, film, rota. Arda sadece “tamam” der.' },
  { id: 'masal', ne: 'simdi', simge: '🌙', baslik: 'Bir uyku masalı', kosul: 'Uyuyamadığın bir gece kullan. Mutlu sonla biter; iki kişi bir havalimanında.' },
  { id: 'kahvalti', ne: 'bulusma', simge: '🥐', baslik: 'Aynı masada kahvaltı', kosul: 'Çay, pendir, simit. Saat farkı: sıfır.' },
  { id: 'hitap', ne: 'simdi', simge: '🏷️', baslik: 'Bir gün boyunca bana istediğin adla seslen', kosul: 'Posi, mosi, kuzum… Hepsine koşarak geleceğim.' },
  { id: 'foto', ne: 'bulusma', simge: '📸', baslik: 'Birlikte ilk fotoğrafımız', kosul: 'Ekran görüntüsü değil. İkimiz, aynı karede.' },
  { id: 'goruntulu', ne: 'simdi', simge: '🎥', baslik: 'İlk görüntülü aramamız', kosul: 'Hazır olduğun gün kullan. Arda hep hazır. (Heyecandan kamerayı ters tutabilir.)' },
  { id: 'dinlemek', ne: 'bulusma', simge: '👂', baslik: 'Bir saat seni susmadan dinlemek', kosul: 'Sen anlat, ben dinleyeyim. Araya girmek yok.' },
  { id: 'soru', ne: 'simdi', simge: '❓', baslik: 'Dürüst cevap kuponu', kosul: 'Bir soru sor; Arda kaçamak yapmadan cevaplamak zorunda.' },
  { id: 'nehir', ne: 'bulusma', simge: '🍰', baslik: 'Nehir’e birlikte teşekkür', kosul: 'Üçümüz bir masada. Hesap bizden.' },
  { id: 'gunbatimi', ne: 'bulusma', simge: '🌅', baslik: 'Gün batımını aynı yerden izlemek', kosul: 'Bu sefer aynı güneş, aynı dakika. Bir saat fark olmadan.' },
  { id: 'film', ne: 'bulusma', simge: '🎬', baslik: 'Bir film, tek battaniye', kosul: 'Filmi sen seçersin; ben filmden çok seni izlerim.' },
  { id: 'dondurma', ne: 'bulusma', simge: '🍦', baslik: 'Bir dondurma, senin seçtiğin tat', kosul: 'Benimkinden de bir kaşık alma hakkı dahil.' },
  { id: 'sevirem', ne: 'bulusma', simge: '🗣️', baslik: '“Səni sevirəm”, benim aksanımla', kosul: 'Gülmeye hakkın var. Sonra düzgün söylemeyi sen öğretirsin.' },
  { id: 'bos', ne: 'bulusma', simge: '✨', baslik: 'Boş kupon', kosul: 'Ne istersen yaz. Arda şimdiden “evet” dedi.' },
]
