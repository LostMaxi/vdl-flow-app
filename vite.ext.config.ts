// ◎ Chrome Extension 專用 Vite 建置設定
// 執行: npx vite build --config vite.ext.config.ts
// 輸出: dist-ext/ → 拖入 chrome://extensions 載入

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-ext',
    emptyOutDir: true,
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html') },
      output: {
        // Extension 不允許 inline script，所有 chunk 獨立檔案
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    target: 'chrome100',
    minify: 'esbuild',
  },
  // Extension 環境：不使用 dev server
  base: './',
});
