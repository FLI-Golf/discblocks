import { defineConfig } from 'vite';
import path from 'path';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
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
