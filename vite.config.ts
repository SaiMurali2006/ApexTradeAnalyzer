import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Local-first SPA. Relative base so the build can be opened from file:// or any subpath.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // 5173 is reserved by Windows on this machine (EACCES on ::1) — use 8080.
  // strictPort:false lets Vite fall back if 8080 is busy too.
  server: { port: 8080, strictPort: false, open: true },
});
