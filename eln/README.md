# Önce Sana Doğar ☀︎ — Eln için

> _“Her sabah güneş önce Bakü’ye doğar. Önce senin pencerene dokunur; 1 saat 24 dakika sonra beni bulur.
> Yani beni her sabah uyandıran ışık, seni çoktan öpmüş oluyor.”_

İstanbul’daki Arda’dan Bakü’deki Eln’e, uzak mesafe bir aşk için yapılmış **canlı** bir site.
Canlı çünkü **gerçek zamana bağlı**: güneşin ve ayın iki şehirdeki gerçek konumunu hesaplar,
her gün yeni bir not getirir, belli gün ve saatlerde açılan sırlar saklar. Her açılışta biraz farklıdır.

---

## Konsept: bu siteyi özel yapan gerçekler

Site, ikinizin hikâyesindeki **gerçek ve şaşırtıcı tesadüfler** üzerine kurulu:

| Gerçek | Sitedeki karşılığı |
|---|---|
| Bakü, İstanbul’un ~21° doğusunda → güneş Bakü’de **~1 sa 24 dk önce** doğar | Açılış: dünya küresinde gün doğumu önce Eln’in ışığına, sonra Arda’nınkine dokunur (her gün gerçek saatlerle hesaplanır) |
| İstanbul **41,0° K**, Bakü **40,4° K** — neredeyse aynı enlem | “Aynı Çizgi”: dünyayı saran ışıktan bir kurdele, iki kapıdan da geçer |
| Aradaki mesafe **1.758 km**; ışık bunu **5,9 ms**’de geçer; Bakü **1 saat ileride** | Veri şiirleri: “Yarın her gece önce sana geliyor” |
| Tanıştıran arkadaşın adı **Nehir** — ve Hazar’ı Boğaz’a gerçekten nehirler bağlar (Volga → Don → Karadeniz) | Hazar’dan Boğaz’a akan bir ışık nehri + “Nehir, Arda’yı gruba ekledi.” anı |
| İki şehirde de bir **Kız Kulesi** var: İstanbul’da Kız Kulesi (Avrupalıların “Leandros’un Kulesi”), Bakü’de Qız Qalası | 3D gece sahnesi: iki kule aynı suyun iki kıyısında; “Lambayı yak” ile aralarına ışık köprüsü |
| **21 Mayıs = Dünya Çay Günü**; iki ülke de çay ülkesi, bardaklar bile benzer (ince belli / armudu) | 3D çay sahnesi: önce Eln’in armudu bardağı, sonra Arda’nın ince bellisi dolar; buharlar kalp çizer |
| Türkçe ve Azərbaycan dili aynı kökten | “İki Dil, Tek Kalp”: özledim ↔ darıxmışam, güzelim ↔ gözəlim… |
| Bakü “rüzgârlar şehri” (Xəzri, Gilavar) | “Rüzgâr Postası”: her gün yeni bir not; Eln’in yazdıkları “rüzgârla” Arda’ya gider |

## Bölümler

1. **Önce Sana Doğar** — 3D dünya küresi, gerçek güneş konumuyla gün doğumu
2. **Aynı Çizgi** — enlem kurdelesi, mesafe/ışık/saat farkı, “sana yürüyorum” (her ziyaret günü +21 km)
3. **Bir Nehir** — 6 Aralık, grup bildirimi, Hazar’dan Boğaz’a ışık nehri
4. **Günlerimiz** — tanıştığınızdan beri her gün bir tohum (ayçiçeği dizilimi), canlı sayaçlar, yaklaşan güzel günler
5. **İki Kule** — Kız Kulesi & Qız Qalası, Leandros efsanesi, mahya ve Alev Kuleleri
6. **Çay Günü** — 21 Mayıs, dolan bardaklar, kalp çizen buhar
7. **İki Dil** — dönen kartlar
8. **Şu An** — iki şehrin gökyüzü, gerçek güneş ve ay konumuyla (bu gecenin ay evresi dahil)
9. **Rüzgâr Postası** — günün notu (zarf), toplanan notlar, rüzgâra mesaj
10. **İlk Buluşma** — havalimanı kalkış panosu (split-flap), birlikte yapılacaklar listesi
11. **Mektup** — el yazısıyla mektup
12. **Kalbim** — kalbe basılı tut: yıldızlar önce “Səni sevirəm” yazar, sonra kalp olur

## Her gelişte farklı olan şeyler

- Gökyüzü, ay evresi, gün doğumu saatleri → **gerçek zamanlı**
- **Günün notu** (100+ not; ayın 21’i, ayın 6’sı, Novruz, 8 Mart, 14 Şubat, yıl dönümleri ve doğum günlerinde özel notlar)
- Topladığı notlar birikir, “sana yürüyorum” çubuğu ilerler, bahçeye her gün bir tohum eklenir
- Ses de her seferinde farklı: müzik tarayıcıda anlık üretilir, aynı melodi iki kez çalmaz
- Mevsime göre süzülen parçacıklar (kar, çiçek, ateş böceği, yaprak) ve arada bir kayan yıldız
- **16 sır** (sağ üstteki ✦). Bazıları dokunarak, bazıları sadece belli bir anda bulunur:
  aya 3 kez dokunmak, saat **21:05**’te bakmak, gece yarısından sonra gelmek, ayın 21’inde/6’sında gelmek,
  dolunayda gelmek, iki bardağı art arda çınlatmak, bardağına iki şeker atmak, rüzgâra boş mektup bırakmak,
  kayan yıldızı yakalamak, 10 farklı gün gelmek… (Eln’e söyleme 🙂)

