import { defineConfig } from 'vite'

// base './' → site herhangi bir alt klasörde (GitHub Pages, Netlify…) sorunsuz çalışır
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
})
