import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig(({mode}) => ({
  plugins: [svelte()],
  build: {
    sourcemap: mode == 'development',
  },
  server: {
    host: '127.0.0.1',
    strictPort: true,
    port: 5173,
  },
  preview: {
    host: '127.0.0.1',
    strictPort: true,
    port: 4173,
  },
}));