---

## Çalıştırma

```bash
cd eln
npm install
npm run dev      # http://localhost:5173 — telefondan aynı ağda IP ile açılabilir
npm run build    # yayına hazır dosyalar: eln/dist/
```

Node.js 20.19+ gerekir.

**Özel günleri önceden görmek için:** adresin sonuna `?tarih=` ekle, site o gündeymiş gibi davranır
(bu önizleme hiçbir kaydı değiştirmez):

- `?tarih=2026-10-21` → ayın 21’i (ay dönümü kutlaması, özel not)
- `?tarih=2026-12-06` → tanışmanın 1. yılı
- `?tarih=2027-05-21T21:05` → 1. yıl dönümü, saat 21:05’te “bizim dakikamız”
- `?kapi=0` → geliştirirken giriş kapısını atla

## Kişiselleştirme (kod bilgisi gerekmez)

Her şey iki dosyada:

- **`src/icerik.ts`** — isimler, tarihler, şehirler, kapı tarihi, mektup, birlikte listesi, doğum günleri,
  ilk buluşma tarihi (yazılırsa panoda canlı geri sayım başlar), şarkı, anılar
- **`src/notlar.ts`** — günlük notlar ve özel gün notları (istediğin kadar ekleyebilirsin)

İpuçları:
- `dogumGunu.sen: '03-14'` gibi yazarsan o gün site kalplerle açılır ve özel not gelir.
- `anilar` listesine `{ tarih: '2026-01-02', baslik: 'İlk sesli arama' }` gibi satırlar eklersen
  “Günlerimiz” bahçesinde o gün işaretlenir.
- Kendi şarkınızı eklemek için mp3’ü `public/` klasörüne koy, `sarki.dosya`’ya adını yaz.

### Rüzgâr Postası: Eln’in mesajı telefonuna düşsün

1. Telefonuna **ntfy** uygulamasını kur (iOS/Android, ücretsiz).
2. Uygulamada tahmin edilemez, uzun bir konuya abone ol, ör. `arda-eln-ruzgar-7k2p9q`.
3. `src/icerik.ts` → `ruzgarPostasi.ntfyKonu` alanına aynı adı yaz.

Artık Eln “Rüzgâra bırak” dediğinde mesaj anında telefonuna bildirim olarak gelir.
(Boş bırakırsan telefonunun paylaş menüsü açılır; `whatsapp` alanına numaranı yazarsan WhatsApp’a gider.)

## Yayınlama (Eln’e link göndermek için)

**Seçenek A — GitHub Pages (otomatik):**
Repo ayarlarında **Settings → Pages → Source: GitHub Actions** seç. Bu değişiklik `main`’e girince
`.github/workflows/eln-pages.yml` siteyi derleyip yayınlar. Adres: `https://<kullanıcı-adı>.github.io/<repo>/`
(Özel/private repolarda Pages için ücretli GitHub planı gerekir.)

**Seçenek B — Netlify Drop (en kolay):**
`npm run build` → https://app.netlify.com/drop adresine `eln/dist` klasörünü sürükle-bırak. Link hazır.

Site arama motorlarına kapalıdır (`noindex`) ve ilk açılışta “her şeyin başladığı günü” sorar.

**Link önizlemesi:** Linki WhatsApp/Instagram’dan gönderdiğinde küreli bir kapak görseli (`public/og.jpg`) görünür.
GitHub Pages bunu otomatik ayarlar; Netlify vb. kullanırsan `eln/.env` içindeki `VITE_SITE_ADRESI`’ne
sitenin tam adresini yaz (ör. `https://eln-icin.netlify.app`) ve yeniden derle.

**Telefonda uygulama gibi:** Eln siteyi açıp Safari’de *Paylaş → Ana Ekrana Ekle* derse
ana ekranında kendi ikonuyla (doğan güneş ve kalp) bir uygulama gibi durur.

## Teknik

- **Three.js** — dünya küresi (Natural Earth verisinden üretilmiş ~60 bin nokta), kuleler, çay bardakları,
  yıldızlar. Tüm 3D modeller kodla (prosedürel) üretildi; Blender dosyası indirmeye gerek kalmadığı için
  telefonda hızlı açılır. Tek bir WebGL tuvali tüm sahneler arasında paylaşılır.
- **GSAP** (ScrollTrigger, SplitText) + **Lenis** — kaydırmaya bağlı sinematik anlatım
- **SunCalc** — gerçek güneş/ay konumu, doğuş/batış saatleri, ay evresi
- **Web Audio** — ses dosyası yok; pad akorları, müzik kutusu notaları, dalga ve rüzgâr anlık üretilir
- Yazı tipleri: Cormorant Garamond, Plus Jakarta Sans, Caveat, Great Vibes, JetBrains Mono
  (hepsi Azərbaycan harfleri **ə, Ə** dahil kontrol edildi)
- Hareket azaltma tercihi, klavye erişimi ve WebGL olmayan cihazlar için sade görünüm desteklenir.

Kara haritasını yeniden üretmek için: `npm run kara`
