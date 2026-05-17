import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

/**
 * Chrome Extension Build Config
 *
 * BUILD_TARGET env variable ile hangi build'i aldığımızı belirleriz:
 *
 * 1. BUILD_TARGET yok → Popup build (normal HTML entry, code splitting OK)
 * 2. BUILD_TARGET=content → Content script build (IIFE, TEK dosya)
 *
 * Neden iki ayrı build?
 * - Popup: Chrome'da kendi HTML sayfasında çalışır, normal web app gibi.
 *   Code splitting sorun değil, <script type="module"> desteklenir.
 *
 * - Content script: Web sayfasına enjekte edilir, Chrome bunu <script> tag
 *   olarak yükler. ES module import DESTEKLENMEZ. Yani React, Socket.IO
 *   ve tüm bağımlılıklar TEK bir dosyaya gömülmeli = IIFE format.
 */

const isContentBuild = process.env.BUILD_TARGET === 'content';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: isContentBuild
    ? {
        // ═══ CONTENT SCRIPT BUILD ═══
        // IIFE: Immediately Invoked Function Expression
        // Tüm kodu tek bir fonksiyonun içine sarar, global scope kirletmez
        outDir: 'dist',
        emptyOutDir: false, // Popup build'i silme!
        rollupOptions: {
          input: resolve(__dirname, 'src/content/index.jsx'),
          output: {
            format: 'iife',               // Tek dosya, import yok
            entryFileNames: 'content.js',  // Sabit isim (hash yok)
            inlineDynamicImports: true,    // Tüm dynamic import'ları inline et
          },
        },
      }
    : {
        // ═══ POPUP BUILD ═══
        // Normal web app build: HTML entry, code splitting OK
        outDir: 'dist',
        emptyOutDir: true, // Önce temizle (ilk build bu olacak)
        rollupOptions: {
          input: {
            popup: resolve(__dirname, 'src/popup/popup.html'),
          },
          output: {
            entryFileNames: 'assets/[name].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]',
          },
        },
      },
})
