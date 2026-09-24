/* ───────────────────────────────────────────────────────────────────────────
   İÇERİK — Sitedeki bütün kişisel bilgiler burada.
   Arda, bir şeyi değiştirmek istersen sadece bu dosyayı (ve istersen
   notlar.ts dosyasını) düzenlemen yeterli. Kod bilgisine gerek yok:
   tırnak içindeki yazıları değiştir, kaydet, bitti.
   ─────────────────────────────────────────────────────────────────────────── */

export interface Kisi {
  ad: string
  tamAd?: string
  sehir: string // Türkçe yazılışı
  yerelSehir: string // kendi dilindeki yazılışı
  enlem: number
  boylam: number
  saatDilimi: string
}

export interface Ani {
  tarih: string // 'YYYY-AA-GG'
  baslik: string
}

export const ICERIK = {
  ben: {
    ad: 'Arda',
    sehir: 'İstanbul',
    yerelSehir: 'İstanbul',
    enlem: 41.0082,
    boylam: 28.9784,
    saatDilimi: 'Europe/Istanbul',
  } satisfies Kisi,

  sen: {
    ad: 'Eln',
    tamAd: 'Elnare',
    sehir: 'Bakü',
    yerelSehir: 'Bakı',
    enlem: 40.4093,
    boylam: 49.8671,
    saatDilimi: 'Asia/Baku',
  } satisfies Kisi,

  /** Ona seslendiğim adlar — sitede ara sıra, her seferinde başka biri çıkar */
  hitaplar: ['aşkım', 'aşkito', 'Elnos'],

  /** Bizi tanıştıran arkadaş (adı "nehir" demek — sitede bu da bir metafor) */
  arkadas: 'Nehir',

  /** Tanıştığımız gün (Nehir'in beni gruba eklediği gün) */
  tanisma: '2025-12-06',

  /** Sevgili olduğumuz gün */
  sevgili: '2026-05-21',

  /**
   * İlk buluşmanın tarihi belli olursa buraya yaz: '2026-12-20T14:30'
   * (Bakü saatiyle). Yazarsan uçuş panosunda canlı geri sayım başlar.
   */
  ilkBulusma: null as string | null,

  /** Doğum günleri: 'AA-GG' biçiminde, ör. '03-14'. O gün sitede kutlama olur. */
  dogumGunu: {
    sen: '04-23' as string | null,
    ben: '11-07' as string | null,
  },

  /** Eln'in doğum yılı: pastadaki mum sayısı yaşı kadar olur */
  dogumYili: 2008 as number | null,

  /** Kapı: siteyi ilk açışta sorulan tarih (gün / ay). */
  kapi: { aktif: true, gun: 6, ay: 12 },

  /**
   * Günlerimiz bahçesinde özel olarak işaretlenecek anılar.
   * Örnek: { tarih: '2026-01-02', baslik: 'İlk sesli arama' }
   */
  anilar: [] as Ani[],

  /**
   * Bizim şarkımız (isteğe bağlı).
   * dosya: public/ klasörüne koyduğun mp3'ün adı, ör. 'sarkimiz.mp3'
   *        (boşsa site kendi ürettiği sakin müziği çalar)
   * spotify / youtube: dinleme bağlantıları ("Şarkımız" bölümünde ve menüde görünür)
   */
  sarki: {
    baslik: 'Anılar',
    sanatci: 'Onur Can Özcan',
    dosya: '',
    spotify: 'https://open.spotify.com/search/Onur%20Can%20%C3%96zcan%20An%C4%B1lar',
    youtube: 'https://www.youtube.com/results?search_query=Onur+Can+%C3%96zcan+An%C4%B1lar',
  },

  /**
   * Ekran görüntülerimiz (isteğe bağlı): görüntülü aramalardan kareler.
   * Fotoğrafları public/foto/ klasörüne koy, buraya ekle:
   * { dosya: 'foto/1.jpg', not: 'İlk görüntülü aramamız' }
   * Liste boşsa bu bölüm sitede hiç görünmez.
   */
  fotograflar: [] as { dosya: string; not?: string }[],

  /**
   * Sesli mesaj (isteğe bağlı): Birbirinizi en çok sesinizden tanıyorsunuz.
   * Telefonla 30–60 saniyelik bir ses kaydı al (mektubu sesli okuyabilir ya da
   * sadece bir şey söyleyebilirsin), public/ klasörüne koy ve adını buraya yaz,
   * ör. 'sesim.m4a' ya da 'sesim.mp3'. Mektubun altında sesli mesaj olarak çıkar.
   */
  sesMesaji: '',

  /**
   * Rüzgâr Postası ve Kalp Atışı — ntfy.sh üzerinden çalışır (ücretsiz, hesap gerekmez).
   *  ntfyKonu: gizli, tahmin edilemez bir konu adı. Telefonuna "ntfy" uygulamasını kurup
   *            BU konuya abone olursan, Eln'in rüzgâra bıraktığı mesajlar bildirim olarak düşer.
   *            Aynı konu, ikiniz aynı anda sitedeyken "kalp gönder" özelliğini de çalıştırır.
   *            (Siteyi kendi telefonunda adresin sonuna ?ben=arda ekleyerek bir kez aç.)
   *  whatsapp: numaran, ülke koduyla ve boşluksuz (ör. '905xxxxxxxxx') — isteğe bağlı yedek
   */
  ruzgarPostasi: {
    ntfyKonu: 'osd-pgjpbbe5unvq33p0o1',
    whatsapp: '',
  },

  /** Sitenin sonundaki mektup. Her eleman bir paragraf. */
  mektup: [
    'Eln,',
    'Bu siteyi yaparken hep aynı soruyu düşündüm: İnsan, hiç dokunamadığı birine olan sevgisini nasıl gösterir?',
    'Sonra fark ettim ki sana aslında her gün dokunuyorum. Bakü’den kalkan güneş bana ulaştığında. Aynı aya baktığımızda. Telefonum titreyip ekranda adını gördüğümde. Sesin, 1.758 kilometreyi bir anda geçip kalbime vardığında.',
    '6 Aralık’ta bir gruba eklendim. 21 Mayıs’ta hayatına eklendim. İkisinin arasında bir yerde sen; en sevdiğim alışkanlığım, en güvendiğim sesim, en uzun bakmak istediğim yüz oldun.',
    'İnsanlar uzak mesafeyi bir eksiklik sanıyor. Bana öyle gelmiyor. Bizim her “günaydın”ımız bir karar, her “iyi geceler”imiz bir söz. Bizi yakın tutan şey şans değil; her gün, yeniden, birbirimizi seçmemiz.',
    'Ellerini henüz hiç tutmadım. Ama biliyorum: ilk tuttuğumda, sanki hep tutuyormuşum gibi gelecek.',
    'Senden bir saat gerideyim; ama hep yanındayım.',
    'Səni sevirəm. Çox. Həmişə.',
  ],

  /** Birlikte yapacaklarımız listesi (Eln işaretleyebilir, cihazında saklanır). */
  birlikteListesi: [
    'Aynı saat diliminde, yüz yüze “günaydın” demek',
    'Havalimanında koşarak sarılmak (film sahnesi gibi, utanmadan)',
    'Bakü Bulvarı’nda Hazar’a karşı yürümek',
    'Vapurda çay içip martılara simit atmak',
    'Qız Qalası’nı ve Kız Kulesi’ni ikimiz birlikte görmek',
    'İçərişəhər’in dar sokaklarında kaybolmak',
    'Galata’dan gün batımını izlemek',
    'Yanar Dağ’da ateşin karşısında oturmak',
    'Aynı masada: sen armudu stəkanla, ben ince belli bardakla',
    'Birlikte ilk fotoğrafımız (ekran görüntüsü değil!)',
    'Aynı filmi, aynı koltukta izlemek',
    '“Uzak mesafe” kelimesini emekliye ayırmak',
  ],
}
