import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { fileURLToPath } from 'url';

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
  resolve: {
  alias: {
    $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
    $components: fileURLToPath(new URL('./src/components', import.meta.url)),
    $types: fileURLToPath(new URL('./src/types', import.meta.url)),
  },
},
}));
