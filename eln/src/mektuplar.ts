/* ───────────────────────────────────────────────────────────────────────────
   "… OLDUĞUNDA AÇ" MEKTUPLARI
   Eln, ihtiyaç duyduğu anda açsın diye önceden yazılmış mektuplar.
   "tarih" verilen mektuplar o gün (Bakü saatiyle) gelene kadar kilitli kalır.
   Metinleri istediğin gibi değiştirebilir, yenilerini ekleyebilirsin.
   ─────────────────────────────────────────────────────────────────────────── */

export interface ZarfMektup {
  id: string
  baslik: string
  /** 'YYYY-AA-GG' — verilirse o güne kadar açılamaz */
  tarih?: string
  muhur: string // mühür rengi
  metin: string[]
}

export const MEKTUPLAR: ZarfMektup[] = [
  {
    id: 'ozledim',
    baslik: 'Beni özlediğinde aç',
    muhur: '#b3263d',
    metin: [
      'Özledin mi? Güzel. Çünkü ben de şu an seni özlüyorum; hem bunu yazdığım an, hem senin okuduğun an.',
      'Özlemek, aramızdaki mesafenin kalpteki izi. Onu silmeye çalışma; o iz bizim.',
      'Şimdi gözlerini kapat ve son mesajımı hatırla. Ya da o utangaç sesli aramalarımızın sonunu, ikimizin de alçak sesle “öptüm” dediği anı. İşte oradayım. Hep oradayım.',
      'Sonra telefonu al ve bana yaz. Özlediğini söylemek zayıflık değil; bizim dilimizde “darıxmışam” bir sevgi cümlesi. Öptüm.',
    ],
  },
  {
    id: 'kotu-gun',
    baslik: 'Kötü bir gün geçirdiğinde aç',
    muhur: '#6b3fa0',
    metin: [
      'Bugün bok gibi geçti, değil mi? ☺️ Tamam, bu kelimeyi bu sitede sadece burada kullanma hakkım var.',
      'Ciddi olarak: bazı günler ağır olur. O günlerde yanında olamadığım için kendime kızıyorum.',
      'Ama şunu bil: senin kötü günün, benim de kötü günüm. Yarısını bana ver. Taşımayı severim.',
      'Şimdi derin bir nefes al, su iç, kendine bir çay koy. Ve unutma: bu gün de geçecek. Ben geçmeyeceğim. Hep buradayım.',
    ],
  },
  {
    id: 'uyuyamadim',
    baslik: 'Uyuyamadığında aç',
    muhur: '#27407a',
    metin: [
      'Saat kaç orada? Geç, değil mi? Ben bir saat geride ya hâlâ uyanığım ya da rüyamda seni arıyorum.',
      'Uyuyamadığında şunu dene: yavaşça nefes al ve say. Bir: İstanbul. İki: Karadeniz. Üç: Kafkaslar. Dört: Hazar. Beş: sen.',
      'Her nefeste biraz daha yaklaşıyorum. Beşe vardığında ben de oradayım.',
      'Gözlerini kapat. Bu mektubun son kelimesinden sonra aklından geçen son şey ben olayım. Gecən xeyrə qalsın, gözəlim. Öptüm.',
    ],
  },
  {
    id: 'yalniz',
    baslik: 'Kendini yalnız hissettiğinde aç',
    muhur: '#1f6f6a',
    metin: [
      'Yalnız değilsin. 1.758 kilometre uzakta olmam, yanında olmadığım anlamına gelmiyor.',
      'Şu an, bunu okurken, dünyanın bir yerinde biri seni düşünüyor. O kişi benim.',
      'Bu sitedeki her satırı sen kendini yalnız hissetmeyesin diye yazdım. Etrafındaki sessizlik ne kadar büyük olursa olsun, sana olan sevgim ondan büyük.',
      'Bir mesaj at. Cevap vermem için bir saniye yeter.',
    ],
  },
  {
    id: 'gulmek',
    baslik: 'Gülmeye ihtiyacın olduğunda aç',
    muhur: '#d08a2a',
    metin: [
      'Dinle. İlk buluşmamızda seni gördüğüm an ya ağlayacağım ya da çok saçma bir şey söyleyeceğim. Muhtemelen ikisi birden.',
      'Havalimanındaki herkes bize bakacak. Biri “bunlar niye böyle” diyecek. Ben de “uzak mesafe, anlamazsınız” diyeceğim.',
      'Sonra sana sarılırken heyecandan ayağına basacağım. Özür dilerim, şimdiden.',
      'Gülümsedin mi? ☺️ Gülümsedin. Biliyorum.',
    ],
  },
  {
    id: 'kizgin',
    baslik: 'Bana kızdığında aç',
    muhur: '#8e1b1b',
    metin: [
      'Kızgınsın. Muhtemelen haklısın da. (Muhtemelen.)',
      'Bu mektubu o an için önceden yazdım, çünkü bilmeni istiyorum: kızsan da, küssen de seni sevmekten bir saniye bile vazgeçmiyorum.',
      'Uzakta olunca yanlış anlaşılmalar büyüyor; bir mesaj yanlış tonda okunuyor. O yüzden şöyle yapalım: derin bir nefes al, sonra bana yaz. (Ya da ara; utanmayı bir kereliğine boş ver.) Yarısı orada geçer, gerisini birlikte hallederiz.',
      'Özür dilerim. (Haklı olsam bile. ☺️)',
    ],
  },
  {
    id: 'suphe',
    baslik: 'Bizden şüphe ettiğinde aç',
    muhur: '#3d5a2a',
    metin: [
      'Bazen mesafe insana fısıldar: “Bu gerçekten olacak mı?” Ben de o fısıltıyı duyuyorum bazen.',
      'Sonra şunu hatırlıyorum: biz birbirimizi hiç görmeden seçtik. Bir yüze değil; kelimelere, bir ruha, bir kalbe âşık olduk. Çoğu insanın hiç yaşamadığı bir şey bu.',
      'Mesafe geçici: bir uçuş, üç saat. Bu his geçici değil.',
      'Şüphe ettiğin gün bu mektubu oku, sonra bana “biz” de. Ben de sana “biz” diyeceğim. Her seferinde.',
    ],
  },
  {
    id: 'bulusma',
    baslik: 'İlk buluşmamızdan önceki gece aç',
    muhur: '#c9415c',
    metin: [
      'Yarın. Bunu yazarken bile ellerim titriyor. Bu gece ikimiz de uyuyamayacağız, biliyorum.',
      'Bavulunu kontrol ettin mi? Pasaport, şarj aleti… Tamam, en önemlisi sensin; sen oradaysan gerisi önemli değil.',
      'Yarın bu sitedeki bütün satırlar gerçek olacak. Kalkış panosundaki “YAKINDA” yazısı “İNDİ”ye dönecek.',
      'Uyumaya çalış, gözəlim. Yarın saat farkımız sıfırlanıyor.',
    ],
  },
  {
    id: 'yil-tanisma',
    baslik: 'Tanışmamızın ilk yılında aç',
    tarih: '2026-12-06',
    muhur: '#86a8ff',
    metin: [
      'Bir yıl. Bir yıl önce bugün Nehir bir tuşa bastı ve benim hayatım değişti.',
      'O gün seni tanımıyordum. Şimdi seni neredeyse kendimden iyi tanıyorum.',
      'Bu bir yılda hiç aynı odada olmadık, hiç görüntülü bile konuşmadık. Ama kelimelerinle, ☺️’lerinle ve o utangaç “öptüm”lerle hayatımın en dolu yılını yaşadım.',
      'Nehir’e bir teşekkür borçluyuz. Sana da bir ömür.',
    ],
  },
  {
    id: 'dogumgunu-19',
    baslik: '19. yaş gününde aç',
    tarih: '2027-04-23',
    muhur: '#f59fb4',
    metin: [
      'İyi ki doğdun Elnare. On dokuz yaşındasın.',
      'Bu mektubu yazarken on sekizdin ve ben seni şimdiden bir yaş büyümüşsün gibi özlüyordum.',
      'Yeni yaşında dileğim şu: bol bol gül, bol bol ☺️ at, kendine iyi bak. Ve bu yaş bitmeden bir gün, mumlarını yanında üfle.',
      'Dünyaya geldiğin gün, benim için dünyanın en önemli günü. Ad günün mübarək, canım.',
    ],
  },
  {
    id: 'yildonumu-1',
    baslik: 'Birinci yıl dönümümüzde aç',
    tarih: '2027-05-21',
    muhur: '#f3c47c',
    metin: [
      'Bir yıl önce bugün “biz” olduk. Dünya Çay Günü’ydü, hatırlıyor musun?',
      'Bir yılda üç yüz altmış beş kez “günaydın”, üç yüz altmış beş kez “iyi geceler” dedik. Bazen çok daha fazla. Her birinde seni yeniden seçtim.',
      'Bunu açtığında belki hâlâ uzaktayız, belki değiliz. Nerede olursak olalım: bir yıl oldu ve seni ilk günkünden daha çok seviyorum.',
      'Bir sonraki yıl dönümünde aynı masada çay içelim. Söz mü?',
    ],
  },
]
