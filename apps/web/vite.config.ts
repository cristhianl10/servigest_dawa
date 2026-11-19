import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const sharedSource = decodeURIComponent(
  new URL('../../packages/shared/src/index.ts', import.meta.url).pathname
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@servigest/shared': sharedSource,
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
