import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// Local-first SPA. Relative base so the build can be opened from file:// or any subpath.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    // Installable + offline. Workbox precaches the built assets; the app already
    // keeps all data in IndexedDB, so once installed it runs with zero network
    // (the only online call is the optional daily EUR/USD rate fetch).
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'ApexTradeAnalyzer',
        short_name: 'Apex',
        description: 'Local-first trade journal & analytics — PnL calendar, equity curve, 70+ charts.',
        theme_color: '#7c73ff',
        background_color: '#0a0b10',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // echarts is an unavoidably large vendor; we already code-split it into its own
    // async chunk (loaded only when a chart view is opened), so the entry stays tiny.
    // Isolate it as a named chunk for long-term caching and lift the size warning to
    // match — the warning's own advice (dynamic import) is already satisfied.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) return 'echarts';
        },
      },
    },
  },
  // 5173 is reserved by Windows on this machine (EACCES on ::1) — use 8080.
  // strictPort:false lets Vite fall back if 8080 is busy too.
  server: { port: 8080, strictPort: false, open: true },
});
