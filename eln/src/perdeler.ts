/* ───────────────────────────────────────────────────────────────────────────
   PERDELER — site bir film gibi altı perdeye ayrılır. Her perde, "ilk" bölümünün
   hemen önünde tam ekran bir geçiş kartıyla başlar; menü de perdelere göre dizilir.
   Bir bölüm, kendinden önceki son perdeye aittir (sıra main.ts'teki sıradır).
   ─────────────────────────────────────────────────────────────────────────── */

export interface Perde {
  no: string
  ad: string
  soz: string
  /** perdenin ilk bölümünün id'si (kart onun önüne konur) */
  ilk: string
}

export const PERDELER: Perde[] = [
  { no: 'I', ad: 'Tanışma', soz: 'Bir bildirim sesiyle başladı. Kimse duymadı; ben duydum.', ilk: 'cizgi' },
  { no: 'II', ad: 'Biz', soz: '21 Mayıs, 18:32. O dakikadan beri saatler başka türlü işliyor.', ilk: 'gunler' },
  { no: 'III', ad: 'İki Şehir', soz: 'Aynı kökten iki dal. Aynı çay, aynı ay, iki ayrı pencere.', ilk: 'kuleler' },
  { no: 'IV', ad: 'Aradaki Yol', soz: 'Aramızda 1.758 kilometre var. Hepsini tek tek sevdim; hepsi sana çıkıyor.', ilk: 'ruzgar' },
  { no: 'V', ad: 'Bir Gün', soz: 'Henüz yaşamadığımız her şey burada. Sırasını bekliyor.', ilk: 'ucus' },
  { no: 'VI', ad: 'Kalp', soz: 'Buraya kadar geldiysen, gerisini kalbin biliyor.', ilk: 'sarki' },
]

/**
 * Bu sürümle gelen bölümler: Eln daha önce siteye geldiyse menüde "yeni" diye işaretlenir,
 * görünce işaret kalkar. Yeni bölüm eklerken id'sini buraya yaz.
 */
export const YENI_BOLUMLER = ['sebepler', 'kavanoz', 'parmak', 'evimiz', 'yildizimiz', 'hangimiz', 'gezi']
