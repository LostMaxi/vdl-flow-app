import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',      // 新版本自動更新 Service Worker
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'VDL-FLOW — AI 動畫導演工作站',
        short_name: 'VDL-FLOW',
        description: 'AI 動畫導演的提示詞編排及視覺辨識工作站',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // 離線快取策略
        runtimeCaching: [
          {
            // Pollinations.ai 圖片 — 網路優先，失敗時快取
            urlPattern: /^https:\/\/image\.pollinations\.ai\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'pollinations-cache', expiration: { maxEntries: 50, maxAgeSeconds: 86400 } },
          },
          {
            // Transformers.js 模型 — 快取優先（模型不會變動）
            urlPattern: /^https:\/\/cdn-lfs\.huggingface\.co\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'hf-model-cache', expiration: { maxEntries: 20, maxAgeSeconds: 2592000 } },
          },
        ],
      },
    }),
  ],
  clearScreen: false,          // Tauri: 保留 Rust 編譯輸出
  server: {
    port: 3000,
    open: true,
    strictPort: true,          // Tauri: 端口固定，不自動換
  },
  envPrefix: ['VITE_', 'TAURI_'],  // Tauri 環境變數前綴
  build: {
    target: ['es2022', 'chrome100', 'safari15'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
