import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localApiPlugin } from './plugins/vite-plugin-local-api';

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  build: {
    sourcemap: true,
    minify: false
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'https://doushu.us.kg',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
