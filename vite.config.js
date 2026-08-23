import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'site-dist',
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 12_000,
    minify: false,
  },
});
