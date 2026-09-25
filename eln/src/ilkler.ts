/* ───────────────────────────────────────────────────────────────────────────
   İLKLERİMİZ DEFTERİ — yaşadığımız ve henüz yaşamadığımız ilkler.
   · tarih/not doluysa sayfada basılı durur.
   · boşsa Eln sitede kendisi yazabilir (hatırladığı gibi); yazdığı anda
     Arda'nın telefonuna düşer. Beğenirsen buraya kalıcı olarak ekle.
   · gelecek: true olanlar "henüz değil" diye bekler; yaşandığı gün doldurulur.
   Tarih biçimi: 'YYYY-AA-GG'
   ─────────────────────────────────────────────────────────────────────────── */
import { ICERIK } from './icerik'

export interface Ilk {
  id: string
  ad: string
  simge: string
  tarih?: string
  not?: string
  gelecek?: boolean
}

export const ILKLER: Ilk[] = [
  { id: 'grup', ad: 'Aynı gruptaydık', simge: '👥', tarih: ICERIK.tanisma, not: `${ICERIK.arkadas} bir tuşa bastı. Her şey orada başladı.` },
  { id: 'mesaj', ad: 'İlk mesaj', simge: '💬' },
  { id: 'gulucuk', ad: 'İlk ☺️', simge: '☺️' },
  { id: 'sesli', ad: 'İlk sesli arama', simge: '📞' },
  { id: 'optum', ad: 'İlk “öptüm”', simge: '💋' },
  { id: 'seviyorum', ad: 'İlk “seni seviyorum”', simge: '♥' },
  { id: 'biz', ad: '“Biz” olduk', simge: '✦', tarih: ICERIK.sevgili, not: `${ICERIK.sevgiliSaat}. Güneş Bakü’de batıyordu, İstanbul’da hâlâ yüksekteydi.` },
  { id: 'bokkus', ad: 'İlk “bokkuş”', simge: '🐦' },
  { id: 'goruntulu', ad: 'İlk görüntülü arama', simge: '🎥', gelecek: true },
  { id: 'bakis', ad: 'Yüz yüze ilk bakış', simge: '👀', gelecek: true },
  { id: 'sarilma', ad: 'İlk sarılma', simge: '🫂', gelecek: true },
  { id: 'el', ad: 'İlk kez el ele', simge: '🤝', gelecek: true },
  { id: 'cay', ad: 'Aynı masada ilk çay', simge: '🍵', gelecek: true },
  { id: 'foto', ad: 'Birlikte ilk fotoğraf', simge: '📸', gelecek: true },
  { id: 'gunaydin', ad: 'Yüz yüze ilk “günaydın”', simge: '🌅', gelecek: true },
]
