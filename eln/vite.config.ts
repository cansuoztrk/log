import { defineConfig } from 'vite'

// Link önizleme görseli (og:image) için sitenin tam adresi; verilmezse göreli yol kullanılır.
// GitHub Pages iş akışı bunu otomatik verir. Başka yerde: VITE_SITE_ADRESI=https://... npm run build
// Netlify derlemede sitenin adresini URL değişkeniyle verir.
process.env.VITE_SITE_ADRESI ||= process.env.URL || '.'

// base './' → site herhangi bir alt klasörde (GitHub Pages, Netlify…) sorunsuz çalışır
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
})
