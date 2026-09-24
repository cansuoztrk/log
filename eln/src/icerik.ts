/* ───────────────────────────────────────────────────────────────────────────
   İÇERİK — Sitedeki bütün kişisel bilgiler burada.
   Arda, bir şeyi değiştirmek istersen sadece bu dosyayı (ve istersen
   notlar.ts dosyasını) düzenlemen yeterli. Kod bilgisine gerek yok:
   tırnak içindeki yazıları değiştir, kaydet, bitti.
   ─────────────────────────────────────────────────────────────────────────── */

export interface Kisi {
  ad: string
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
    sehir: 'Bakü',
    yerelSehir: 'Bakı',
    enlem: 40.4093,
    boylam: 49.8671,
    saatDilimi: 'Asia/Baku',
  } satisfies Kisi,

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
    sen: null as string | null,
    ben: null as string | null,
  },

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
   * baglanti: Spotify / YouTube linki (menüde "Şarkımız" olarak görünür)
   */
  sarki: {
    baslik: '',
    sanatci: '',
    dosya: '',
    baglanti: '',
  },

  /**
   * Rüzgâr Postası — Eln sitedeki kutuya bir şey yazıp "rüzgâra bırak"
   * dediğinde mesaj sana nasıl ulaşsın?
   *  ntfyKonu: ntfy.sh uygulamasında abone olacağın gizli, uzun bir konu adı
   *            (ör. 'arda-eln-ruzgar-8f3k2'). Doluysa mesaj anında telefonuna düşer.
   *  whatsapp: numaran, ülke koduyla ve boşluksuz (ör. '905xxxxxxxxx')
   *  Hiçbiri doluysa telefonun paylaş menüsü açılır.
   */
  ruzgarPostasi: {
    ntfyKonu: '',
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
