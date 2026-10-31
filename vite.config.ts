import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Social crawlers need an absolute og:image. On Vercel the production host is
// exposed at build time; elsewhere the relative path stays.
const site = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'absolute-og-image',
      transformIndexHtml: (html) => (site ? html.replace(/content="\.\/social\.png"/g, `content="${site}/social.png"`) : html),
    },
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // NO_HMR=1 disables live reload (used for the shared screenshot server).
  server: process.env.NO_HMR ? { host: true, port: 5173, hmr: false } : { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'] } },
    },
  },
});
