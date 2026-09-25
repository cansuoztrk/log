/* ───────────────────────────────────────────────────────────────────────────
   SÖZLÜĞÜMÜZ — Sadece ikimizin anladığı kelimeler.
   Eln sitede yeni bir kelime eklerse telefonuna düşer; beğenirsen buraya
   kalıcı olarak ekle. Sıralama otomatik (alfabetik).
   ─────────────────────────────────────────────────────────────────────────── */

export interface Madde {
  kelime: string
  okunus?: string
  tur: string
  anlamlar: string[]
  ornek?: string
  bkz?: string
  /** alfabeye bakmadan en başta dursun */
  onde?: boolean
}

export const SOZLUK: Madde[] = [
  {
    kelime: 'bok',
    okunus: 'bok',
    tur: 'ünl., is., argo',
    anlamlar: [
      'Bizde her şey: kötü bir gün, iyi bir şaka, anlatılamayan bir his.',
      'Hiçbir şey. “Ne yapıyorsun?” sorusunun en dürüst cevabı.',
      'mec. “Seni seviyorum”un utangaç, argo kuzeni.',
    ],
    ornek: 'Bugün bok gibiydi ama sen yazınca geçti.',
  },
  {
    kelime: 'bokkuş',
    okunus: 'bok·kuş',
    tur: 'is., sevgi sözü',
    anlamlar: [
      'Dünyada yalnızca iki kişinin bildiği kelime. Üçüncü biri duyarsa anlamını söylemek yasaktır.',
      '“Bok”un kuş kadar hafif, kanatlanmış hâli.',
      'Sözlüğümüzün en değerli maddesi; bu yüzden en tepede.',
    ],
    ornek: 'Bokkuş ☺️',
    bkz: 'bok, ☺️',
    onde: true,
  },
  {
    kelime: '☺️',
    okunus: 'gü·lü·cük',
    tur: 'is., Eln’e ait',
    anlamlar: ['Eln’in imzası; her mesajın sonuna konan küçük güneş.', 'Arda’nın kalp ritmini değiştirmeye yeten en kısa mesaj.'],
    ornek: 'Günaydın ☺️',
    bkz: 'gülümseme (ama daha tatlısı)',
  },
  {
    kelime: 'öptüm',
    okunus: 'öp·tüm',
    tur: 'ünl.',
    anlamlar: ['Telefon kapanmadan önce söylenen son kelime.', 'Bizde “hoşça kal” yoktur; “öptüm” vardır.'],
    ornek: '— Hadi, kapatıyorum. — Tamam. — Öptüm. — Öptüm.',
  },
  {
    kelime: 'posi ~ mosi',
    tur: 'is.',
    anlamlar: ['Arda. Kökeni belirsiz, anlamı kesin: çok sevilen kişi.', 'Söyleyen Eln ise telefonun öbür ucunda biri gülümser.'],
    bkz: 'aşkişim, şirinim, kuzum',
  },
  {
    kelime: 'Elnos',
    tur: 'öz. is.',
    anlamlar: ['Elnare’nin en sevilen hâli.', 'Yalnızca Arda’nın kullanım hakkı olan ad. İzinsiz kullanılamaz.'],
    bkz: 'aşkım, aşkito',
  },
  {
    kelime: 'aşkito',
    okunus: 'aş·ki·to',
    tur: 'is.',
    anlamlar: ['“Aşkım”ın tatile çıkmış, güneş gözlüğü takmış hâli.'],
  },
  {
    kelime: 'Nehir',
    tur: 'öz. is.',
    anlamlar: ['Akarsu.', 'Bir “gruba ekle” tuşuna basarak iki şehri birbirine bağlayan kişi.'],
    bkz: 'teşekkür',
  },
  {
    kelime: 'bir saat',
    tur: 'is.',
    anlamlar: ['Bakü ile İstanbul arasındaki fark.', 'Arda’nın her gün geriden geldiği ama hiç geride kalmadığı süre.'],
  },
  {
    kelime: 'darıxmaq',
    okunus: 'da·rıh·mak',
    tur: 'Az., f.',
    anlamlar: ['Özlemek; ama göğüs sıkışarak.'],
    ornek: '— Darıxmışam. — Ben de.',
  },
  {
    kelime: '18:32',
    tur: 'saat',
    anlamlar: ['21 Mayıs 2026’da “biz” olduğumuz dakika.', 'Aynı an, iki ayrı saat: İstanbul’da 18:32, Bakü’de 19:32.'],
    bkz: 'bir saat',
  },
  {
    kelime: '21',
    tur: 'sayı',
    anlamlar: ['Ayın en güzel günü.', '21:05: Günün en güzel dakikası.'],
  },
  {
    kelime: 'zambak',
    tur: 'is., bot.',
    anlamlar: ['Eln’in çiçeği. Pembe olanı tercih edilir.', 'Sabırlı çiçek: tomurcuk uzun bekler, bir sabah birden açar.'],
  },
  {
    kelime: 'sesli arama',
    tur: 'is.',
    anlamlar: ['İki kişinin utançtan ne diyeceğini bilemediği ama kapatmak da istemediği süre.'],
    bkz: 'öptüm',
  },
  {
    kelime: 'ürəyim',
    okunus: 'ü·re·yim',
    tur: 'Az. is., sevgi sözü',
    anlamlar: [
      'Kalbim. Arda’nın Azerbaycanca öğrendiği ilk güzel kelimelerden; yazımı hâlâ “üreyim”.',
      'Söylenince karşı tarafı olduğu yerde eriten kelime.',
    ],
    ornek: 'Üreyim ❤️',
    bkz: 'əzizim',
  },
  {
    kelime: 'əzizim',
    okunus: 'e·zi·zim',
    tur: 'Az. is., sevgi sözü',
    anlamlar: ['Canım, kıymetlim. Arda yazınca sonuna mutlaka bir 💕 eklenir.'],
    bkz: 'ürəyim',
  },
  {
    kelime: 'yıldızlamak',
    okunus: 'yıl·dız·la·mak',
    tur: 'f.',
    anlamlar: [
      'Bir mesajı saklamaya değer bulmak. Eln’in en sevdiği işlerden biri.',
      'Yapılamadığında “keşke yıldızlayabilsem” diye hayıflanılan eylem.',
    ],
  },
  {
    kelime: 'uzak mesafe',
    tur: 'is.',
    anlamlar: ['Geçici bir durum. Emekliye ayrılması planlanmaktadır.'],
    bkz: 'yakında, tezliklə',
  },
]
