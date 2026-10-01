import { defineConfig } from 'vite';
import path from 'path';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [wasm()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d'],
  },
  build: {
    sourcemap: true,
    target: 'esnext',
  },
});
