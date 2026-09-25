/* ───────────────────────────────────────────────────────────────────────────
   ŞİFRELİ ALBÜM — Eln'in fotoğrafları ve yazışmalarımız depoda hiç açık durmaz.
   Hepsi ikimizin bildiği bir kelimeyle şifrelenip public/album/ içine yazılır;
   site kelimeyi bilen tarayıcıda çözer.

   Şifrele (kaynak klasörde album.json + içinde adı geçen .webp/.jpg dosyaları):
     ALBUM_KELIME='...' node scripts/album.mjs sifrele <kaynak-klasoru>
   Düzenlemek için geri çöz (album.json + resimler hedef klasöre açılır):
     ALBUM_KELIME='...' node scripts/album.mjs coz <hedef-klasoru>

   Kaynak klasörü DEPOYA KOYMA. Kelimeyi de hiçbir dosyaya yazma.
   Anahtar türetme src/cekirdek/album.ts ile birebir aynı olmalı.
   ─────────────────────────────────────────────────────────────────────────── */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, webcrypto } from 'node:crypto'

const { subtle } = webcrypto
const KOK = join(dirname(fileURLToPath(import.meta.url)), '..')
const HEDEF = join(KOK, 'public', 'album')
const TUZ = 'once-sana-dogar:album:v1'
const TUR = 300_000
const TURLER = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg' }

/** "Gülüm", "GULUM", "gülüm 🌹" → aynı anahtar (büyük/küçük harf, Türkçe harf, boşluk fark etmez) */
export const temizle = (k) =>
  k
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüə]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', ə: 'e' })[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')

async function anahtar(kelime) {
  const ham = await subtle.importKey('raw', new TextEncoder().encode(temizle(kelime)), 'PBKDF2', false, ['deriveKey'])
  return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(TUZ), iterations: TUR }, ham, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ])
}

/**
 * Başlangıç vektörü içerikten türetilir: aynı dosya her şifrelemede aynı çıkar (depo boşuna şişmez),
 * farklı içerik farklı vektör alır (aynı anahtarla aynı vektör hiç tekrar etmez).
 */
async function sifrele(a, veri) {
  const iv = new Uint8Array(createHash('sha256').update(`${TUZ}:iv`).update(veri).digest().subarray(0, 12))
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, a, veri))
  const son = new Uint8Array(12 + ct.length)
  son.set(iv)
  son.set(ct, 12)
  return son
}

async function coz(a, veri) {
  return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: veri.subarray(0, 12) }, a, veri.subarray(12)))
}

/** Dosya adı içeriği ele vermesin: id'den türetilen anlamsız bir ad */
const gizliAd = (id) => createHash('sha256').update(`${TUZ}:${id}`).digest('hex').slice(0, 16) + '.bin'

/** WebP/JPEG/PNG başlığından en-boy (tarayıcı yer ayırsın, sayfa zıplamasın) */
function olcu(b) {
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const tip = b.toString('ascii', 12, 16)
    if (tip === 'VP8 ') return { en: b.readUInt16LE(26) & 0x3fff, boy: b.readUInt16LE(28) & 0x3fff }
    if (tip === 'VP8L') {
      const n = b.readUInt32LE(21)
      return { en: (n & 0x3fff) + 1, boy: ((n >> 14) & 0x3fff) + 1 }
    }
    if (tip === 'VP8X') return { en: 1 + b.readUIntLE(24, 3), boy: 1 + b.readUIntLE(27, 3) }
  }
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return { en: b.readUInt32BE(16), boy: b.readUInt32BE(20) }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i < b.length) {
      const m = b[i + 1]
      const u = b.readUInt16BE(i + 2)
      if (m >= 0xc0 && m <= 0xc3) return { en: b.readUInt16BE(i + 7), boy: b.readUInt16BE(i + 5) }
      i += 2 + u
    }
  }
  return {}
}

const [, , komut, klasor] = process.argv
const kelime = process.env.ALBUM_KELIME
if (!kelime || !klasor || !['sifrele', 'coz'].includes(komut)) {
  console.error("Kullanım: ALBUM_KELIME='...' node scripts/album.mjs sifrele|coz <klasör>")
  process.exit(1)
}
const a = await anahtar(kelime)

if (komut === 'sifrele') {
  const icerik = JSON.parse(await readFile(join(klasor, 'album.json'), 'utf8'))
  const dosyalar = await readdir(klasor)
  const kayit = {}
  await rm(HEDEF, { recursive: true, force: true })
  await mkdir(HEDEF, { recursive: true })
  for (const d of dosyalar) {
    const uz = extname(d).toLowerCase()
    if (!TURLER[uz]) continue
    const id = d.slice(0, -uz.length)
    const veri = await readFile(join(klasor, d))
    const ad = gizliAd(id)
    await writeFile(join(HEDEF, ad), await sifrele(a, veri))
    kayit[id] = { dosya: ad, tur: TURLER[uz], ...olcu(veri) }
  }
  icerik.dosyalar = kayit
  await writeFile(join(HEDEF, 'icerik.bin'), await sifrele(a, new TextEncoder().encode(JSON.stringify(icerik))))
  console.log(`${Object.keys(kayit).length} dosya + icerik.bin → public/album/`)
} else {
  const icerik = JSON.parse(new TextDecoder().decode(await coz(a, await readFile(join(HEDEF, 'icerik.bin')))))
  await mkdir(klasor, { recursive: true })
  for (const [id, k] of Object.entries(icerik.dosyalar ?? {})) {
    const uz = Object.entries(TURLER).find(([, t]) => t === k.tur)?.[0] ?? '.bin'
    await writeFile(join(klasor, id + uz), await coz(a, await readFile(join(HEDEF, k.dosya))))
  }
  delete icerik.dosyalar
  await writeFile(join(klasor, 'album.json'), JSON.stringify(icerik, null, 2))
  console.log(`Çözüldü → ${klasor}`)
}
