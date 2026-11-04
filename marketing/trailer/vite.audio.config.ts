import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// Builds marketing/trailer/audio-entry.ts into one IIFE (window.MomoAudio).
export default defineConfig({
  publicDir: false,
  resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
  build: {
    outDir: fileURLToPath(new URL('./build', import.meta.url)),
    emptyOutDir: true,
    target: 'es2020',
    lib: {
      entry: fileURLToPath(new URL('./audio-entry.ts', import.meta.url)),
      name: 'MomoAudioBundle',
      formats: ['iife'],
      fileName: () => 'momo-audio.js',
    },
  },
});
